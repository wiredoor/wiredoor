import { EntityManager } from 'typeorm';
import BaseRepository from '../../repositories/base-repository';
import {
  SubEntityReconciler,
  ReconcileCounters,
  ReconcileMode,
  ResolveContext,
} from './sub-entity-reconciler';

// Result

export type DeclarativePlanResult = {
  changed: boolean;
  resourceChanged: boolean;
  children: Record<string, ReconcileCounters>;
};

// Config object
//
// Instead of abstract methods, the service passes a config object
// when creating the handler. This avoids inheritance and lets
// the same service keep its imperative methods untouched.
//

export interface DeclarativeConfig<TInput, TEntity extends { id: number }> {
  /**
   * The repository for the parent entity.
   * Used for save, findOne, delete, and transaction.
   */
  repository: BaseRepository<TEntity>;

  /**
   * Load the parent entity by ID, including all relations
   * needed for reconciliation.
   */
  findById(id: number, manager?: EntityManager): Promise<TEntity>;

  /**
   * Build the save payload for creating a new parent entity.
   * Should NOT include child entities.
   */
  toCreatePayload(
    input: TInput,
    manager?: EntityManager,
  ): Partial<TEntity> | Promise<Partial<TEntity>>;

  /**
   * Build the save payload for updating an existing parent.
   */
  toUpdatePayload(
    input: TInput,
    existing: TEntity,
    manager?: EntityManager,
  ): Partial<TEntity> | Promise<Partial<TEntity>>;

  /**
   * Fingerprint from desired input (parent-level fields only).
   */
  fingerprintFromInput(input: TInput): string;

  /**
   * Fingerprint from an existing entity.
   */
  fingerprintFromEntity(entity: TEntity): string;

  /**
   * Ordered list of child reconcilers.
   * Order matters: earlier children are resolved first and
   * can be cross-referenced by later children.
   */
  children: Array<{
    reconciler: SubEntityReconciler<any, any>;
    getSpecs: (input: TInput) => any[];
  }>;

  /**
   * Optional: build extra context for cross-referencing.
   * Available to all child descriptors as context.extra.
   */
  buildContext?(
    input: TInput,
    manager?: EntityManager,
  ): Record<string, any> | Promise<Record<string, any>>;

  /**
   * Optional: called before creating a new parent entity.
   * Use for side effects (e.g. ensure domain exists).
   */
  beforeCreate?(input: TInput, manager?: EntityManager): Promise<void>;

  /**
   * Optional: called after all reconciliation completes.
   * Use for post-processing (e.g. regenerate nginx config).
   */
  afterReconcile?(
    mode: ReconcileMode,
    id: number,
    input: TInput,
    result: DeclarativePlanResult,
    manager?: EntityManager,
  ): Promise<void>;
}

// The handler
//
// Composable: inject into any service via the constructor.
// Does NOT extend or replace the service — sits alongside it.
//
// Usage in a service:
//
//   this.declarative = new DeclarativeHandler({ ... });
//
//   // Imperative (UI/API):
//   createHttpResource(params) { ... }
//
//   // Declarative (IaC):
//   createDeclarativeResource(input) {
//     return this.declarative.create(input);
//   }
//

export class DeclarativeHandler<
  TInput extends { externalId: string },
  TEntity extends { id: number; externalId?: string | null },
> {
  private readonly config: DeclarativeConfig<TInput, TEntity>;

  constructor(config: DeclarativeConfig<TInput, TEntity>) {
    this.config = config;
  }

  // Public API: the 3 methods the service delegates to

  /**
   * Create a new resource + reconcile all children.
   */
  async create(input: TInput, manager?: EntityManager): Promise<TEntity> {
    const run = async (em: EntityManager): Promise<TEntity> => {
      if (this.config.beforeCreate) {
        await this.config.beforeCreate(input, em);
      }

      const payload = await this.config.toCreatePayload(input, em);
      const entity = await this.config.repository.save(
        payload as Partial<TEntity>,
        em,
      );

      const result = await this.reconcileInternal(
        'apply',
        entity.id,
        input,
        em,
      );

      if (this.config.afterReconcile) {
        await this.config.afterReconcile('apply', entity.id, input, result, em);
      }

      return this.config.findById(entity.id, em);
    };

    if (manager) return run(manager);
    return this.config.repository.transaction(run);
  }

  /**
   * Dry-run: returns what would change without writing.
   */
  async plan(
    id: number,
    input: TInput,
    manager?: EntityManager,
  ): Promise<DeclarativePlanResult> {
    const run = (em: EntityManager) =>
      this.reconcileInternal('plan', id, input, em);

    if (manager) return run(manager);
    return this.config.repository.transaction(run);
  }

  /**
   * Apply desired state: update parent + reconcile children.
   */
  async apply(
    id: number,
    input: TInput,
    manager?: EntityManager,
  ): Promise<DeclarativePlanResult> {
    const run = async (em: EntityManager) => {
      const result = await this.reconcileInternal('apply', id, input, em);

      if (this.config.afterReconcile) {
        await this.config.afterReconcile('apply', id, input, result, em);
      }

      return result;
    };

    if (manager) return run(manager);
    return this.config.repository.transaction(run);
  }

  // Internal

  private async reconcileInternal(
    mode: ReconcileMode,
    id: number,
    input: TInput,
    manager: EntityManager,
  ): Promise<DeclarativePlanResult> {
    const entity = await this.config.findById(id, manager);

    if (!entity) {
      throw new Error(`Entity with id=${id} not found`);
    }

    // Parent change detection
    const resourceChanged =
      this.config.fingerprintFromEntity(entity) !==
      this.config.fingerprintFromInput(input);

    if (resourceChanged && mode === 'apply') {
      const payload = await this.config.toUpdatePayload(input, entity, manager);
      await this.config.repository.save(
        { ...payload, id } as Partial<TEntity>,
        manager,
      );
    }

    // Children reconciliation
    const extra = this.config.buildContext
      ? await this.config.buildContext(input, manager)
      : {};

    const context: ResolveContext = {
      resolved: new Map(),
      extra,
    };

    const children: Record<string, ReconcileCounters> = {};
    let anyChildChanged = false;

    for (const { reconciler, getSpecs } of this.config.children) {
      const specs = getSpecs(input);
      const counters = await reconciler.reconcile(
        mode,
        id,
        specs,
        context,
        manager,
      );

      children[reconciler.name] = counters;

      if (
        counters.created > 0 ||
        counters.updated > 0 ||
        counters.deleted > 0
      ) {
        anyChildChanged = true;
      }
    }

    return {
      changed: resourceChanged || anyChildChanged,
      resourceChanged,
      children,
    };
  }
}
