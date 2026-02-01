import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSSEQuerySnapshot } from '@/hooks/use-sse-query-snapshot';

/**
 * GET /api/nodes/{id}
 * SSE: /api/nodes/stream?id={id}
 */
export function createItemResource<TParams extends Record<string, any>, TData>(cfg: {
  resourceKey: string;

  normalize: (params: TParams) => Record<string, any>;

  fetcher: (params: TParams) => Promise<TData>;

  buildSseUrl?: (normalizedParams: Record<string, any>) => string;

  parseSSE?: (evt: MessageEvent) => TData | Partial<TData>;

  applySSE?: (prev: TData | undefined, incoming: TData | Partial<TData>, normalizedParams: Record<string, any>) => TData;

  enabledWhen?: (params: TParams) => boolean;
}) {
  const key = (params: TParams) => [cfg.resourceKey, cfg.normalize(params)] as const;

  const queryOptionsFor = (params: TParams) =>
    queryOptions({
      queryKey: key(params),
      queryFn: () => cfg.fetcher(params),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: cfg.enabledWhen ? cfg.enabledWhen(params) : true,
    });

  const useItem = (params: TParams) => useQuery(queryOptionsFor(params));

  const useItemSSE = (params: TParams, enabled = true) => {
    if (!cfg.buildSseUrl || !cfg.parseSSE) return null;

    const normalized = cfg.normalize(params);
    const baseEnabled = cfg.enabledWhen ? cfg.enabledWhen(params) : true;

    const fallbackApply: NonNullable<typeof cfg.applySSE> = (prev, incoming) => {
      if (!prev) return incoming as TData;

      // merge shallow por defecto (ideal si incoming es patch parcial)
      if (incoming && typeof incoming === 'object') {
        return { ...(prev as any), ...(incoming as any) } as TData;
      }

      return incoming as TData;
    };

    const applyFn = cfg.applySSE ?? fallbackApply;

    return useSSEQuerySnapshot<TData, TData>({
      enabled: baseEnabled && enabled,
      key: `${cfg.resourceKey}-sse-${JSON.stringify(normalized)}`,
      queryKey: key(params),
      url: () => cfg.buildSseUrl!(normalized),
      parse: (evt) => cfg.parseSSE!(evt) as any,
      apply: (prev, incoming) => applyFn(prev as TData | undefined, incoming as any, normalized),
    });
  };

  return { key, queryOptionsFor, useItem, useItemSSE };
}
