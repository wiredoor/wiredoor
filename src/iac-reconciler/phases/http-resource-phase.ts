import { Service } from 'typedi';
import { EntityManager, In } from 'typeorm';

import { BaseResourcePhase } from '../../core/reconciler/base-resource-phase';
import {
  ReconcileCounters,
  ReconcileMode,
  RefContext,
} from '../../core/reconciler/types';
import {
  StructuralValidator,
  SemanticValidator,
  RuntimeValidator,
  ValidationResult,
} from '../../core/reconciler/validation';
import {
  checkDuplicateNames,
  checkRefsExist,
  checkUniqueWithinScope,
  checkUniqueOrders,
} from '../../core/reconciler/validation-helpers';

import { HttpResourceService } from '../../services/http-resources';
import { HttpResourceRepository } from '../../repositories/http-resource-repository';
import { HttpResource } from '../../database/models/http-resource';

import {
  type HttpResourceManifest,
  type HttpAccessRuleManifest,
  httpResourceManifestValidator,
} from '../../schemas/iac-schemas';

import type {
  HttpUpstreamSpec,
  AccessRuleSpec,
  EdgeRuleSpec,
  HttpResourceType,
} from '../../schemas/http-resource-schemas';

@Service()
export class HttpResourcePhase
  extends BaseResourcePhase<HttpResourceManifest, HttpResource>
  implements
    StructuralValidator<HttpResourceManifest>,
    SemanticValidator<HttpResourceManifest>,
    RuntimeValidator<HttpResourceManifest>
{
  readonly phaseId = 'http';
  readonly dependsOn = ['node', 'provider'];

  constructor(
    private readonly httpResourceRepository: HttpResourceRepository,
    private readonly httpResourceService: HttpResourceService,
  ) {
    super();
  }

  extract(manifest: Record<string, unknown>): HttpResourceManifest[] {
    return (manifest.http as HttpResourceManifest[]) ?? [];
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 1: STRUCTURAL
  // ═══════════════════════════════════════════════════════════════

  validateStructure(
    items: HttpResourceManifest[],
    result: ValidationResult,
  ): void {
    for (const [i, resource] of items.entries()) {
      const p = `http[${i}]`;

      const { error } = httpResourceManifestValidator.validate(resource);
      if (error) {
        for (const detail of error.details) {
          result.error(
            'http',
            `${p}.${detail.path.join('.')}`,
            'INVALID_STRUCTURE',
            detail.message,
          );
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 2: SEMANTIC
  // ═══════════════════════════════════════════════════════════════

  validateSemantics(
    items: HttpResourceManifest[],
    manifest: Record<string, unknown>,
    result: ValidationResult,
  ): void {
    checkDuplicateNames(items, 'http', 'http', result);

    const nodeIds = new Set(
      ((manifest.nodes as any) ?? []).map((n: any) => n.name),
    );
    const providerIds = new Set(
      ((manifest.auth as any)?.providers ?? []).map((p: any) => p.name),
    );

    // Duplicate domains across all resources
    const seenDomains = new Map<string, number>();

    for (const [i, resource] of items.entries()) {
      const p = `http[${i}]`;

      // Duplicate domain
      const prevDomain = seenDomains.get(resource.domain);
      if (prevDomain !== undefined) {
        result.error(
          'http',
          `${p}.domain`,
          'DUPLICATE_DOMAIN',
          `Domain "${resource.domain}" already used by http[${prevDomain}]`,
        );
      } else {
        seenDomains.set(resource.domain, i);
      }

      // providerRef
      checkRefsExist({
        items: [resource],
        phase: 'http',
        pathPrefix: p,
        getRef: (r) => r.providerRef,
        refField: 'providerRef',
        validIds: providerIds,
        targetLabel: 'auth provider',
        result,
      });

      checkUniqueWithinScope(
        resource.upstreams,
        (u) => `${u.type}:${u.pathPattern}`,
        'http',
        `${p}.upstreams`,
        'type+pathPattern',
        result,
      );

      // targetNodeRef
      checkRefsExist({
        items: resource.upstreams,
        phase: 'http',
        pathPrefix: `${p}.upstreams`,
        getRef: (u) => u.targetNodeRef,
        refField: 'targetNodeRef',
        validIds: nodeIds,
        targetLabel: 'node',
        result,
      });

      // Must have exactly one target source
      for (const [j, upstream] of resource.upstreams.entries()) {
        if (!upstream.targetNodeRef && !upstream.targetHost) {
          result.error(
            'http',
            `${p}.upstreams[${j}]`,
            'MISSING_TARGET',
            'Must specify either targetNodeRef or targetHost',
          );
        }
      }

      // Access rules
      if (resource.accessRules) {
        checkUniqueOrders(
          resource.accessRules,
          'http',
          `${p}.accessRules`,
          result,
        );

        for (const [j, rule] of resource.accessRules.entries()) {
          if (rule.predicate && rule.action.type === 'access.public') {
            result.error(
              'http',
              `${p}.accessRules[${j}].predicate`,
              'INVALID_PREDICATE',
              'Predicates are only valid on access.require_auth rules',
            );
          }

          if (
            rule.action.type !== 'access.require_auth' &&
            rule.action.params?.onUnauthenticated
          ) {
            result.warn(
              'http',
              `${p}.accessRules[${j}].action.params.onUnauthenticated`,
              'IGNORED_PARAM',
              'onUnauthenticated is only meaningful for access.require_auth',
            );
          }
        }
      }

      // Edge rules
      if (resource.edgeRules) {
        checkUniqueOrders(resource.edgeRules, 'http', `${p}.edgeRules`, result);
      }

      // require_auth needs a provider
      const hasAuthRule = (resource.accessRules ?? []).some(
        (r) => r.action.type === 'access.require_auth',
      );

      if (hasAuthRule && !resource.providerRef) {
        result.error(
          'http',
          `${p}.providerRef`,
          'MISSING_PROVIDER',
          'Resource has access.require_auth rules but no providerRef',
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 3: RUNTIME
  // ═══════════════════════════════════════════════════════════════

  async validateRuntime(
    items: HttpResourceManifest[],
    _refs: RefContext,
    manager: EntityManager,
    result: ValidationResult,
  ): Promise<void> {
    // DNS check (parallel)
    // const dnsChecks = items.map(async (resource, i) => {
    //   const dns = await checkDnsResolves(resource.domain);
    //   if (!dns.ok) {
    //     result.warn(
    //       'http',
    //       `http[${i}].domain`,
    //       'DNS_UNRESOLVABLE',
    //       `Domain "${resource.domain}" does not resolve: ${dns.error}`,
    //     );
    //   }
    // });

    // await Promise.all(dnsChecks);

    // Domain collision with existing resources not in this manifest
    for (const [i, resource] of items.entries()) {
      const existing = await this.httpResourceRepository.findOneBy(
        { domain: resource.domain },
        manager,
      );

      if (existing && existing.name !== resource.name) {
        result.error(
          'http',
          `http[${i}].domain`,
          'DOMAIN_CONFLICT',
          `Domain "${resource.domain}" is already assigned to ` +
            `"${existing.name}"`,
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD — delegates to HttpResourceService
  // ═══════════════════════════════════════════════════════════════

  protected async findExisting(
    names: string[],
    manager: EntityManager,
  ): Promise<HttpResource[]> {
    return this.httpResourceRepository.findBy({ name: In(names) }, manager);
  }

  protected async create(
    spec: HttpResourceManifest,
    refs: RefContext,
    manager: EntityManager,
  ): Promise<HttpResource> {
    const input = this.toDeclarativeInput(spec, refs);

    return this.httpResourceService.createDeclarativeResource(input, manager);
  }

  protected async update(
    existing: HttpResource,
    spec: HttpResourceManifest,
    refs: RefContext,
    manager: EntityManager,
  ): Promise<HttpResource> {
    const input = this.toDeclarativeInput(spec, refs);
    await this.httpResourceService.applyDeclarativeResource(
      existing.id,
      input,
      manager,
    );
    return existing;
  }

  protected async reconcileChildren(
    mode: ReconcileMode,
    existing: HttpResource | null,
    spec: HttpResourceManifest,
    refs: RefContext,
    manager: EntityManager,
  ): Promise<Record<string, ReconcileCounters>> {
    if (!existing) {
      return {
        upstreams: {
          created: spec.upstreams.length,
          updated: 0,
          deleted: 0,
          unchanged: 0,
        },
        accessRules: {
          created: (spec.accessRules ?? []).length,
          updated: 0,
          deleted: 0,
          unchanged: 0,
        },
        edgeRules: {
          created: (spec.edgeRules ?? []).length,
          updated: 0,
          deleted: 0,
          unchanged: 0,
        },
      };
    }

    const input = this.toDeclarativeInput(spec, refs);

    if (mode === 'apply') {
      const result = await this.httpResourceService.applyDeclarativeResource(
        existing.id,
        input,
        manager,
      );
      return result.children;
    }

    const plan = await this.httpResourceService.planDeclarativeResource(
      existing.id,
      input,
      manager,
    );

    return plan.children;
  }

  // ─── Fingerprinting (parent-level only) ───────────────────────

  protected fingerprintFromSpec(spec: HttpResourceManifest): string {
    return this.fingerprint({
      name: spec.name,
      domain: spec.domain,
      enabled: spec.enabled,
      expiresAt: spec.expiresAt ?? null,
      // providerRef: spec.providerRef ?? null,
    });
  }

  protected fingerprintFromEntity(entity: HttpResource): string {
    return this.fingerprint({
      name: entity.name,
      domain: entity.domain ?? null,
      enabled: entity.enabled ?? true,
      expiresAt: entity.expiresAt
        ? new Date(entity.expiresAt).toISOString()
        : null,
      // providerRef: entity.oidcProviderId ? String(entity.oidcProviderId) : null,
    });
  }

  // ─── Manifest → declarative input ────────────────────────────

  private toDeclarativeInput(
    spec: HttpResourceManifest,
    refs: RefContext,
  ): HttpResourceType {
    const oidcProviderId = spec.providerRef
      ? refs.require(
          'provider',
          spec.providerRef,
          `provider "${spec.providerRef}"`,
        )
      : undefined;

    return {
      name: spec.name,
      domain: spec.domain,
      enabled: spec.enabled,
      expiresAt: spec.expiresAt ? new Date(spec.expiresAt) : undefined,
      oidcProviderId,
      httpUpstreams: spec.upstreams.map((u) => this.mapUpstream(u, refs)),
      accessRules: (spec.accessRules ?? []).map((r) => this.mapAccessRule(r)),
      edgeRules: (spec.edgeRules ?? []).map((r) => this.mapEdgeRule(r)),
    };
  }

  private mapUpstream(
    spec: HttpResourceManifest['upstreams'][number],
    refs: RefContext,
  ): HttpUpstreamSpec {
    return {
      type: spec.type,
      pathPattern: spec.pathPattern,
      rewrite: spec.rewrite,
      targetProtocol: spec.targetProtocol,
      targetHost: spec.targetHost,
      targetPort: spec.targetPort,
      targetSslVerify: spec.targetSslVerify,
      targetNodeId: spec.targetNodeRef
        ? refs.require(
            'node',
            spec.targetNodeRef,
            `node "${spec.targetNodeRef}"`,
          )
        : undefined,
    };
  }

  private mapAccessRule(spec: HttpAccessRuleManifest): AccessRuleSpec {
    return {
      enabled: spec.enabled,
      order: spec.order,
      when: {
        type: spec.when.type,
        pathPattern: spec.when.pathPattern,
        methods: spec.when.methods ?? null,
      },
      action: spec.action.type.replace(
        'access.',
        '',
      ) as AccessRuleSpec['action'],
      predicate: spec.predicate ?? null,
    };
  }

  private mapEdgeRule(
    spec: HttpResourceManifest['edgeRules'][number],
  ): EdgeRuleSpec {
    return {
      enabled: spec.enabled,
      order: spec.order,
      when: {
        type: spec.when.type,
        pathPattern: spec.when.pathPattern,
        methods: spec.when.methods ?? null,
      },
      action: spec.action,
    };
  }
}
