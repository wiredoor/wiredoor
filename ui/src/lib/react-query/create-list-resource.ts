import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSSEQuerySnapshot } from '@/hooks/use-sse-query-snapshot';

export type ListResponse<T> = {
  data: T[];
  limit: number;
  total: number;
  page: number;
};

function stableStringify(value: any): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function createListResource<TParams extends Record<string, any>, TItem>(cfg: {
  resourceKey: string;
  normalize: (params?: TParams) => Record<string, any>;
  fetcher: (params?: TParams) => Promise<ListResponse<TItem>>;

  buildSseUrl?: (normalizedParams: Record<string, any>) => string;
  parseSSE?: (evt: MessageEvent) => TItem[];

  applySSE?: (prev: ListResponse<TItem> | undefined, rows: TItem[], normalizedParams: Record<string, any>) => ListResponse<TItem>;
}) {
  const key = (params?: TParams) => [cfg.resourceKey, cfg.normalize(params)] as const;

  const queryOptionsFor = (params?: TParams) =>
    queryOptions({
      queryKey: key(params),
      queryFn: () => cfg.fetcher(params),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const useList = (params?: TParams) => useQuery(queryOptionsFor(params));

  const useListSSE = (params?: TParams, enabled = true, opts?: { onApplied?: (next: ListResponse<TItem>) => void }) => {
    if (!cfg.buildSseUrl || !cfg.parseSSE) return null;

    const normalized = cfg.normalize(params);
    const sseKey = `${cfg.resourceKey}-sse-${stableStringify(normalized)}`;

    return useSSEQuerySnapshot<ListResponse<TItem>, TItem[]>({
      enabled,
      key: sseKey,
      queryKey: key(normalized as TParams),
      url: () => cfg.buildSseUrl!(normalized),

      parse: (evt) => cfg.parseSSE!(evt),

      apply: (prev, rows) => {
        const fallbackApply = (p: ListResponse<TItem> | undefined, r: TItem[], n: Record<string, any>) => ({
          data: r,
          page: (p?.page ?? (n.page as number) ?? 1) as number,
          limit: (p?.limit ?? (n.limit as number) ?? 10) as number,
          total: (p?.total ?? r.length) as number,
        });

        const next = (cfg.applySSE ?? fallbackApply)(prev, rows, normalized);

        return next;
      },

      onApplied: opts?.onApplied,
    });
  };

  return { key, queryOptionsFor, useList, useListSSE };
}
