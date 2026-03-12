import { Inject, Service } from 'typedi';
import { EntityManager } from 'typeorm';

import {
  HttpResourceManifest,
  OidcProviderManifest,
  StackManifest,
  stackManifestValidator,
  NodeManifest,
} from '../schemas/iac-schemas';

import { HttpResourceService } from './http-resources';
import { NodesService } from './nodes-service';
import { ValidationError } from 'joi';

import { OidcProviderRepository } from '../repositories/oidc-provider-repository';
import { OidcProvider } from '../database/models/oidc-provider';
import { HttpResourceRepository } from '../repositories/http-resource-repository';
import { NodeRepository } from '../repositories/node-repository';
import { stableStringify, toSlug, uniqueSlug } from '../utils/transformers';
import { decrypt } from '../utils/cypher';
import { HttpResourceType } from '../schemas/http-resource-schemas';
import { Node } from '../database/models/node';

type ApplyCounters = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
};

export type IaCApplyResult = {
  nodes: ApplyCounters;
  providers: ApplyCounters;
  httpResources: ApplyCounters;
};

export type IaCPlanAction = 'create' | 'update' | 'delete' | 'unchanged';

export type IaCPlanChange = {
  kind: 'node' | 'provider' | 'httpResource';
  externalId: string;
  action: IaCPlanAction;
  details?: Record<string, any>;
};

export type IaCPlanResult = {
  valid: true;
  changes: IaCPlanChange[];
  summary: IaCApplyResult;
};

function emptyCounters(): ApplyCounters {
  return { created: 0, updated: 0, deleted: 0, unchanged: 0 };
}

function newResult(): IaCApplyResult {
  return {
    nodes: emptyCounters(),
    providers: emptyCounters(),
    httpResources: emptyCounters(),
  };
}

function ensureUniqueExternalIds(
  items: Array<{ externalId: string }>,
  path: string,
  errors: Array<{ path: string[]; message: string; type: 'Error' }>,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.externalId)) {
      errors.push({
        path: [...path, item.externalId],
        message: `duplicated externalId "${item.externalId}"`,
        type: 'Error',
      });
    }
    seen.add(item.externalId);
  }
}

@Service()
export class StackIaCService {
  constructor(
    @Inject() private readonly oidcProviderRepository: OidcProviderRepository,
    @Inject() private readonly nodeRepository: NodeRepository,
    @Inject() private readonly httpResourceRepository: HttpResourceRepository,
    @Inject() private readonly nodesService: NodesService,
    @Inject() private readonly httpResourceService: HttpResourceService,
  ) {}

  async export(manager?: EntityManager): Promise<StackManifest> {
    // Ensure all entities have externalIds
    await this.ensureExternalIds(manager);

    // Load everything
    const nodes = await this.nodeRepository.find(undefined, manager);
    const providers = await this.oidcProviderRepository.find(
      undefined,
      manager,
    );
    const httpResources = await this.httpResourceRepository.find(
      { relations: ['httpUpstreams', 'accessRules', 'edgeRules'] },
      manager,
    );

    // Build lookup maps for reverse-resolving IDs to refs
    const nodeExtIdById = new Map<number, string>();
    for (const node of nodes) {
      nodeExtIdById.set(node.id, node.externalId!);
    }

    const providerExtIdById = new Map<number, string>();
    for (const provider of providers) {
      providerExtIdById.set(provider.id, provider.externalId!);
    }

    // Build manifest
    const manifest: StackManifest = {
      apiVersion: 'wiredoor.io/v1alpha1',
      kind: 'Stack',

      nodes: nodes.map(
        (node): NodeManifest => ({
          name: node.name,
          externalId: node.externalId!,
        }),
      ),

      auth: {
        providers: providers.map(
          (provider): OidcProviderManifest => ({
            name: provider.name,
            externalId: provider.externalId!,
            type: provider.type,
            // Secrets are redacted user must fill them in
            issuerUrl: provider.issuerUrl ?? '',
            clientId: '**REDACTED**',
            clientSecret: '**REDACTED**',
            scopes: provider.scopes,
          }),
        ),
      },

      http: httpResources.map((resource) =>
        this.httpResourceService.exportHttpResource(
          resource,
          nodeExtIdById,
          providerExtIdById,
        ),
      ),
    };

    return manifest;
  }

