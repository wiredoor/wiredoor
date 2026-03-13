import { Service } from 'typedi';
import { EntityManager } from 'typeorm';

import {
  DeclarativeHandler,
  DeclarativePlanResult,
} from '../../core/declarative/declarative-handler';
import { SubEntityReconciler } from '../../core/declarative/sub-entity-reconciler';

import { HttpResourceRepository } from '../../repositories/http-resource-repository';
import { HttpUpstreamRepository } from '../../repositories/http-upstream-repository';
import { HttpAccessRuleRepository } from '../../repositories/http-access-rule-repository';
import { HttpEdgeRuleRepository } from '../../repositories/http-edge-rule-repository';
import { HttpResourceQueryFilter } from '../../repositories/filters/http-resource-query-filter';

import { HttpResource } from '../../database/models/http-resource';

import { DomainsService } from '../domains-service';

import {
  createUpstreamDescriptor,
  createAccessRuleDescriptor,
  createEdgeRuleDescriptor,
} from './descriptors';

import type {
  DeclarativeHttpResourceInput,
  HttpUpstreamSpec,
  AccessRuleSpec,
  EdgeRuleSpec,
  HttpResourceFilterQueryParams,
  HttpResourceType,
} from '../../schemas/http-resource-schemas';
import { PagedData } from '../../schemas/shared-schemas';

import { stableStringify } from '../../utils/transformers';
import {
  HttpAccessRuleManifest,
  HttpEdgeRuleManifest,
  HttpResourceManifest,
  HttpUpstreamManifest,
} from '../../schemas/iac-schemas';
import { HttpUpstream } from '../../database/models/http-upstream';
import { HttpAccessRuleEntity } from '../../database/models/http-access-rules';
import { HttpEdgeRuleEntity } from '../../database/models/http-edge-rules';
import { NginxHttpResource } from '../proxy-server/nginx-http-resource';

@Service()
export class HttpResourceService {
  private readonly declarative: DeclarativeHandler<
    DeclarativeHttpResourceInput,
    HttpResource
  >;

  constructor(
    private readonly httpResourceRepository: HttpResourceRepository,
    private readonly httpUpstreamRepository: HttpUpstreamRepository,
    private readonly httpAccessRuleRepository: HttpAccessRuleRepository,
    private readonly httpEdgeRuleRepository: HttpEdgeRuleRepository,
    private readonly domainsService: DomainsService,
    private readonly httpResourceFilter: HttpResourceQueryFilter,
    private readonly nginxHttpResource: NginxHttpResource,
  ) {
    this.declarative = new DeclarativeHandler<
      DeclarativeHttpResourceInput,
      HttpResource
    >({
      repository: this.httpResourceRepository,

      findById: (id, manager?: EntityManager): Promise<HttpResource | null> =>
        this.httpResourceRepository.findOne(
          {
            where: { id },
            relations: ['httpUpstreams', 'accessRules', 'edgeRules'],
          },
          manager,
        ),

      toCreatePayload: (input): Partial<HttpResource> => ({
        externalId: input.externalId,
        name: input.name,
        domain: input.domain,
        enabled: input.enabled ?? true,
        expiresAt: input.expiresAt,
        oidcProviderId: input.oidcProviderId,
      }),

      toUpdatePayload: (input): Partial<HttpResource> => ({
        name: input.name,
        domain: input.domain,
        enabled: input.enabled ?? true,
        expiresAt: input.expiresAt,
        oidcProviderId: input.oidcProviderId,
      }),

      fingerprintFromInput: (input): string =>
        stableStringify({
          name: input.name,
          domain: input.domain ?? null,
          enabled: input.enabled ?? true,
          expiresAt: input.expiresAt
            ? new Date(input.expiresAt).toISOString()
            : null,
          // oidcProviderId: input.oidcProviderId ?? null,
        }),

      fingerprintFromEntity: (entity): string =>
        stableStringify({
          name: entity.name,
          domain: entity.domain ?? null,
          enabled: entity.enabled ?? true,
          expiresAt: entity.expiresAt
            ? new Date(entity.expiresAt).toISOString()
            : null,
          // oidcProviderId: entity.oidcProviderId ?? null,
        }),

      children: [
        {
          reconciler: new SubEntityReconciler(
            createUpstreamDescriptor(this.httpUpstreamRepository),
          ),
          getSpecs: (input): HttpUpstreamSpec[] => input.httpUpstreams ?? [],
        },
        {
          reconciler: new SubEntityReconciler(
            createAccessRuleDescriptor(this.httpAccessRuleRepository),
          ),
          getSpecs: (input): AccessRuleSpec[] => input.accessRules ?? [],
        },
        {
          reconciler: new SubEntityReconciler(
            createEdgeRuleDescriptor(this.httpEdgeRuleRepository),
          ),
          getSpecs: (input): EdgeRuleSpec[] => input.edgeRules ?? [],
        },
      ],

      beforeCreate: async (input, manager?: EntityManager): Promise<void> => {
        if (input.domain) {
          await this.domainsService.createDomainIfNotExists(
            input.domain,
            manager,
          );
        }
      },

      afterReconcile: async (mode, id, input, result, manager) => {
        const httpResource = await this.getHttpResource(id, manager);
        await this.nginxHttpResource.create(httpResource);
      },
    });
  }

