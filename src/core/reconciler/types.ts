import { EntityManager } from 'typeorm';

// ─── Shared ref context ─────────────────────────────────────────
//
// Each phase reads refs it depends on and writes refs it provides.
// This is a simple string→number map keyed by "phaseId:externalId".
//
// Example:
//   refs.set('node', 'node1', 42)   → node phase resolved "node1" to DB id 42
//   refs.get('node', 'node1')       → 42
//
export class RefContext {
  private store = new Map<string, number>();

  set(phase: string, externalId: string, id: number): void {
    this.store.set(`${phase}:${externalId}`, id);
  }

  get(phase: string, externalId: string): number | undefined {
    return this.store.get(`${phase}:${externalId}`);
  }

  require(phase: string, externalId: string, label?: string): number {
    const id = this.get(phase, externalId);

    if (id == null) {
      throw new Error(
        `Unresolved ref: ${label ?? externalId} ` +
          `(phase="${phase}", externalId="${externalId}") not found. ` +
          `Ensure it is declared in the manifest or already exists.`,
      );
    }

    return id;
  }

  /** Returns all resolved IDs for a given phase */
  allForPhase(phase: string): Map<string, number> {
    const result = new Map<string, number>();
    const prefix = `${phase}:`;

    for (const [key, id] of this.store) {
      if (key.startsWith(prefix)) {
        result.set(key.slice(prefix.length), id);
      }
    }

    return result;
  }
}

// ─── Phase result types ─────────────────────────────────────────

export type EntityAction = 'create' | 'update' | 'delete' | 'unchanged';

export type ReconcileCounters = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
};

export type PhaseEntityResult = {
  externalId: string;
  action: EntityAction;
  /** Phases can attach arbitrary sub-counters (upstreams, rules, etc.) */
  children?: Record<string, ReconcileCounters>;
};

export type PhaseResult = {
  phaseId: string;
  entities: PhaseEntityResult[];
  errors: PhaseError[];
};

export type PhaseError = {
  externalId: string;
  message: string;
};

// ─── The contract every resource reconciler implements ───────────

export type ReconcileMode = 'plan' | 'apply';

export interface ResourcePhase<TManifest = unknown> {
  /**
   * Unique ID for this phase. Used as the key in RefContext
   * and for dependency resolution.
   *   e.g. 'node', 'provider', 'http', 'tcp', 'certificate'
   */
  readonly phaseId: string;

  /**
   * Which other phases must run before this one.
   *   e.g. ['node', 'provider'] for http resources
   */
  readonly dependsOn: string[];

  /**
   * Extract this phase's slice from the full manifest.
   * Returns an empty array if the section doesn't exist.
   */
  extract(manifest: Record<string, unknown>): TManifest[];

  /**
   * Validate cross-references within the extracted slice.
   * Called before any reconciliation starts, so all phases
   * can validate upfront.
   */
  validateRefs?(
    items: TManifest[],
    manifest: Record<string, unknown>,
  ): PhaseError[];

  /**
   * Reconcile the desired state against the current DB state.
   * Must populate refs for any entities it creates/finds.
   */
  reconcile(
    mode: ReconcileMode,
    items: TManifest[],
    refs: RefContext,
    manager: EntityManager,
  ): Promise<PhaseResult>;
}
