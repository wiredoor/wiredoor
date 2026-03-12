import Container, { Service } from 'typedi';
import { EntityManager, In } from 'typeorm';

import { StackReconciler } from '../core/reconciler/stack-reconciler';
import type { StackReconcileResult } from '../core/reconciler/stack-reconciler';
import type { ReconcileMode } from '../core/reconciler/types';
import { ValidationJsonResult } from '../core/reconciler/validation';

import { HttpResourceRepository } from '../repositories/http-resource-repository';
import {
  HttpResourceManifest,
  HttpUpstreamManifest,
  NodeScopedManifest,
  nodeScopedManifestValidator,
  StackManifest,
} from '../schemas/iac-schemas';
import { StackIaCService } from './stack-iac-service';

// The authenticated node context

export type NodeContext = {
  id: number;
  externalId: string;
  name: string;
};

// Service

@Service()
export class NodeIacService {
  constructor(
    private readonly reconciler: StackReconciler,
    private readonly httpResourceRepository: HttpResourceRepository,
  ) {}

  async ensureExternalIds(): Promise<void> {
    await Container.get(StackIaCService).ensureExternalIds();
  }

  async export(node: NodeContext): Promise<NodeScopedManifest> {
    const fullManifest = await Container.get(StackIaCService).export();

    const nodeScoped = {
      apiVersion: 'wiredoor.io/v1alpha1' as const,
      kind: 'NodeConfig' as const,
      http: (fullManifest.http ?? [])
        .filter((resource) => {
          // Include resources where ALL upstreams point to this node
          return resource.upstreams.every(
            (u) => u.targetNodeRef === node.externalId,
          );
        })
        .map((resource) => ({
          ...resource,
          // Strip targetNodeRef from upstreams (it's implicit)
          upstreams: resource.upstreams.map((u) => {
            const { targetNodeRef, ...rest } = u;
            void targetNodeRef;
            return rest;
          }),
          // Strip providerRef if it's just a reference
          // Keep it so the user knows which provider is configured
        })),
    };

    // Filter the full manifest to only include resources owned by this node
    return nodeScoped;
  }

  /**
   * Validate a node-scoped manifest.
   */
  async validate(
    manifest: NodeScopedManifest,
    node: NodeContext,
  ): Promise<ValidationJsonResult> {
    const fullManifest = await this.toStackManifest(manifest, node);
    return this.reconciler.validate(fullManifest);
  }

  /**
   * Plan or apply a node-scoped manifest.
   */
  async reconcile(
    manifest: NodeScopedManifest,
    node: NodeContext,
    mode: ReconcileMode,
  ): Promise<StackReconcileResult> {
    const fullManifest = await this.toStackManifest(manifest, node);
    return this.reconciler.reconcile(fullManifest, mode);
  }

  /**
   * Parse and validate the raw input.
   */
  parseAndValidate(raw: unknown): NodeScopedManifest {
    const { error, value } = nodeScopedManifestValidator.validate(raw, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      const details = error.details.map((d) => ({
        path: d.path.join('.'),
        message: d.message,
      }));

      const err: any = new Error('Manifest validation failed');
      err.status = 422;
      err.details = details;
      throw err;
    }

    return value!;
  }

  /**
   * Verify that all HTTP resources in the manifest belong to this node.
   * Prevents a node from modifying resources owned by other nodes.
   */
  async verifyOwnership(
    manifest: NodeScopedManifest,
    node: NodeContext,
    manager?: EntityManager,
  ): Promise<string[]> {
    const errors: string[] = [];

    const externalIds = (manifest.http ?? []).map((h) => h.externalId);
    if (externalIds.length === 0) return errors;

    const existing = await this.httpResourceRepository.findBy(
      { externalId: In(externalIds) },
      manager,
    );

    for (const resource of existing) {
      // Check that all upstreams of this resource point to this node
      const upstreams = resource.httpUpstreams ?? [];
      const foreignUpstream = upstreams.find(
        (u) => u.targetNodeId && u.targetNodeId !== node.id,
      );

      if (foreignUpstream) {
        errors.push(
          `Resource "${resource.externalId}" has upstreams pointing to ` +
            `a different node. Nodes can only manage their own resources.`,
        );
      }
    }

    return errors;
  }

  // Convert NodeConfig → Stack manifest

  private async toStackManifest(
    manifest: NodeScopedManifest,
    node: NodeContext,
  ): Promise<StackManifest> {
    return {
      apiVersion: 'wiredoor.io/v1alpha1',
      kind: 'Stack',

      // The node already exists — include it as a reference so the
      // reconciler can resolve targetNodeRef
      nodes: [
        {
          name: node.name,
          externalId: node.externalId,
        },
      ],

      // No providers section — nodes can reference existing providers
      // but cannot create or modify them
      auth: { providers: [] },

      // Map node-scoped resources → full resources with implicit targetNodeRef
      http: (manifest.http ?? []).map((resource) =>
        this.mapHttpResource(resource, node),
      ),
    };
  }

  private mapHttpResource(
    resource: HttpResourceManifest,
    node: NodeContext,
  ): HttpResourceManifest {
    return {
      name: resource.name,
      externalId: resource.externalId,
      domain: resource.domain,
      enabled: resource.enabled,
      providerRef: resource.providerRef,
      expiresAt: resource.expiresAt,

      upstreams: resource.upstreams.map(
        (upstream): HttpUpstreamManifest => ({
          type: upstream.type,
          pathPattern: upstream.pathPattern,
          rewrite: upstream.rewrite,
          targetProtocol: upstream.targetProtocol,
          targetHost: upstream.targetHost,
          targetNodeRef: node.externalId,
          targetPort: upstream.targetPort,
          targetSslVerify: upstream.targetSslVerify,
        }),
      ),

      accessRules: resource.accessRules,
      edgeRules: resource.edgeRules,
    };
  }
}
