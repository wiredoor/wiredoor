import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSSEQuerySnapshot } from '@/hooks/use-sse-query-snapshot';

export type ListResponse<T> = {
  data: T[];
  limit: number;
  total: number;
  page: number;
};

export function createListResource<TParams extends Record<string, any>, TData>(cfg: {
  resourceKey: string;
  normalize: (params?: TParams) => Record<string, any>;
  fetcher: (params?: TParams) => Promise<ListResponse<TData>>;
  buildSseUrl?: (normalizedParams: Record<string, any>) => string;
  parseSSE?: (evt: MessageEvent) => TData[];
  applySSE?: (prev: ListResponse<TData> | undefined, rows: TData[], normalizedParams: Record<string, any>) => ListResponse<TData>;
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

  const useListSSE = (params?: TParams, enabled = true) => {
    if (!cfg.buildSseUrl || !cfg.parseSSE) return null;

    const normalized = cfg.normalize(params);

    return useSSEQuerySnapshot<ListResponse<TData>>({
      enabled,
      key: `${cfg.resourceKey}-sse-${JSON.stringify(normalized)}`,
      queryKey: key(normalized as TParams),
      url: () => cfg.buildSseUrl!(normalized),
      parse: (evt) => {
        return cfg.parseSSE!(evt) as any;
      },
      apply: (prev, incoming): ListResponse<TData> => {
        const rows = incoming;
        const prevData = prev as ListResponse<TData> | undefined;

        const fallbackApply: NonNullable<typeof cfg.applySSE> = (p, r, n) => ({
          data: r as TData[],
          page: (p?.page ?? n.page ?? 1) as number,
          limit: (p?.limit ?? n.limit ?? 10) as number,
          total: (p?.total ?? r.length) as number,
        });

        const applyFn = cfg.applySSE ?? fallbackApply;
        return applyFn(prevData, rows as any, normalized);
      },
    });
  };

  return { key, queryOptionsFor, useList, useListSSE };
}
