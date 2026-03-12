import { EntityManager } from 'typeorm';

export type ReconcileCounters = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
};

export type ReconcileMode = 'plan' | 'apply';

export type ResolveContext = {
  /**
   * Key = descriptor name (e.g. 'upstreams')
   * Value = Map<naturalKey, savedEntity>
   *
   * Populated by each reconciler after create/match.
   */
  resolved: Map<string, Map<string, any>>;

  /**
   * Arbitrary data the service passes down.
   * e.g. { nodeIdByRef: Map<string, number> }
   */
  extra: Record<string, any>;
};

// Sub-entity descriptor
//
// A plain object that describes how to reconcile one child
// collection. No classes, no inheritance - just data + functions.
//
// Uses the same (entity, manager?) signature as BaseRepository.
//

export interface SubEntityDescriptor<TSpec, TEntity extends { id: number }> {
  /**
   * Human-readable name. Used as the key in ReconcileCounters
   * and in ResolveContext.resolved.
   */
  readonly name: string;

  /**
   * Load all existing children for a parent.
   * Typically: repository.find({ where: { parentId } }, manager)
   */
  findByParentId(parentId: number, manager?: EntityManager): Promise<TEntity[]>;

  /**
   * Save (insert or update) an entity.
   * Typically: repository.save(payload, manager)
   */
  save(payload: Partial<TEntity>, manager?: EntityManager): Promise<TEntity>;

  /**
   * Delete by primary key.
   * Typically: repository.delete(id, manager)
   */
  deleteById(id: number, manager?: EntityManager): Promise<void>;

  /**
   * Natural key from the desired spec.
   * Used to match incoming specs to existing DB rows.
   *
   * e.g. for upstreams: `${spec.type}|${spec.pathPattern}`
   */
  naturalKeyFromSpec(spec: TSpec): string;

  /**
   * Natural key from an existing entity.
   * Must produce the same format as naturalKeyFromSpec.
   */
  naturalKeyFromEntity(entity: TEntity): string;

  /**
   * Stable fingerprint from a spec. All fields that matter
   * for equality should be included.
   */
  fingerprintFromSpec(spec: TSpec, context: ResolveContext): string;

  /**
   * Stable fingerprint from an existing entity.
   */
  fingerprintFromEntity(entity: TEntity): string;

  /**
   * Build the payload for creating a new entity.
   * Must include the parentId foreign key.
   */
  toCreatePayload(
    spec: TSpec,
    parentId: number,
    context: ResolveContext,
  ): Partial<TEntity>;

  /**
   * Build the payload for updating an existing entity.
   * Must include the existing entity's id.
   */
  toUpdatePayload(
    spec: TSpec,
    existing: TEntity,
    parentId: number,
    context: ResolveContext,
  ): Partial<TEntity>;
}

// ─── The reconciler ─────────────────────────────────────────────

export class SubEntityReconciler<TSpec, TEntity extends { id: number }> {
  constructor(
    private readonly descriptor: SubEntityDescriptor<TSpec, TEntity>,
  ) {}

  get name(): string {
    return this.descriptor.name;
  }

  async reconcile(
    mode: ReconcileMode,
    parentId: number,
    desiredSpecs: TSpec[],
    context: ResolveContext,
    manager?: EntityManager,
  ): Promise<ReconcileCounters> {
    const counters: ReconcileCounters = {
      created: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
    };

    const existing = await this.descriptor.findByParentId(parentId, manager);

    // Index existing by natural key
    const byKey = new Map<string, TEntity>();
    for (const entity of existing) {
      byKey.set(this.descriptor.naturalKeyFromEntity(entity), entity);
    }

    const keepIds = new Set<number>();
    const resolvedForThis = new Map<string, TEntity>();

    for (const spec of desiredSpecs) {
      const key = this.descriptor.naturalKeyFromSpec(spec);
      const current = byKey.get(key);

      if (!current) {
        // CREATE
        counters.created++;

        if (mode === 'apply') {
          const payload = this.descriptor.toCreatePayload(
            spec,
            parentId,
            context,
          );
          const saved = await this.descriptor.save(payload, manager);
          keepIds.add(saved.id);
          resolvedForThis.set(key, saved);
        }

        continue;
      }

      keepIds.add(current.id);
      resolvedForThis.set(key, current);

      const currentFp = this.descriptor.fingerprintFromEntity(current);
      const desiredFp = this.descriptor.fingerprintFromSpec(spec, context);

      if (currentFp === desiredFp) {
        counters.unchanged++;
        continue;
      }

      // UPDATE
      counters.updated++;

      if (mode === 'apply') {
        const payload = this.descriptor.toUpdatePayload(
          spec,
          current,
          parentId,
          context,
        );
        await this.descriptor.save(payload, manager);
      }
    }

    // DELETE orphans
    for (const entity of existing) {
      if (!keepIds.has(entity.id)) {
        counters.deleted++;

        if (mode === 'apply') {
          await this.descriptor.deleteById(entity.id, manager);
        }
      }
    }

    // Store resolved entities for cross-referencing by later descriptors
    context.resolved.set(this.descriptor.name, resolvedForThis);

    return counters;
  }
}