  async validate(manifest: StackManifest): Promise<StackManifest> {
    const { error, value } = stackManifestValidator.validate(manifest);

    if (error) {
      throw new ValidationError('Invalid stack manifest', error.details, null);
    }

    this.validateStackSemantics(value);

    return value;
  }

  async apply(manifest: StackManifest): Promise<IaCApplyResult> {
    const value = await this.validate(manifest);
    const result = newResult();

    await this.httpResourceRepository.transaction(async (manager) => {
      await this.applyNodes(value.nodes ?? [], result, manager);

      const providerMap = await this.applyProviders(
        value.auth?.providers ?? [],
        result,
        manager,
      );

      await this.applyHttpResources(
        value.http ?? [],
        providerMap,
        result,
        manager,
      );
    });

    return result;
  }

  async plan(manifest: StackManifest): Promise<IaCPlanResult> {
    const value = await this.validate(manifest);

    const summary = newResult();
    const changes: IaCPlanChange[] = [];

    const desiredNodes = value.nodes ?? [];
    const desiredProviders = value.auth?.providers ?? [];
    const desiredHttpResources = value.http ?? [];

    const existingNodes = await this.nodeRepository.find();
    const existingProviders = await this.oidcProviderRepository.find();
    const existingHttpResources = await this.httpResourceRepository.find();

    const desiredNodeIds = new Set(desiredNodes.map((n) => n.externalId));
    const desiredProviderIds = new Set(
      desiredProviders.map((p) => p.externalId),
    );
    const desiredHttpIds = new Set(
      desiredHttpResources.map((h) => h.externalId),
    );

    for (const spec of desiredNodes) {
      const current = existingNodes.find(
        (n) => n.externalId === spec.externalId,
      );

      if (!current) {
        summary.nodes.created++;
        changes.push({
          kind: 'node',
          externalId: spec.externalId,
          action: 'create',
        });
        continue;
      }

      const desiredFingerprint = this.nodeFingerprint(spec);
      const currentFingerprint = this.nodeFingerprintFromEntity(current);

      if (desiredFingerprint === currentFingerprint) {
        summary.nodes.unchanged++;
        changes.push({
          kind: 'node',
          externalId: spec.externalId,
          action: 'unchanged',
        });
      } else {
        summary.nodes.updated++;
        changes.push({
          kind: 'node',
          externalId: spec.externalId,
          action: 'update',
        });
      }
    }

    for (const row of existingNodes) {
      if (row.externalId && !desiredNodeIds.has(row.externalId)) {
        summary.nodes.deleted++;
        changes.push({
          kind: 'node',
          externalId: row.externalId,
          action: 'delete',
        });
      }
    }

    for (const spec of desiredProviders) {
      const current = existingProviders.find(
        (p) => p.externalId === spec.externalId,
      );

      if (!current) {
        summary.providers.created++;
        changes.push({
          kind: 'provider',
          externalId: spec.externalId,
          action: 'create',
        });
        continue;
      }

      const desiredFingerprint = this.providerFingerprint(spec);
      const currentFingerprint = this.providerFingerprintFromEntity(current);

      if (desiredFingerprint === currentFingerprint) {
        summary.providers.unchanged++;
        changes.push({
          kind: 'provider',
          externalId: spec.externalId,
          action: 'unchanged',
        });
      } else {
        summary.providers.updated++;
        changes.push({
          kind: 'provider',
          externalId: spec.externalId,
          action: 'update',
        });
      }
    }

    for (const row of existingProviders) {
      if (row.externalId && !desiredProviderIds.has(row.externalId)) {
        summary.providers.deleted++;
        changes.push({
          kind: 'provider',
          externalId: row.externalId,
          action: 'delete',
        });
      }
    }

    const nodeRows = await this.nodeRepository.find();
    const nodeMap = new Map(nodeRows.map((n) => [n.externalId, n]));

    const providerRows = await this.oidcProviderRepository.find();
    const providerMap = new Map(providerRows.map((p) => [p.externalId, p]));

    for (const spec of desiredHttpResources) {
      const current = existingHttpResources.find(
        (h) => h.externalId === spec.externalId,
      );

      if (!current) {
        summary.httpResources.created++;
        changes.push({
          kind: 'httpResource',
          externalId: spec.externalId,
          action: 'create',
        });
        continue;
      }

      const nestedPlan = await this.httpResourceService.planDeclarativeResource(
        current.id,
        {
          externalId: spec.externalId,
          ...this.buildResolvedHttpPayload(spec, providerMap, nodeMap),
        },
      );

      if (nestedPlan.changed) {
        summary.httpResources.updated++;
        changes.push({
          kind: 'httpResource',
          externalId: spec.externalId,
          action: 'update',
          details: nestedPlan,
        });
      } else {
        summary.httpResources.unchanged++;
        changes.push({
          kind: 'httpResource',
          externalId: spec.externalId,
          action: 'unchanged',
        });
      }
    }

    for (const row of existingHttpResources) {
      if (row.externalId && !desiredHttpIds.has(row.externalId)) {
        summary.httpResources.deleted++;
        changes.push({
          kind: 'httpResource',
          externalId: row.externalId,
          action: 'delete',
        });
      }
    }

    return {
      valid: true,
      changes,
      summary,
    };
  }

