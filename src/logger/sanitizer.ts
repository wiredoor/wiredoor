export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'auth',
  'privateKey',
  'private_key',
] as const;

export class Sanitizer {
  private sensitiveFields: string[];
  private maxDepth: number;

  constructor(additionalFields: string[] = []) {
    this.sensitiveFields = [
      ...DEFAULT_SENSITIVE_FIELDS,
      ...additionalFields,
    ].map((f) => f.toLowerCase());
    this.maxDepth = (additionalFields as any).maxDepth ?? 10;
  }

  sanitize<T>(data: T): T {
    if (!data || typeof data !== 'object') return data;

    if (!this.hasSensitiveData(data)) {
      return data;
    }

    const visited = new WeakSet<object>();
    const sanitized = this.deepClone(data);
    return this.sanitizeRecursive(sanitized, visited, 0) as T;
  }

  private hasSensitiveData(obj: any, depth: number = 0): boolean {
    if (depth > this.maxDepth) return false;

    if (!obj || typeof obj !== 'object') return false;

    if (Array.isArray(obj)) {
      return obj.some((item) => this.hasSensitiveData(item, depth + 1));
    }

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const lowerKey = key.toLowerCase();

      if (this.isSensitiveField(lowerKey)) {
        return true;
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (this.hasSensitiveData(obj[key], depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as any;
    }

    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  private sanitizeRecursive(
    obj: any,
    visited: WeakSet<object>,
    depth: number,
  ): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (visited.has(obj)) {
      return '[CIRCULAR_REFERENCE]';
    }
    visited.add(obj);

    if (depth > this.maxDepth) {
      return '[MAX_DEPTH_REACHED]';
    }

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const lowerKey = key.toLowerCase();
      const value = obj[key];

      if (this.isSensitiveField(lowerKey)) {
        obj[key] = this.mask(value);
      } else if (value && typeof value === 'object') {
        obj[key] = this.sanitizeRecursive(value, visited, depth + 1);
      }
    }

    return obj;
  }

  private isSensitiveField(key: string): boolean {
    return this.sensitiveFields.some((field) => key.includes(field));
  }

  private mask(value: any): string {
    if (!value) return '[REDACTED]';
    const str = String(value);
    if (str.length <= 4) return '***';
    return `${str.substring(0, 2)}${`******`}${str.substring(str.length - 2)}`;
  }

  sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    if (!headers) return {};
    const sanitized = { ...headers };

    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
      'set-cookie',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = this.mask(sanitized[header]);
      }
    });

    return sanitized;
  }
}
