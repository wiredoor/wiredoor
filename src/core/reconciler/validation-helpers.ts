import { Schema } from 'joi';
import { ValidationResult } from './validation';

// ─── Joi schema runner ──────────────────────────────────────────
//
// Wraps Joi validation and feeds errors into the ValidationResult
// so phases don't have to deal with Joi's error format directly.
//

export function validateWithJoi<T>(
  items: T[],
  schema: Schema,
  phase: string,
  pathPrefix: string,
  result: ValidationResult,
): void {
  for (const [i, item] of items.entries()) {
    const { error } = schema.validate(item, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (!error) continue;

    for (const detail of error.details) {
      result.error(
        phase,
        `${pathPrefix}[${i}].${detail.path.join('.')}`,
        detail.type,
        detail.message,
      );
    }
  }
}

// Duplicate name checker

export function checkDuplicateNames<T extends { name: string }>(
  items: T[],
  phase: string,
  pathPrefix: string,
  result: ValidationResult,
): void {
  const seen = new Map<string, number>();

  for (const [i, item] of items.entries()) {
    const prev = seen.get(item.name);

    if (prev !== undefined) {
      result.error(
        phase,
        `${pathPrefix}[${i}].name`,
        'DUPLICATE_NAME',
        `Duplicate name "${item.name}" (first seen at ${pathPrefix}[${prev}])`,
      );
    } else {
      seen.set(item.name, i);
    }
  }
}

// Cross-reference checker
//
// Verifies that a field on each item references a name
// that exists in another section of the manifest.
//

export function checkRefsExist<T>(opts: {
  items: T[];
  phase: string;
  pathPrefix: string;
  /** Function that extracts the ref value from an item (e.g. item.providerRef) */
  getRef: (item: T, index: number) => string | number | undefined | null;
  /** Path suffix for the error (e.g. "providerRef") */
  refField: string;
  /** Set of valid names to check against */
  validIds: Set<string | number | unknown>;
  /** Human label for error messages (e.g. "auth provider") */
  targetLabel: string;
  result: ValidationResult;
}): void {
  for (const [i, item] of opts.items.entries()) {
    const ref = opts.getRef(item, i);

    if (ref && !opts.validIds.has(ref)) {
      opts.result.error(
        opts.phase,
        `${opts.pathPrefix}[${i}].${opts.refField}`,
        'UNRESOLVED_REF',
        `References ${opts.targetLabel} "${ref}" which does not exist. ` +
          `Available: [${[...opts.validIds].join(', ')}]`,
      );
    }
  }
}

// Uniqueness within a scope

export function checkUniqueWithinScope<T>(
  items: T[],
  getKey: (item: T) => string,
  phase: string,
  pathPrefix: string,
  fieldName: string,
  result: ValidationResult,
): void {
  const seen = new Map<string, number>();

  for (const [i, item] of items.entries()) {
    const key = getKey(item);
    const prev = seen.get(key);

    if (prev !== undefined) {
      result.error(
        phase,
        `${pathPrefix}[${i}].${fieldName}`,
        'DUPLICATE_WITHIN_SCOPE',
        `Duplicate ${fieldName} "${key}" (first seen at index ${prev})`,
      );
    } else {
      seen.set(key, i);
    }
  }
}

// ─── Order uniqueness ───────────────────────────────────────────

export function checkUniqueOrders<T extends { order?: number }>(
  items: T[],
  phase: string,
  pathPrefix: string,
  result: ValidationResult,
): void {
  const seen = new Map<number, number>();

  for (const [i, item] of items.entries()) {
    if (item.order == null) continue;

    const prev = seen.get(item.order);
    if (prev !== undefined) {
      result.warn(
        phase,
        `${pathPrefix}[${i}].order`,
        'DUPLICATE_ORDER',
        `Order ${item.order} is also used at index ${prev}. Rules with the same order have undefined precedence.`,
      );
    } else {
      seen.set(item.order, i);
    }
  }
}