  async destroy(manifest: StackManifest): Promise<IaCApplyResult> {
    const value = await this.validate(manifest);
    const result = newResult();

    await this.httpResourceRepository.transaction(async (manager) => {
      for (const spec of value.http ?? []) {
        const existing = await this.httpResourceRepository.findOne(
          { where: { externalId: spec.externalId } },
          manager,
        );

        if (!existing) {
          result.httpResources.unchanged++;
          continue;
        }

        await this.httpResourceService.deleteHttpResource(existing.id, manager);
        result.httpResources.deleted++;
      }

      for (const spec of value.auth?.providers ?? []) {
        const existing = await this.oidcProviderRepository.findOne(
          { where: { externalId: spec.externalId } },
          manager,
        );

        if (!existing) {
          result.providers.unchanged++;
          continue;
        }

        await this.oidcProviderRepository.delete(existing.id, manager);
        result.providers.deleted++;
      }

      for (const spec of value.nodes ?? []) {
        const existing = await this.nodeRepository.findOne(
          { where: { externalId: spec.externalId } },
          manager,
        );

        if (!existing) {
          result.nodes.unchanged++;
          continue;
        }

        await this.nodeRepository.delete(existing.id, manager);
        result.nodes.deleted++;
      }
    });

    return result;
  }

  private validateStackSemantics(manifest: StackManifest): void {
    const errors: { path: string[]; message: string; type: 'Error' }[] = [];

    const nodes = manifest.nodes ?? [];
    const providers = manifest.auth?.providers ?? [];
    const httpResources = manifest.http ?? [];

    ensureUniqueExternalIds(nodes, 'nodes', errors);
    ensureUniqueExternalIds(providers, 'auth.providers', errors);
    ensureUniqueExternalIds(httpResources, 'http', errors);

    const nodeIds = new Set(nodes.map((n) => n.externalId));
    const providerIds = new Set(providers.map((p) => p.externalId));

    for (const http of httpResources) {
      const upstreams = http.upstreams ?? [];
      const accessRules = http.accessRules ?? [];
      const edgeRules = http.edgeRules ?? [];

      const hasDefaultUpstream = upstreams.some(
        (u) => u.type === 'prefix' && u.pathPattern === '/',
      );

      if (!hasDefaultUpstream) {
        errors.push({
          path: ['http', http.externalId, 'upstreams'],
          message: `http[${http.externalId}] must have a default upstream with type=prefix and pathPattern=/`,
          type: 'Error',
        });
      }

      if (http.providerRef && !providerIds.has(http.providerRef)) {
        errors.push({
          path: ['http', http.externalId, 'providerRef'],
          message: `http[${http.externalId}].providerRef references unknown provider "${http.providerRef}"`,
          type: 'Error',
        });
      }

      for (const upstream of upstreams) {
        if (upstream.targetNodeRef && !nodeIds.has(upstream.targetNodeRef)) {
          errors.push({
            path: [
              'http',
              http.externalId,
              'upstreams',
              upstream.targetNodeRef,
            ],
            message: `http[${http.externalId}].upstreams targetNodeRef "${upstream.targetNodeRef}" does not exist`,
            type: 'Error',
          });
        }

        const hasNodeRef = Boolean(upstream.targetNodeRef);
        const hasTargetHost = Boolean(upstream.targetHost);

        if (!hasNodeRef && !hasTargetHost) {
          errors.push({
            path: [
              'http',
              http.externalId,
              'upstreams',
              upstream.targetNodeRef,
            ],
            message: `http[${http.externalId}].upstreams entry requires targetNodeRef or targetHost`,
            type: 'Error',
          });
        }

        if (hasNodeRef && hasTargetHost) {
          errors.push({
            path: [
              'http',
              http.externalId,
              'upstreams',
              upstream.targetNodeRef,
            ],
            message: `http[${http.externalId}].upstreams entry must not define both targetNodeRef and targetHost`,
            type: 'Error',
          });
        }
      }

      const requiresAuthProvider = accessRules.some(
        (r) => r.action.type === 'access.require_auth',
      );

      if (requiresAuthProvider && !http.providerRef) {
        errors.push({
          path: ['skipAuthRoutes'],
          message: `http[${http.externalId}] has access.require_auth rules but no providerRef`,
          type: 'Error',
        });
      }

      // Solo valida upstreamRef si realmente existe ese concepto todavía en tu schema.
      const upstreamKeys = new Set(
        upstreams.map((u) => `${u.type}|${u.pathPattern}`),
      );

      for (const rule of accessRules) {
        const ruleAny = rule;
        if (ruleAny.upstreamRef) {
          if (!upstreamKeys.has(ruleAny.upstreamRef)) {
            errors.push({
              path: [
                'http',
                http.externalId,
                'accessRules',
                ruleAny.upstreamRef,
              ],
              message: `http[${http.externalId}] accessRules upstreamRef "${ruleAny.upstreamRef}" does not match any upstream natural key`,
              type: 'Error',
            });
          }
        }
      }

      for (const rule of edgeRules) {
        const ruleAny = rule;
        if (ruleAny.upstreamRef) {
          if (!upstreamKeys.has(ruleAny.upstreamRef)) {
            errors.push({
              path: ['http', http.externalId, 'edgeRules', ruleAny.upstreamRef],
              message: `http[${http.externalId}] edgeRules upstreamRef "${ruleAny.upstreamRef}" does not match any upstream natural key`,
              type: 'Error',
            });
          }
        }
      }
    }

    if (errors.length) {
      throw new ValidationError('Invalid stack manifest', errors, null);
    }
  }

