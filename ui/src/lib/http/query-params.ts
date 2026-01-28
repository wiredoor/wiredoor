export function cleanParams<T extends Record<string, any>>(params?: T): Partial<T> {
  if (!params) return {};
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;
}

export function toSearchParams(params?: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(cleanParams(params))) {
    sp.set(k, String(v));
  }
  return sp;
}