  public async initialize(manager?: EntityManager): Promise<void> {
    const resources = await this.httpResourceRepository.find(
      {
        relations: ['httpUpstreams.node', 'accessRules', 'edgeRules'],
      },
      manager,
    );

    await Promise.all(
      resources.map((r) =>
        this.domainsService.createDomainIfNotExists(r.domain, manager),
      ),
    );

    await this.nginxHttpResource.initialize(resources);
  }

  // ═══════════════════════════════════════════════════════════════
  // Imperative API — UI controllers
  // ═══════════════════════════════════════════════════════════════

  async getHttpResources(
    filters: HttpResourceFilterQueryParams,
  ): Promise<PagedData<HttpResource>> {
    return this.httpResourceFilter.apply(
      filters,
    ) as unknown as PagedData<HttpResource>;
  }

  async getHttpResource(
    id: number,
    manager?: EntityManager,
  ): Promise<HttpResource> {
    return this.httpResourceRepository.findOne(
      {
        where: { id },
        relations: ['httpUpstreams.node', 'accessRules', 'edgeRules'],
      },
      manager,
    );
  }

  async createHttpResource(params: HttpResourceType): Promise<HttpResource> {
    return this.httpResourceRepository.transaction<HttpResource>(
      async (manager) => {
        // Domain will be created automatically by the declarative handler's beforeCreate hook
        //   params.domain!,
        //   manager,
        // );

        const resource = await this.createDeclarativeResource(
          {
            externalId: '',
            ...params,
            httpUpstreams: params.httpUpstreams ?? [],
            accessRules: params.accessRules ?? [],
            edgeRules: params.edgeRules ?? [],
          },
          manager,
        );

        return this.getHttpResource(resource.id, manager);
      },
    );
  }

  async updateHttpResource(
    id: number,
    params: Partial<HttpResourceType>,
  ): Promise<HttpResource> {
    return this.httpResourceRepository.transaction<HttpResource>(
      async (manager) => {
        const current = await this.getHttpResource(id, manager);
        if (!current) throw new Error('HttpResource not found');

        if (params.domain && params.domain !== current.domain) {
          await this.domainsService.createDomainIfNotExists(
            params.domain,
            manager,
          );
        }

        const merged = this.mergePartialWithCurrent(current, params);
        await this.declarative.apply(id, merged, manager);

        return this.getHttpResource(id, manager);
      },
    );
  }

  async deleteHttpResource(
    id: number,
    manager?: EntityManager,
  ): Promise<string> {
    const httpResource = await this.getHttpResource(id, manager);
    if (!httpResource) {
      throw new Error('HttpResource not found');
    }

    await this.nginxHttpResource.remove(httpResource);

    await this.httpResourceRepository.delete(id, manager);
    return 'Deleted!';
  }

  // ═══════════════════════════════════════════════════════════════
  // Declarative API — StackReconciler (IaC)
  // ═══════════════════════════════════════════════════════════════

  async createDeclarativeResource(
    input: DeclarativeHttpResourceInput,
    manager?: EntityManager,
  ): Promise<HttpResource> {
    return this.declarative.create(input, manager);
  }

  async planDeclarativeResource(
    id: number,
    input: DeclarativeHttpResourceInput,
    manager?: EntityManager,
  ): Promise<DeclarativePlanResult> {
    return this.declarative.plan(id, input, manager);
  }

  async applyDeclarativeResource(
    id: number,
    input: DeclarativeHttpResourceInput,
    manager?: EntityManager,
  ): Promise<DeclarativePlanResult> {
    return this.declarative.apply(id, input, manager);
  }