  private async applyNodes(
    specs: NodeManifest[],
    result: IaCApplyResult,
    manager?: EntityManager,
  ): Promise<void> {
    const desiredIds = new Set(specs.map((n) => n.externalId));
    const existingRows = await this.nodeRepository.find({}, manager);

    for (const spec of specs) {
      const existing = await this.nodeRepository.findOne(
        { where: { externalId: spec.externalId } },
        manager,
      );

      if (!existing) {
        await this.nodeRepository.save(
          {
            externalId: spec.externalId,
            name: spec.name,
            dns: spec.dns,
            keepalive: spec.keepalive,
            address: spec.address,
            allowInternet: spec.allowInternet,
            advanced: spec.advanced,
            enabled: spec.enabled,
            gatewayNetworks: spec.gatewayNetworks,
            isGateway: spec.isGateway,
          },
          manager,
        );

        result.nodes.created++;
        continue;
      }

      const desiredFingerprint = this.nodeFingerprint(spec);
      const currentFingerprint = this.nodeFingerprintFromEntity(existing);

      if (desiredFingerprint === currentFingerprint) {
        result.nodes.unchanged++;
        continue;
      }

      await this.nodeRepository.save(
        {
          ...existing,
          name: spec.name,
          dns: spec.dns,
          keepalive: spec.keepalive,
          address: spec.address,
          allowInternet: spec.allowInternet,
          advanced: spec.advanced,
          enabled: spec.enabled,
          gatewayNetworks: spec.gatewayNetworks,
          isGateway: spec.isGateway,
        },
        manager,
      );

      result.nodes.updated++;
    }

    for (const row of existingRows) {
      if (row.externalId && !desiredIds.has(row.externalId)) {
        await this.nodeRepository.delete(row.id, manager);
        result.nodes.deleted++;
      }
    }
  }

