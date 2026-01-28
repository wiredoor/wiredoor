import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  DataTable,
  DataTableProps,
  DataTableRef,
  FetchParams,
  FetchResult,
  StreamEvent,
  Unsubscribe,
  Id,
} from '@/components/compound/table/data-table';

import { createListResource, type ListResponse } from '@/lib/react-query/create-list-resource';
import axios from '@/lib/axios';

export type QueryDataTableProps<RowT extends { id: Id }> = Omit<DataTableProps<RowT>, 'fetcher' | 'subscribe' | 'filters' | 'limit'> & {
  endpoint: string;
  dataStream?: string;
  filters?: Record<string, string | number | undefined>;
  limit?: number;

  /** Enable/disable SSE (default true) */
  live?: boolean;

  /**
   * Optional method to normalize filters before sending to API
   */
  normalizeFilters?: (filters?: Record<string, any>) => Record<string, any>;

  /**
   * Optional method to customize row ID extraction
   */
  getRowId?: DataTableProps<RowT>['getRowId'];
};

function compactUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function normalizeTableCtx(input: { page: number; limit: number; filters?: Record<string, any> }) {
  const filters = compactUndefined(input.filters ?? {});
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) delete (filters as any)[k];
      else (filters as any)[k] = t;
    }
  }
  return Object.freeze({
    page: input.page ?? 1,
    limit: input.limit ?? 10,
    ...filters,
  });
}

function stableStringify(value: any): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: any): any {
  if (Array.isArray(value)) return value.map(sortRecursively);
  if (value && typeof value === 'object') {
    const sorted: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = sortRecursively(value[k]);
    }
    return sorted;
  }
  return value;
}

function toQueryString(params: Record<string, any>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (v === null) continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const QueryDataTable = React.forwardRef(function QueryDataTableInner<RowT extends { id: Id }>(
  props: QueryDataTableProps<RowT>,
  ref: React.ForwardedRef<DataTableRef<RowT>>,
) {
  const { endpoint, dataStream, columns, filters, limit = 10, live = true, normalizeFilters, ...rest } = props;

  const sseEnabled = !!dataStream && live;

  const qc = useQueryClient();

  const [ctx, setCtx] = React.useState<FetchParams>({ page: 1, limit, filters });

  const subHandlersRef = React.useRef<{
    emit: (event: StreamEvent<RowT>) => void;
    error?: (err: unknown) => void;
  } | null>(null);

  const resource = React.useMemo(() => {
    const resourceKey = endpoint;
    return createListResource<FetchParams, RowT>({
      resourceKey,

      normalize: (p?: FetchParams) => {
        const page = p?.page ?? 1;
        const lim = p?.limit ?? limit;
        const mergedFilters = { ...(p?.filters ?? {}) };

        const normalizedFiltersObj = normalizeFilters ? normalizeFilters(mergedFilters) : mergedFilters;

        const normalized = normalizeTableCtx({
          page,
          limit: lim,
          filters: normalizedFiltersObj,
        });

        return normalized as any;
      },

      fetcher: async (p?: FetchParams) => {
        const normalized = normalizeTableCtx({
          page: p?.page ?? 1,
          limit: p?.limit ?? limit,
          filters: normalizeFilters ? normalizeFilters(p?.filters) : p?.filters,
        }) as any as Record<string, any>;

        try {
          const { data } = await axios.get(endpoint, { params: normalized });
          return data as ListResponse<RowT>;
        } catch (err: any) {
          throw new Error(`GET ${endpoint} failed: ${err.response?.status}`);
        }
      },

      buildSseUrl: dataStream ? (normalizedParams) => `${dataStream}${toQueryString(normalizedParams)}` : undefined,
      parseSSE: dataStream ? (evt) => JSON.parse(evt.data) as RowT[] : undefined,
      applySSE: dataStream
        ? (prev, rows, normalized) => ({
            data: rows,
            page: (prev?.page ?? (normalized.page as number) ?? 1) as number,
            limit: (prev?.limit ?? (normalized.limit as number) ?? limit) as number,
            total: (prev?.total ?? rows.length) as number,
          })
        : undefined,
    });
  }, [endpoint, dataStream, limit, normalizeFilters]);

  const paramsKey = React.useMemo(() => {
    const normalized = resource.key(ctx)[1];
    return stableStringify(normalized);
  }, [resource, ctx]);

  resource.useListSSE(ctx, sseEnabled);

  const subscribe = React.useCallback(
    (nextCtx: FetchParams, handlers: { emit: (event: StreamEvent<RowT>) => void; error?: (err: unknown) => void }): Unsubscribe => {
      subHandlersRef.current = handlers;
      setCtx(nextCtx);
      return () => {
        // si quieres ser estricto, solo limpia si coincide
        if (subHandlersRef.current === handlers) subHandlersRef.current = null;
      };
    },
    [],
  );

  const fetcher = React.useCallback(
    async (p: FetchParams): Promise<FetchResult<RowT>> => {
      const data = await qc.ensureQueryData(resource.queryOptionsFor(p));
      // data es ListResponse<RowT> con shape compatible
      return data as FetchResult<RowT>;
    },
    [qc, resource],
  );

  React.useEffect(() => {
    if (!sseEnabled) return;

    const queryKey = resource.key(ctx) as any;

    const cached = qc.getQueryData<ListResponse<RowT>>(queryKey);
    if (cached?.data && subHandlersRef.current) {
      subHandlersRef.current.emit({ type: 'replace', rows: cached.data });
    }
  }, [sseEnabled, qc, resource, ctx, paramsKey]);

  return <DataTable<RowT> ref={ref} columns={columns} fetcher={fetcher} subscribe={subscribe} limit={limit} filters={filters} {...(rest as any)} />;
}) as <RowT extends { id: Id }>(p: QueryDataTableProps<RowT> & { ref?: React.Ref<DataTableRef<RowT>> }) => React.ReactElement;
