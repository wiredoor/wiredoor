import { Service } from 'typedi';
import { EntityManager, In } from 'typeorm';

import { BaseResourcePhase } from '../../core/reconciler/base-resource-phase';
import { RefContext } from '../../core/reconciler/types';
import {
  StructuralValidator,
  SemanticValidator,
  ValidationResult,
} from '../../core/reconciler/validation';
import { checkDuplicateNames } from '../../core/reconciler/validation-helpers';

import { NodeRepository } from '../../repositories/node-repository';
import type { CreateNodeType } from '../../schemas/node-schemas';
import { NodeManifest } from '../../schemas/iac-schemas';
import { NodesService } from '../../services/nodes-service';
import { Node } from '../../database/models/node';

@Service()
export class NodePhase
  extends BaseResourcePhase<NodeManifest, Node>
  implements StructuralValidator<NodeManifest>, SemanticValidator<NodeManifest>
{
  readonly phaseId = 'node';
  readonly dependsOn: string[] = [];

  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly nodeService: NodesService,
  ) {
    super();
  }

  extract(manifest: Record<string, unknown>): NodeManifest[] {
    return (manifest.nodes as NodeManifest[]) ?? [];
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 1: STRUCTURAL
  // ═══════════════════════════════════════════════════════════════

  validateStructure(items: NodeManifest[], result: ValidationResult): void {
    for (const [i, node] of items.entries()) {
      const prefix = `nodes[${i}]`;

      if (!node.name || node.name.trim().length === 0) {
        result.error('node', `${prefix}.name`, 'REQUIRED', 'name is required');
      }

      if (!node.name || node.name.trim().length === 0) {
        result.error('node', `${prefix}.name`, 'REQUIRED', 'name is required');
      } else if (!/^[a-zA-Z0-9._-]+$/.test(node.name)) {
        result.error(
          'node',
          `${prefix}.name`,
          'INVALID_FORMAT',
          'name must match [a-zA-Z0-9._-]+',
        );
      }

      if (
        node.keepalive !== undefined &&
        (node.keepalive < 0 || node.keepalive > 120)
      ) {
        result.error(
          'node',
          `${prefix}.keepalive`,
          'OUT_OF_RANGE',
          'keepalive must be between 0 and 120',
        );
      }

      if (
        node.isGateway &&
        (!node.gatewayNetworks || node.gatewayNetworks.length === 0)
      ) {
        result.error(
          'node',
          `${prefix}.gatewayNetworks`,
          'REQUIRED_FOR_GATEWAY',
          'gatewayNetworks is required when isGateway is true',
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Level 2: SEMANTIC
  // ═══════════════════════════════════════════════════════════════

  validateSemantics(
    items: NodeManifest[],
    _manifest: Record<string, unknown>,
    result: ValidationResult,
  ): void {
    checkDuplicateNames(items, 'node', 'nodes', result);

    // Check duplicate names
    const seenNames = new Map<string, number>();
    for (const [i, node] of items.entries()) {
      const prev = seenNames.get(node.name);
      if (prev !== undefined) {
        result.error(
          'node',
          `nodes[${i}].name`,
          'DUPLICATE_NAME',
          `Node name "${node.name}" is already used at nodes[${prev}]`,
        );
      } else {
        seenNames.set(node.name, i);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  protected async findExisting(
    names: string[],
    manager: EntityManager,
  ): Promise<Node[]> {
    return this.nodeRepository.findBy({ name: In(names) }, manager) as Promise<
      Node[]
    >;
  }

  protected async create(
    spec: NodeManifest,
    _refs: RefContext,
    manager: EntityManager,
  ): Promise<Node> {
    return this.nodeService.createNode(
      this.toCreateParams(spec),
      manager,
    ) as Promise<Node>;
  }

  protected async update(
    existing: Node,
    spec: NodeManifest,
    _refs: RefContext,
    manager: EntityManager,
  ): Promise<Node> {
    return this.nodeService.updateNode(
      existing.id,
      this.toCreateParams(spec),
      manager,
    ) as Promise<Node>;
  }

  protected fingerprintFromSpec(spec: NodeManifest): string {
    return this.fingerprint({
      name: spec.name,
      dns: spec.dns ?? null,
      keepalive: spec.keepalive ?? 25,
      allowInternet: spec.allowInternet ?? false,
      advanced: spec.advanced ?? false,
      enabled: spec.enabled ?? true,
      isGateway: spec.isGateway ?? false,
      gatewayNetworks: spec.gatewayNetworks ?? [],
    });
  }

  protected fingerprintFromEntity(entity: Node): string {
    return this.fingerprint({
      name: entity.name,
      dns: entity.dns ?? null,
      keepalive: entity.keepalive ?? 25,
      allowInternet: entity.allowInternet ?? false,
      advanced: entity.advanced ?? false,
      enabled: entity.enabled ?? true,
      isGateway: entity.isGateway ?? false,
      gatewayNetworks: entity.gatewayNetworks ?? [],
    });
  }

  // ─── Mapping ──────────────────────────────────────────────────

  private toCreateParams(spec: NodeManifest): CreateNodeType {
    return {
      name: spec.name,
      dns: spec.dns,
      keepalive: spec.keepalive ?? 25,
      address: spec.address ?? undefined,
      allowInternet: spec.allowInternet ?? false,
      advanced: spec.advanced ?? false,
      enabled: spec.enabled ?? true,
      gatewayNetworks: spec.gatewayNetworks ?? [],
      isGateway: spec.isGateway ?? false,
    };
  }
}