  async applyProviders(
    specs: OidcProviderManifest[],
    result: IaCApplyResult,
    manager?: EntityManager,
  ): Promise<Map<string, OidcProvider>> {
    const map = new Map<string, OidcProvider>();
    const desiredIds = new Set(specs.map((p) => p.externalId));
    const existingRows = await this.oidcProviderRepository.find({}, manager);

    for (const spec of specs) {
      const existing = await this.oidcProviderRepository.findOne(
        {
          where: { externalId: spec.externalId },
        },
        manager,
      );

      const payload = {
        externalId: spec.externalId,
        name: spec.name,
        type: spec.type,
        issuerUrl: spec.issuerUrl,
        clientId: spec.clientId,
        clientSecret: spec.clientSecret,
        scopes: spec.scopes ?? '',
        claimMappings: spec.claimMappings ?? {},
        extraParams: spec.extraParams ?? {},
        enabled: spec.enabled ?? true,
      };

      if (!existing) {
        const created = await this.oidcProviderRepository.save(
          payload,
          manager,
        );
        result.providers.created++;
        map.set(spec.externalId, created);
        continue;
      }

      const currentFingerprint = this.providerFingerprintFromEntity(existing);
      const desiredFingerprint = this.providerFingerprint(spec);

      if (currentFingerprint === desiredFingerprint) {
        result.providers.unchanged++;
        map.set(spec.externalId, existing);
        continue;
      }

      const updated = await this.oidcProviderRepository.save(
        {
          ...existing,
          ...payload,
        },
        manager,
      );

      result.providers.updated++;
      map.set(spec.externalId, updated);
    }

    for (const row of existingRows) {
      if (row.externalId && !desiredIds.has(row.externalId)) {
        await this.oidcProviderRepository.delete(row.id, manager);
        result.providers.deleted++;
      }
    }

    return map;
  }

  private async applyHttpResources(
    specs: HttpResourceManifest[],
    providerMap: Map<string, OidcProvider>,
    result: IaCApplyResult,
    manager?: EntityManager,
  ): Promise<void> {
    const desiredIds = new Set(specs.map((h) => h.externalId));
    const existingRows = await this.httpResourceRepository.find({}, manager);

    const nodeRows = await this.nodeRepository.find({}, manager);
    const nodeMap = new Map(nodeRows.map((n) => [n.externalId, n]));

    for (const spec of specs) {
      const existing = await this.httpResourceRepository.findOne(
        { where: { externalId: spec.externalId } },
        manager,
      );

      const provider = spec.providerRef
        ? (providerMap.get(spec.providerRef) ?? null)
        : null;

      const payload = this.buildResolvedHttpPayload(
        spec,
        providerMap,
        nodeMap,
        provider?.id,
      );

      if (!existing) {
        await this.httpResourceService.createDeclarativeResource(
          {
            externalId: spec.externalId,
            ...payload,
          },
          manager,
        );

        result.httpResources.created++;
        continue;
      }

      const applyResult =
        await this.httpResourceService.applyDeclarativeResource(
          existing.id,
          {
            externalId: spec.externalId,
            ...payload,
          },
          manager,
        );

      if (applyResult.changed) {
        result.httpResources.updated++;
      } else {
        result.httpResources.unchanged++;
      }
    }

    for (const row of existingRows) {
      if (row.externalId && !desiredIds.has(row.externalId)) {
        await this.httpResourceService.deleteHttpResource(row.id, manager);
        result.httpResources.deleted++;
      }
    }
  }

