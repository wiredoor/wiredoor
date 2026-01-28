import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { DataTableFetcher } from '@/components/compound/table/data-table';
import { PagedData } from '../../types/api';

export function createReactQueryDataTableFetcher<TRow, TFilters extends Record<string, any>, TQueryData>(cfg: {
  queryClient: QueryClient;
  buildFilters: (ctx: { page: number; limit: number; filters?: Record<string, any> }) => TFilters;
  queryOptions: (filters: TFilters) => { queryKey: QueryKey; queryFn: () => Promise<TQueryData> };
  mapToTable: (data: TQueryData, ctx: { page: number; limit: number }) => PagedData<TRow>;
}): DataTableFetcher<TRow> {
  return async ({ page, limit, filters }) => {
    const built = cfg.buildFilters({ page, limit, filters });
    const opts = cfg.queryOptions(built);

    const data = await cfg.queryClient.ensureQueryData({
      queryKey: opts.queryKey,
      queryFn: opts.queryFn,
    });

    return cfg.mapToTable(data, { page, limit });
  };
}
