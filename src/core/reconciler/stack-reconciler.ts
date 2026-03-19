import { Inject, Service } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';

import {
  ReconcileMode,
  RefContext,
  ResourcePhase,
  PhaseResult,
  PhaseError,
} from './types';

import {
  ValidationResult,
  hasStructuralValidator,
  hasSemanticValidator,
  hasRuntimeValidator,
  ValidationIssue,
} from './validation';

// Orchestrator result

export type StackReconcileResult = {
  mode: ReconcileMode;
  changed: boolean;
  phases: PhaseResult[];
  validation: {
    errors: ReturnType<ValidationResult['errors']['map']>;
    warnings: ReturnType<ValidationResult['warnings']['map']>;
  };
  errors: PhaseError[];
};

// Registry + Orchestrator

@Service()
export class StackReconciler {
  private phases: ResourcePhase[] = [];

  constructor(@Inject('dataSource') private readonly dataSource: DataSource) {}

  register(phase: ResourcePhase): this {
    if (this.phases.some((p) => p.phaseId === phase.phaseId)) {
      throw new Error(`Phase "${phase.phaseId}" is already registered`);
    }

    this.phases.push(phase);
    return this;
  }

  /**
   * Validate-only mode. Runs all 3 levels without writing anything.
   * Useful for CI/CD dry-runs:
   *
   *   POST /api/stacks/validate
   */
  async validate(manifest: Record<string, unknown>): Promise<{
    hasErrors: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    valid: boolean;
  }> {
    const sorted = this.topologicalSort();
    const extracted = this.extractAll(sorted, manifest);
    const result = new ValidationResult();

    // Level 1: Structural
    this.runStructuralValidation(sorted, extracted, result);
    if (result.hasErrors) return result.getJson();

    // Level 2: Semantic
    this.runSemanticValidation(sorted, extracted, manifest, result);
    if (result.hasErrors) return result.getJson();

    // Level 3: Runtime (read-only transaction)
    await this.dataSource.transaction(async (manager) => {
      await this.runRuntimeValidation(sorted, extracted, manager, result);
    });

    return result.getJson();
  }

  /**
   * Full reconcile: validate → plan/apply.
   * Stops immediately if any validation level fails.
   */
  async reconcile(
    manifest: Record<string, unknown>,
    mode: ReconcileMode,
  ): Promise<StackReconcileResult> {
    const sorted = this.topologicalSort();
    const extracted = this.extractAll(sorted, manifest);

    return this.dataSource.transaction<StackReconcileResult>(
      async (manager) => {
        const validation = new ValidationResult();

        // Level 1: Structural
        this.runStructuralValidation(sorted, extracted, validation);
        if (validation.hasErrors) {
          return this.abortResult(mode, validation);
        }

        // Level 2: Semantic
        this.runSemanticValidation(sorted, extracted, manifest, validation);
        if (validation.hasErrors) {
          return this.abortResult(mode, validation);
        }

        // Level 3: Runtime
        await this.runRuntimeValidation(sorted, extracted, manager, validation);
        if (validation.hasErrors) {
          return this.abortResult(mode, validation);
        }

        // All validations passed → reconcile
        const refs = new RefContext();
        const results: PhaseResult[] = [];
        const errors: PhaseError[] = [];

        for (const phase of sorted) {
          const items = extracted.get(phase.phaseId) ?? [];

          if (items.length === 0) {
            results.push({
              phaseId: phase.phaseId,
              entities: [],
              errors: [],
            });
            continue;
          }

          const result = await phase.reconcile(mode, items, refs, manager);
          results.push(result);
          errors.push(
            ...result.errors.map((e) => ({
              ...e,
              name: `[${phase.phaseId}] ${e.name}`,
            })),
          );
        }

        const changed = results.some((r) =>
          r.entities.some((e) => e.action !== 'unchanged'),
        );

        return {
          mode,
          changed,
          phases: results,
          validation: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
          errors,
        };
      },
    );
  }

  // Validation pipeline

  private runStructuralValidation(
    sorted: ResourcePhase[],
    extracted: Map<string, unknown[]>,
    result: ValidationResult,
  ): void {
    for (const phase of sorted) {
      if (!hasStructuralValidator(phase)) continue;

      const items = extracted.get(phase.phaseId) ?? [];
      if (items.length === 0) continue;

      phase.validateStructure(items, result);
    }
  }

  private runSemanticValidation(
    sorted: ResourcePhase[],
    extracted: Map<string, unknown[]>,
    manifest: Record<string, unknown>,
    result: ValidationResult,
  ): void {
    for (const phase of sorted) {
      if (!hasSemanticValidator(phase)) continue;

      const items = extracted.get(phase.phaseId) ?? [];
      if (items.length === 0) continue;

      phase.validateSemantics(items, manifest, result);
    }
  }

  private async runRuntimeValidation(
    sorted: ResourcePhase[],
    extracted: Map<string, unknown[]>,
    manager: EntityManager,
    result: ValidationResult,
  ): Promise<void> {
    const refs = new RefContext();

    for (const phase of sorted) {
      if (!hasRuntimeValidator(phase)) continue;

      const items = extracted.get(phase.phaseId) ?? [];
      if (items.length === 0) continue;

      await phase.validateRuntime(items, refs, manager, result);

      // Stop on first phase with runtime errors — later phases
      // may depend on refs from this one.
      if (result.hasErrors) return;
    }
  }

  // Helpers

  private extractAll(
    sorted: ResourcePhase[],
    manifest: Record<string, unknown>,
  ): Map<string, unknown[]> {
    const extracted = new Map<string, unknown[]>();

    for (const phase of sorted) {
      extracted.set(phase.phaseId, phase.extract(manifest));
    }

    return extracted;
  }

  private abortResult(
    mode: ReconcileMode,
    validation: ValidationResult,
  ): StackReconcileResult {
    return {
      mode,
      changed: false,
      phases: [],
      validation: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
      errors: [],
    };
  }

  // Topological sort

  private topologicalSort(): ResourcePhase[] {
    const phaseMap = new Map(this.phases.map((p) => [p.phaseId, p]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const phase of this.phases) {
      if (!inDegree.has(phase.phaseId)) inDegree.set(phase.phaseId, 0);
      if (!adjacency.has(phase.phaseId)) adjacency.set(phase.phaseId, []);

      for (const dep of phase.dependsOn) {
        if (!phaseMap.has(dep)) {
          throw new Error(
            `Phase "${phase.phaseId}" depends on "${dep}" which is not registered`,
          );
        }
        adjacency.get(dep)!.push(phase.phaseId);
        inDegree.set(phase.phaseId, (inDegree.get(phase.phaseId) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: ResourcePhase[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(phaseMap.get(id)!);

      for (const neighbor of adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== this.phases.length) {
      throw new Error('Circular dependency detected between reconciler phases');
    }

    return sorted;
  }
}