  private buildResolvedHttpPayload(
    spec: HttpResourceManifest,
    providerMap: Map<string, OidcProvider>,
    nodeMap: Map<string, Node>,
    providerIdOverride?: number,
  ): HttpResourceType {
    const provider =
      providerIdOverride != null
        ? { id: providerIdOverride }
        : spec.providerRef
          ? (providerMap.get(spec.providerRef) ?? null)
          : null;

    const resolvedUpstreams = (spec.upstreams ?? []).map((u) => {
      const node = u.targetNodeRef ? nodeMap.get(u.targetNodeRef) : null;

      return {
        type: u.type,
        pathPattern: u.pathPattern,
        rewrite: u.rewrite,
        targetProtocol: u.targetProtocol,
        targetHost: u.targetHost,
        targetPort: u.targetPort,
        targetSslVerify: u.targetSslVerify,
        targetNodeId: node?.id,
      };
    });

    const upstreamNaturalKeyMap = new Map<string, string>();
    for (const u of spec.upstreams ?? []) {
      upstreamNaturalKeyMap.set(`${u.type}|${u.pathPattern}`, u.pathPattern);
    }

    const resolvedAccessRules = (spec.accessRules ?? []).map((r) => {
      const upstreamRef = r.upstreamRef as string | undefined;

      return {
        enabled: r.enabled,
        order: r.order,
        when: r.when,
        action: r.action.type.replace('access.', '') as
          | 'public'
          | 'require_auth'
          | 'deny',
        predicate: r.predicate,
        upstreamPathPattern: upstreamRef
          ? upstreamNaturalKeyMap.get(upstreamRef)
          : undefined,
      };
    });

    const resolvedEdgeRules = (spec.edgeRules ?? []).map((r) => {
      const upstreamRef = r.upstreamRef as string | undefined;

      return {
        enabled: r.enabled,
        order: r.order,
        when: r.when,
        action: r.action,
        upstreamPathPattern: upstreamRef
          ? upstreamNaturalKeyMap.get(upstreamRef)
          : undefined,
      };
    });

    return {
      name: spec.name,
      domain: spec.domain,
      enabled: spec.enabled,
      expiresAt: spec.expiresAt ? new Date(spec.expiresAt) : undefined,
      oidcProviderId: provider?.id,
      httpUpstreams: resolvedUpstreams,
      accessRules: resolvedAccessRules,
      edgeRules: resolvedEdgeRules,
    };
  }

  // Auto-generate externalIds for entities that lack them

  async ensureExternalIds(manager?: EntityManager): Promise<void> {
    await this.ensureExternalIdsFor(this.nodeRepository, 'name', manager);
    await this.ensureExternalIdsFor(
      this.oidcProviderRepository,
      'name',
      manager,
    );
    await this.ensureExternalIdsFor(
      this.httpResourceRepository,
      'name',
      manager,
    );
  }

  async ensureExternalIdsFor(
    repository: any,
    slugField: string,
    manager?: EntityManager,
  ): Promise<void> {
    const entities = await repository.find(undefined, manager);
    const existingIds: Set<string> = new Set(
      entities
        .filter((e: any) => e.externalId)
        .map((e: any) => e.externalId as string),
    );

    for (const entity of entities) {
      if (entity.externalId) continue;

      const base = toSlug(entity[slugField] || `item-${entity.id}`);
      const externalId = uniqueSlug(base, existingIds);

      existingIds.add(externalId);
      await repository.save({ id: entity.id, externalId }, manager);
    }
  }

  private nodeFingerprint(spec: NodeManifest): string {
    return stableStringify({
      name: spec.name,
      dns: spec.dns ?? null,
      keepalive: spec.keepalive ?? null,
      address: spec.address ?? null,
      interface: spec.interface ?? null,
      allowInternet: spec.allowInternet ?? null,
      advanced: spec.advanced ?? null,
      enabled: spec.enabled ?? null,
      gatewayNetworks: spec.gatewayNetworks ?? [],
      isGateway: spec.isGateway ?? null,
    });
  }

  private nodeFingerprintFromEntity(entity: Node): string {
    return stableStringify({
      name: entity.name,
      dns: entity.dns ?? null,
      keepalive: entity.keepalive ?? null,
      address: entity.address ?? null,
      allowInternet: entity.allowInternet ?? null,
      advanced: entity.advanced ?? null,
      enabled: entity.enabled ?? null,
      gatewayNetworks: entity.gatewayNetworks ?? [],
      isGateway: entity.isGateway ?? null,
    });
  }

  private providerFingerprint(spec: OidcProviderManifest): string {
    return stableStringify({
      name: spec.name,
      type: spec.type,
      issuerUrl: spec.issuerUrl,
      clientId: spec.clientId,
      clientSecret: spec.clientSecret,
      scopes: spec.scopes ?? '',
      claimMappings: spec.claimMappings ?? {},
      extraParams: spec.extraParams ?? {},
      enabled: spec.enabled ?? true,
    });
  }

  private providerFingerprintFromEntity(entity: OidcProvider): string {
    return stableStringify({
      name: entity.name,
      type: entity.type,
      issuerUrl: entity.issuerUrl,
      clientId: entity.clientId,
      clientSecret: decrypt(entity.clientSecretEnc),
      scopes: entity.scopes ?? '',
      claimMappings: entity.claimMappings ?? {},
      extraParams: entity.extraParams ?? {},
      enabled: entity.enabled ?? true,
    });
  }
}
