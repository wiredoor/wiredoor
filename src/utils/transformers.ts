import slugify from 'slugify';

export function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  if (typeof obj === 'object') {
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(obj);
}

export function toSlug(value: string): string {
  return slugify(value, {
    lower: true,
    strict: true,
    replacement: '-',
  }).slice(0, 100);
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;

  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