  exportHttpResource(
    resource: HttpResource,
    nodeExtIdById: Map<number, string>,
    providerExtIdById: Map<number, string>,
  ): HttpResourceManifest {
    const providerRef = resource.oidcProviderId
      ? providerExtIdById.get(resource.oidcProviderId)
      : undefined;

    return {
      name: resource.name,
      externalId: resource.externalId!,
      domain: resource.domain,
      enabled: resource.enabled ?? true,
      ...(providerRef ? { providerRef } : {}),
      ...(resource.expiresAt
        ? { expiresAt: new Date(resource.expiresAt).toISOString() }
        : {}),

      upstreams: (resource.httpUpstreams ?? []).map((u) =>
        this.exportUpstream(u, nodeExtIdById),
      ),

      accessRules: (resource.accessRules ?? [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((r) => this.exportAccessRule(r)),

      edgeRules: (resource.edgeRules ?? [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((r) => this.exportEdgeRule(r)),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════════════════
  private exportUpstream(
    upstream: HttpUpstream,
    nodeExtIdById: Map<number, string>,
  ): HttpUpstreamManifest {
    const targetNodeRef = upstream.targetNodeId
      ? nodeExtIdById.get(upstream.targetNodeId)
      : undefined;

    return {
      type: upstream.type,
      pathPattern: upstream.pathPattern,
      ...(upstream.rewrite ? { rewrite: upstream.rewrite } : {}),
      targetProtocol: upstream.targetProtocol,
      ...(targetNodeRef
        ? { targetNodeRef }
        : upstream.targetHost
          ? { targetHost: upstream.targetHost }
          : {}),
      targetPort: upstream.targetPort,
      ...(upstream.targetSslVerify ? { targetSslVerify: true } : {}),
    };
  }

  private exportAccessRule(rule: HttpAccessRuleEntity): HttpAccessRuleManifest {
    const when: HttpAccessRuleManifest['when'] = {
      type: rule.matchType,
      pathPattern: rule.pattern,
      ...(rule.methods?.length ? { methods: rule.methods } : {}),
    };

    const action: HttpAccessRuleManifest['action'] = {
      type: `access.${rule.action}` as HttpAccessRuleManifest['action']['type'],
      // ...(rule.action === 'require_auth' && rule.onUnauthenticated
      //   ? { params: { onUnauthenticated: rule.onUnauthenticated } }
      //   : {}),
    };

    return {
      enabled: rule.enabled ?? true,
      order: rule.order,
      when,
      action,
      ...(rule.predicate ? { predicate: rule.predicate } : {}),
    };
  }

  private exportEdgeRule(rule: HttpEdgeRuleEntity): HttpEdgeRuleManifest {
    const when: HttpEdgeRuleManifest['when'] = {
      type: rule.matchType,
      pathPattern: rule.pattern,
      ...(rule.methods?.length ? { methods: rule.methods } : {}),
    };

    return {
      enabled: rule.enabled ?? true,
      order: rule.order,
      when,
      action: rule.action,
    };
  }

  private mergePartialWithCurrent(
    current: HttpResource,
    patch: Partial<HttpResourceType>,
  ): DeclarativeHttpResourceInput {
    const currentUpstreams: HttpUpstreamSpec[] = (
      current.httpUpstreams ?? []
    ).map((u) => ({
      id: u.id,
      type: u.type,
      pathPattern: u.pathPattern,
      rewrite: u.rewrite ?? undefined,
      targetProtocol: u.targetProtocol,
      targetHost: u.targetHost ?? undefined,
      targetPort: u.targetPort,
      targetSslVerify: u.targetSslVerify ?? undefined,
      targetNodeId: u.targetNodeId ?? undefined,
    }));

    const currentAccessRules: AccessRuleSpec[] = (
      current.accessRules ?? []
    ).map((r) => ({
      id: r.id,
      enabled: r.enabled ?? true,
      order: r.order ?? undefined,
      when: {
        type: r.matchType,
        pathPattern: r.pattern,
        methods: r.methods ?? null,
      },
      action: r.action,
      predicate: r.predicate ?? null,
      upstreamPathPattern:
        r.upstreamId != null ? String(r.upstreamId) : undefined,
    }));

    const currentEdgeRules: EdgeRuleSpec[] = (current.edgeRules ?? []).map(
      (r) => ({
        id: r.id,
        enabled: r.enabled ?? true,
        order: r.order ?? undefined,
        when: {
          type: r.matchType,
          pathPattern: r.pattern,
          methods: r.methods ?? null,
        },
        action: r.action,
        upstreamPathPattern:
          r.upstreamId != null ? String(r.upstreamId) : undefined,
      }),
    );

    return {
      externalId: current.externalId ?? '',
      name: patch.name ?? current.name,
      domain: patch.domain ?? current.domain,
      enabled: patch.enabled ?? current.enabled ?? true,
      expiresAt: patch.expiresAt ?? current.expiresAt,
      oidcProviderId: patch.oidcProviderId ?? current.oidcProviderId,
      httpUpstreams: patch.httpUpstreams ?? currentUpstreams,
      accessRules: patch.accessRules ?? currentAccessRules,
      edgeRules: patch.edgeRules ?? currentEdgeRules,
    };
  }
}
