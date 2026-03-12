import { EntityManager } from 'typeorm';
import { RefContext } from './types';

// ─── Severity ───────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

// ─── A single validation issue ──────────────────────────────────

export type ValidationIssue = {
  phase: string;
  severity: ValidationSeverity;
  path: string; // e.g. "http[0].upstreams[1].targetPort"
  code: string; // machine-readable, e.g. "DUPLICATE_EXTERNAL_ID"
  message: string; // human-readable
};

export type ValidationJsonResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  hasErrors: boolean;
};

// ─── Collected result ───────────────────────────────────────────

export class ValidationResult {
  readonly issues: ValidationIssue[] = [];

  add(issue: ValidationIssue): void {
    this.issues.push(issue);
  }

  error(phase: string, path: string, code: string, message: string): void {
    this.issues.push({ phase, severity: 'error', path, code, message });
  }

  warn(phase: string, path: string, code: string, message: string): void {
    this.issues.push({ phase, severity: 'warning', path, code, message });
  }

  get errors(): ValidationIssue[] {
    return this.issues.filter((i) => i.severity === 'error');
  }

  get warnings(): ValidationIssue[] {
    return this.issues.filter((i) => i.severity === 'warning');
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  get valid(): boolean {
    return !this.hasErrors;
  }

  getJson(): ValidationJsonResult {
    return {
      valid: this.valid,
      errors: this.errors,
      warnings: this.warnings,
      hasErrors: this.hasErrors,
    };
  }
}

// ─── Validation levels ──────────────────────────────────────────
//
// Each level is an interface a phase can optionally implement.
// The orchestrator calls them in order:
//
//   1. structural  →  runs without DB, pure data shape
//   2. semantic    →  runs without DB, cross-ref logic
//   3. runtime     →  runs with DB/network, async checks
//

/**
 * Level 1: Structural validation.
 *
 * Validates the raw extracted data against a schema (Joi, Zod, etc.).
 * No DB access, no cross-phase refs needed.
 *
 * Runs FIRST and independently per phase.
 */
export interface StructuralValidator<TManifest = unknown> {
  validateStructure(items: TManifest[], result: ValidationResult): void;
}

/**
 * Level 2: Semantic validation.
 *
 * Validates business rules and cross-references within the manifest.
 * Has access to the full manifest (to check refs across phases)
 * but does NOT hit the DB.
 *
 * Runs AFTER all structural validations pass.
 */
export interface SemanticValidator<TManifest = unknown> {
  validateSemantics(
    items: TManifest[],
    manifest: Record<string, unknown>,
    result: ValidationResult,
  ): void;
}

/**
 * Level 3: Runtime validation.
 *
 * Validates things that require I/O: DB lookups, DNS resolution,
 * port reachability, HTTP health checks, OIDC discovery, etc.
 *
 * Runs AFTER semantic validation passes and inside the transaction.
 * Has access to the DB (EntityManager) and resolved refs from
 * previous phases.
 */
export interface RuntimeValidator<TManifest = unknown> {
  validateRuntime(
    items: TManifest[],
    refs: RefContext,
    manager: EntityManager,
    result: ValidationResult,
  ): Promise<void>;
}

// ─── Type guard helpers ─────────────────────────────────────────

export function hasStructuralValidator(
  phase: unknown,
): phase is StructuralValidator {
  return (
    typeof phase === 'object' &&
    phase !== null &&
    'validateStructure' in phase &&
    typeof (phase as any).validateStructure === 'function'
  );
}

export function hasSemanticValidator(
  phase: unknown,
): phase is SemanticValidator {
  return (
    typeof phase === 'object' &&
    phase !== null &&
    'validateSemantics' in phase &&
    typeof (phase as any).validateSemantics === 'function'
  );
}

export function hasRuntimeValidator(phase: unknown): phase is RuntimeValidator {
  return (
    typeof phase === 'object' &&
    phase !== null &&
    'validateRuntime' in phase &&
    typeof (phase as any).validateRuntime === 'function'
  );
}
