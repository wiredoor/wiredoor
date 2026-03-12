import { EntityManager } from 'typeorm';

import {
  EntityAction,
  PhaseEntityResult,
  PhaseError,
  PhaseResult,
  ReconcileCounters,
  ReconcileMode,
  RefContext,
  ResourcePhase,
} from './types';

import { stableStringify } from '../../utils/transformers';

/**
 * Base class that extracts the repetitive reconcile loop:
 *
 *   1. Load existing entities by externalId
 *   2. For each desired item: create / update / unchanged
 *   3. (Optionally) delete items not in desired set
 *
 * Subclasses only implement the abstract methods that are
 * specific to each resource type.
 */
export abstract class BaseResourcePhase<
  TManifest extends { externalId: string },
  TEntity extends { id: number; externalId?: string | null },
> implements ResourcePhase<TManifest> {
  abstract readonly phaseId: string;
  abstract readonly dependsOn: string[];

  abstract extract(manifest: Record<string, unknown>): TManifest[];

  // Override points

  /** Load all existing entities whose externalId is in the list */
  protected abstract findExisting(
    externalIds: string[],
    manager: EntityManager,
  ): Promise<TEntity[]>;

  /** Create a new entity from the manifest spec */
  protected abstract create(
    spec: TManifest,
    refs: RefContext,
    manager: EntityManager,
  ): Promise<TEntity>;

  /** Update an existing entity to match the manifest spec */
  protected abstract update(
    existing: TEntity,
    spec: TManifest,
    refs: RefContext,
    manager: EntityManager,
  ): Promise<TEntity>;

  /** Compute a stable fingerprint from a manifest item */
  protected abstract fingerprintFromSpec(spec: TManifest): string;

  /** Compute a stable fingerprint from an existing entity */
  protected abstract fingerprintFromEntity(entity: TEntity): string;

  /**
   * Optional: produce child reconcile counters for complex resources.
   * Override in phases like HttpResourcePhase that have sub-entities.
   */
  protected async reconcileChildren(
    _mode: ReconcileMode,
    _existing: TEntity | null,
    _spec: TManifest,
    _refs: RefContext,
    _manager: EntityManager,
  ): Promise<Record<string, ReconcileCounters>> {
    void [_mode, _existing, _spec, _refs, _manager];
    return {};
  }

  /** Optional: validate refs before reconciliation */
  validateRefs?(
    items: TManifest[],
    manifest: Record<string, unknown>,
  ): PhaseError[];

  // The reconcile loop (final - don't override)

  async reconcile(
    mode: ReconcileMode,
    items: TManifest[],
    refs: RefContext,
    manager: EntityManager,
  ): Promise<PhaseResult> {
    const entities: PhaseEntityResult[] = [];
    const errors: PhaseError[] = [];

    const existing = await this.findExisting(
      items.map((i) => i.externalId),
      manager,
    );

    const byExtId = new Map<string, TEntity>();
    for (const entity of existing) {
      if (entity.externalId) {
        byExtId.set(entity.externalId, entity);
      }
    }

    for (const spec of items) {
      try {
        const current = byExtId.get(spec.externalId);
        let action: EntityAction;

        if (!current) {
          // CREATE
          action = 'create';

          if (mode === 'apply') {
            const created = await this.create(spec, refs, manager);
            refs.set(this.phaseId, spec.externalId, created.id);
          } else {
            refs.set(this.phaseId, spec.externalId, 0);
          }

          const children = await this.reconcileChildren(
            mode,
            null,
            spec,
            refs,
            manager,
          );

          entities.push({ externalId: spec.externalId, action, children });
          continue;
        }

        // Populate refs even for unchanged entities
        refs.set(this.phaseId, spec.externalId, current.id);

        const specFp = this.fingerprintFromSpec(spec);
        const entityFp = this.fingerprintFromEntity(current);

        if (specFp !== entityFp) {
          console.log(`[${this.phaseId}] ${spec.externalId} MISMATCH:`);
          console.log('  spec:  ', specFp);
          console.log('  entity:', entityFp);
        }

        if (specFp === entityFp) {
          // UNCHANGED (but still reconcile children)
          const children = await this.reconcileChildren(
            mode,
            current,
            spec,
            refs,
            manager,
          );

          const childrenChanged = children
            ? Object.values(children).some(
                (c) => c.created > 0 || c.updated > 0 || c.deleted > 0,
              )
            : false;

          action = childrenChanged ? 'update' : 'unchanged';
          entities.push({ externalId: spec.externalId, action, children });
          continue;
        }

        // UPDATE
        action = 'update';

        if (mode === 'apply') {
          await this.update(current, spec, refs, manager);
        }

        const children = await this.reconcileChildren(
          mode,
          current,
          spec,
          refs,
          manager,
        );

        entities.push({ externalId: spec.externalId, action, children });
      } catch (err: any) {
        errors.push({
          externalId: spec.externalId,
          message: err.message ?? String(err),
        });
      }
    }

    return { phaseId: this.phaseId, entities, errors };
  }

  // Utility

  protected fingerprint(obj: Record<string, unknown>): string {
    return stableStringify(obj);
  }
}
