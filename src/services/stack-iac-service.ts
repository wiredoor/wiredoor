import { Service } from 'typedi';
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
  name: string;
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

function ensureUniqueNames(
  items: Array<{ name: string }>,
  path: string,
  errors: Array<{ path: string[]; message: string; type: 'Error' }>,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.name)) {
      errors.push({
        path: [...path, item.name],
        message: `duplicated name "${item.name}"`,
        type: 'Error',
      });
    }
    seen.add(item.name);
  }
}

@Service()
export class StackIaCService {
  constructor(
    private readonly oidcProviderRepository: OidcProviderRepository,
    private readonly nodeRepository: NodeRepository,
    private readonly httpResourceRepository: HttpResourceRepository,
    private readonly nodesService: NodesService,
    private readonly httpResourceService: HttpResourceService,
  ) {}

  async export(manager?: EntityManager): Promise<StackManifest> {
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
      nodeExtIdById.set(node.id, node.name!);
    }

    const providerExtIdById = new Map<number, string>();
    for (const provider of providers) {
      providerExtIdById.set(provider.id, provider.name!);
    }

    // Build manifest
    const manifest: StackManifest = {
      apiVersion: 'wiredoor.io/v1alpha1',
      kind: 'Stack',

      nodes: nodes.map(
        (node): NodeManifest => ({
          name: node.name,
        }),
      ),

      auth: {
        providers: providers.map(
          (provider): OidcProviderManifest => ({
            name: provider.name,
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

    const desiredNodeIds = new Set(desiredNodes.map((n) => n.name));
    const desiredProviderIds = new Set(desiredProviders.map((p) => p.name));
    const desiredHttpIds = new Set(desiredHttpResources.map((h) => h.name));

    for (const spec of desiredNodes) {
      const current = existingNodes.find((n) => n.name === spec.name);

      if (!current) {
        summary.nodes.created++;
        changes.push({
          kind: 'node',
          name: spec.name,
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
          name: spec.name,
          action: 'unchanged',
        });
      } else {
        summary.nodes.updated++;
        changes.push({
          kind: 'node',
          name: spec.name,
          action: 'update',
        });
      }
    }

    for (const row of existingNodes) {
      if (row.name && !desiredNodeIds.has(row.name)) {
        summary.nodes.deleted++;
        changes.push({
          kind: 'node',
          name: row.name,
          action: 'delete',
        });
      }
    }

    for (const spec of desiredProviders) {
      const current = existingProviders.find((p) => p.name === spec.name);

      if (!current) {
        summary.providers.created++;
        changes.push({
          kind: 'provider',
          name: spec.name,
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
          name: spec.name,
          action: 'unchanged',
        });
      } else {
        summary.providers.updated++;
        changes.push({
          kind: 'provider',
          name: spec.name,
          action: 'update',
        });
      }
    }

    for (const row of existingProviders) {
      if (row.name && !desiredProviderIds.has(row.name)) {
        summary.providers.deleted++;
        changes.push({
          kind: 'provider',
          name: row.name,
          action: 'delete',
        });
      }
    }

    const nodeRows = await this.nodeRepository.find();
    const nodeMap = new Map(nodeRows.map((n) => [n.name, n]));

    const providerRows = await this.oidcProviderRepository.find();
    const providerMap = new Map(providerRows.map((p) => [p.name, p]));

    for (const spec of desiredHttpResources) {
      const current = existingHttpResources.find((h) => h.name === spec.name);

      if (!current) {
        summary.httpResources.created++;
        changes.push({
          kind: 'httpResource',
          name: spec.name,
          action: 'create',
        });
        continue;
      }

      const nestedPlan = await this.httpResourceService.planDeclarativeResource(
        current.id,
        {
          name: spec.name,
          ...this.buildResolvedHttpPayload(spec, providerMap, nodeMap),
        },
      );

      if (nestedPlan.changed) {
        summary.httpResources.updated++;
        changes.push({
          kind: 'httpResource',
          name: spec.name,
          action: 'update',
          details: nestedPlan,
        });
      } else {
        summary.httpResources.unchanged++;
        changes.push({
          kind: 'httpResource',
          name: spec.name,
          action: 'unchanged',
        });
      }
    }

    for (const row of existingHttpResources) {
      if (row.name && !desiredHttpIds.has(row.name)) {
        summary.httpResources.deleted++;
        changes.push({
          kind: 'httpResource',
          name: row.name,
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
          { where: { name: spec.name } },
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
          { where: { name: spec.name } },
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
          { where: { name: spec.name } },
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

    ensureUniqueNames(nodes, 'nodes', errors);
    ensureUniqueNames(providers, 'auth.providers', errors);
    ensureUniqueNames(httpResources, 'http', errors);

    const nodeIds = new Set(nodes.map((n) => n.name));
    const providerIds = new Set(providers.map((p) => p.name));

    for (const http of httpResources) {
      const upstreams = http.upstreams ?? [];
      const accessRules = http.accessRules ?? [];
      const edgeRules = http.edgeRules ?? [];

      const hasDefaultUpstream = upstreams.some(
        (u) => u.type === 'prefix' && u.pathPattern === '/',
      );

      if (!hasDefaultUpstream) {
        errors.push({
          path: ['http', http.name, 'upstreams'],
          message: `http[${http.name}] must have a default upstream with type=prefix and pathPattern=/`,
          type: 'Error',
        });
      }

      if (http.providerRef && !providerIds.has(http.providerRef)) {
        errors.push({
          path: ['http', http.name, 'providerRef'],
          message: `http[${http.name}].providerRef references unknown provider "${http.providerRef}"`,
          type: 'Error',
        });
      }

      for (const upstream of upstreams) {
        if (upstream.targetNodeRef && !nodeIds.has(upstream.targetNodeRef)) {
          errors.push({
            path: ['http', http.name, 'upstreams', upstream.targetNodeRef],
            message: `http[${http.name}].upstreams targetNodeRef "${upstream.targetNodeRef}" does not exist`,
            type: 'Error',
          });
        }

        const hasNodeRef = Boolean(upstream.targetNodeRef);
        const hasTargetHost = Boolean(upstream.targetHost);

        if (!hasNodeRef && !hasTargetHost) {
          errors.push({
            path: ['http', http.name, 'upstreams', upstream.targetNodeRef],
            message: `http[${http.name}].upstreams entry requires targetNodeRef or targetHost`,
            type: 'Error',
          });
        }

        if (hasNodeRef && hasTargetHost) {
          errors.push({
            path: ['http', http.name, 'upstreams', upstream.targetNodeRef],
            message: `http[${http.name}].upstreams entry must not define both targetNodeRef and targetHost`,
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
          message: `http[${http.name}] has access.require_auth rules but no providerRef`,
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
              path: ['http', http.name, 'accessRules', ruleAny.upstreamRef],
              message: `http[${http.name}] accessRules upstreamRef "${ruleAny.upstreamRef}" does not match any upstream natural key`,
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
              path: ['http', http.name, 'edgeRules', ruleAny.upstreamRef],
              message: `http[${http.name}] edgeRules upstreamRef "${ruleAny.upstreamRef}" does not match any upstream natural key`,
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
    const desiredIds = new Set(specs.map((n) => n.name));
    const existingRows = await this.nodeRepository.find({}, manager);

    for (const spec of specs) {
      const existing = await this.nodeRepository.findOne(
        { where: { name: spec.name } },
        manager,
      );

      if (!existing) {
        await this.nodeRepository.save(
          {
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
      if (row.name && !desiredIds.has(row.name)) {
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
    const desiredIds = new Set(specs.map((p) => p.name));
    const existingRows = await this.oidcProviderRepository.find({}, manager);

    for (const spec of specs) {
      const existing = await this.oidcProviderRepository.findOne(
        {
          where: { name: spec.name },
        },
        manager,
      );

      const payload = {
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
        map.set(spec.name, created);
        continue;
      }

      const currentFingerprint = this.providerFingerprintFromEntity(existing);
      const desiredFingerprint = this.providerFingerprint(spec);

      if (currentFingerprint === desiredFingerprint) {
        result.providers.unchanged++;
        map.set(spec.name, existing);
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
      map.set(spec.name, updated);
    }

    for (const row of existingRows) {
      if (row.name && !desiredIds.has(row.name)) {
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
    const desiredIds = new Set(specs.map((h) => h.name));
    const existingRows = await this.httpResourceRepository.find({}, manager);

    const nodeRows = await this.nodeRepository.find({}, manager);
    const nodeMap = new Map(nodeRows.map((n) => [n.name, n]));

    for (const spec of specs) {
      const existing = await this.httpResourceRepository.findOne(
        { where: { name: spec.name } },
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
            name: spec.name,
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
            name: spec.name,
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
      if (row.name && !desiredIds.has(row.name)) {
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
