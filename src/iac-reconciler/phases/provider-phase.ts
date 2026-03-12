import { Inject, Service } from 'typedi';
import { EntityManager, In } from 'typeorm';

import { BaseResourcePhase } from '../../core/reconciler/base-resource-phase';
import { RefContext } from '../../core/reconciler/types';
import {
  StructuralValidator,
  SemanticValidator,
  RuntimeValidator,
  ValidationResult,
} from '../../core/reconciler/validation';
import { checkDuplicateExternalIds } from '../../core/reconciler/validation-helpers';

import { OidcProviderRepository } from '../../repositories/oidc-provider-repository';
import { OidcProviderManifest } from '../../schemas/iac-schemas';
import OidcProviderService from '../../services/oidc-provider-service';

type ProviderEntity = { id: number; externalId?: string | null } & Record<
  string,
  any
>;

const VALID_TYPES = ['google', 'keycloak', 'azuread', 'generic'] as const;

@Service()
export class ProviderPhase
  extends BaseResourcePhase<OidcProviderManifest, ProviderEntity>
  implements
    StructuralValidator<OidcProviderManifest>,
    SemanticValidator<OidcProviderManifest>,
    RuntimeValidator<OidcProviderManifest>
{
  readonly phaseId = 'provider';
  readonly dependsOn: string[] = [];

  constructor(
    @Inject() private readonly providerRepository: OidcProviderRepository,
    @Inject() private readonly providerService: OidcProviderService,
  ) {
    super();
  }

  extract(manifest: Record<string, unknown>): OidcProviderManifest[] {
    const auth = manifest.auth as { providers?: OidcProviderManifest[] };
    return auth?.providers ?? [];
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 1: STRUCTURAL
  // ═══════════════════════════════════════════════════════════════

  validateStructure(
    items: OidcProviderManifest[],
    result: ValidationResult,
  ): void {
    for (const [i, provider] of items.entries()) {
      const p = `auth.providers[${i}]`;

      if (!provider.name?.trim()) {
        result.error('provider', `${p}.name`, 'REQUIRED', 'name is required');
      }

      if (!provider.externalId?.trim()) {
        result.error(
          'provider',
          `${p}.externalId`,
          'REQUIRED',
          'externalId is required',
        );
      }

      if (!VALID_TYPES.includes(provider.type as any)) {
        result.error(
          'provider',
          `${p}.type`,
          'INVALID_TYPE',
          `Invalid type "${provider.type}". Must be: ${VALID_TYPES.join(', ')}`,
        );
      }

      // Google uses a well-known issuer, others require it
      if (provider.type !== 'google' && !provider.issuerUrl) {
        result.error(
          'provider',
          `${p}.issuerUrl`,
          'REQUIRED',
          `issuerUrl is required for ${provider.type} providers`,
        );
      }

      if (provider.issuerUrl) {
        try {
          new URL(provider.issuerUrl);
        } catch {
          result.error(
            'provider',
            `${p}.issuerUrl`,
            'INVALID_URL',
            `issuerUrl "${provider.issuerUrl}" is not a valid URL`,
          );
        }
      }

      if (!provider.clientId) {
        result.error(
          'provider',
          `${p}.clientId`,
          'REQUIRED',
          'clientId is required',
        );
      }

      if (!provider.clientSecret) {
        result.error(
          'provider',
          `${p}.clientSecret`,
          'REQUIRED',
          'clientSecret is required',
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 2: SEMANTIC
  // ═══════════════════════════════════════════════════════════════

  validateSemantics(
    items: OidcProviderManifest[],
    _manifest: Record<string, unknown>,
    result: ValidationResult,
  ): void {
    checkDuplicateExternalIds(items, 'provider', 'auth.providers', result);

    // Warn on duplicate issuerUrl + clientId (likely a copy-paste error)
    const seen = new Map<string, number>();
    for (const [i, provider] of items.entries()) {
      if (!provider.issuerUrl) continue;
      const key = `${provider.issuerUrl}|${provider.clientId}`;
      const prev = seen.get(key);

      if (prev !== undefined) {
        result.warn(
          'provider',
          `auth.providers[${i}]`,
          'DUPLICATE_PROVIDER_CONFIG',
          `Same issuerUrl + clientId as auth.providers[${prev}]`,
        );
      } else {
        seen.set(key, i);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 3: RUNTIME — OIDC discovery
  // ═══════════════════════════════════════════════════════════════

  async validateRuntime(
    items: OidcProviderManifest[],
    _refs: RefContext,
    _manager: EntityManager,
    result: ValidationResult,
  ): Promise<void> {
    const checks = items.map(async (provider, i) => {
      if (provider.type === 'google') {
        provider.issuerUrl = 'https://accounts.google.com';
        return;
      }

      const discovery = await this.providerService.checkOidcDiscovery(
        provider.issuerUrl,
      );

      if (!discovery.ok) {
        result.warn(
          'provider',
          `auth.providers[${i}].issuerUrl`,
          'OIDC_DISCOVERY_FAILED',
          discovery.error!,
        );
      }
    });

    await Promise.all(checks);
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  protected async findExisting(
    externalIds: string[],
    manager: EntityManager,
  ): Promise<ProviderEntity[]> {
    return this.providerRepository.findBy(
      { externalId: In(externalIds) },
      manager,
    );
  }

  protected async create(
    spec: OidcProviderManifest,
    _refs: RefContext,
    manager: EntityManager,
  ): Promise<ProviderEntity> {
    return this.providerService.createOidcProvider(
      this.toParams(spec),
      manager,
    );
  }

  protected async update(
    existing: ProviderEntity,
    spec: OidcProviderManifest,
    _refs: RefContext,
    manager: EntityManager,
  ): Promise<ProviderEntity> {
    return this.providerService.updateOidcProvider(
      existing.id,
      this.toParams(spec),
      manager,
    );
  }

  protected fingerprintFromSpec(spec: OidcProviderManifest): string {
    return this.fingerprint({
      name: spec.name,
      type: spec.type,
      issuerUrl: spec.issuerUrl ?? null,
      clientId: spec.clientId,
      scopes: spec.scopes ?? null,
      claimMappings: spec.claimMappings ?? {},
      extraParams: spec.extraParams ?? {},
      enabled: spec.enabled ?? true,
    });
  }

  protected fingerprintFromEntity(entity: ProviderEntity): string {
    return this.fingerprint({
      name: entity.name,
      type: entity.type,
      issuerUrl: entity.issuerUrl ?? null,
      clientId: entity.clientId,
      scopes: entity.scopes ?? null,
      claimMappings: entity.claimMappings ?? {},
      extraParams: entity.extraParams ?? {},
      enabled: entity.enabled ?? true,
    });
  }

  // Mapping

  private toParams(spec: OidcProviderManifest) {
    return {
      name: spec.name,
      type: spec.type,
      issuerUrl: spec.issuerUrl,
      clientId: spec.clientId,
      clientSecret: spec.clientSecret,
      scopes: spec.scopes,
      claimMappings: spec.claimMappings,
      extraParams: spec.extraParams,
      enabled: spec.enabled,
      externalId: spec.externalId,
    };
  }
}
