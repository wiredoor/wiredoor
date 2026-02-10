import * as React from 'react';

import {
  DataTable,
  type DataTableProps,
  type DataTableRef,
  type FetchParams,
  type FetchResult,
  type StreamEvent,
  type Unsubscribe,
  type Id,
} from '@/components/compound/table/data-table';

import axios from '@/lib/axios';
import { useEventSource } from '@/hooks/use-event-source';

export type AppDataTableProps<RowT extends { id: Id }> = Omit<DataTableProps<RowT>, 'fetcher' | 'subscribe' | 'filters' | 'limit'> & {
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

function stableStringify(value: any): string {
  return JSON.stringify(sortRecursively(value));
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

export const AppDataTable = React.forwardRef(function AppDataTableInner<RowT extends { id: Id }>(
  props: AppDataTableProps<RowT>,
  ref: React.ForwardedRef<DataTableRef<RowT>>,
) {
  const { endpoint, dataStream, columns, filters, limit = 10, live = true, normalizeFilters, ...rest } = props;

  const [subscribed, setSubscribed] = React.useState(false);

  const sseEnabled = !!dataStream && live && subscribed;

  const handlersRef = React.useRef<{
    emit: (event: StreamEvent<RowT>) => void;
    error?: (err: unknown) => void;
  } | null>(null);

  const [ctx, setCtx] = React.useState<FetchParams>({ page: 1, limit, filters });

  const normalizedParams = React.useMemo(() => {
    const page = ctx?.page ?? 1;
    const lim = ctx?.limit ?? limit;
    const mergedFilters = { ...(ctx?.filters ?? {}) };
    const normalizedFiltersObj = normalizeFilters ? normalizeFilters(mergedFilters) : mergedFilters;

    return normalizeTableCtx({
      page,
      limit: lim,
      filters: normalizedFiltersObj,
    }) as any as Record<string, any>;
  }, [ctx, limit, normalizeFilters]);

  const sseKey = React.useMemo(() => {
    return `${endpoint}::${dataStream ?? ''}::${stableStringify(normalizedParams)}`;
  }, [endpoint, dataStream, normalizedParams]);

  const fetcher = React.useCallback(
    async (p: FetchParams): Promise<FetchResult<RowT>> => {
      const normalized = normalizeTableCtx({
        page: p?.page ?? 1,
        limit: p?.limit ?? limit,
        filters: normalizeFilters ? normalizeFilters(p?.filters) : p?.filters,
      }) as any as Record<string, any>;

      const { data } = await axios.get(endpoint, { params: normalized });
      return data as FetchResult<RowT>;
    },
    [endpoint, limit, normalizeFilters],
  );

  const sseUrl = React.useMemo(() => {
    if (!dataStream) return '';
    return `${dataStream}${toQueryString(normalizedParams)}`;
  }, [dataStream, normalizedParams]);

  useEventSource({
    enabled: sseEnabled,
    key: sseKey,
    url: () => sseUrl,
    withCredentials: true,

    onData: (evt) => {
      try {
        const rows = JSON.parse(evt.data) as RowT[];
        handlersRef.current?.emit({ type: 'replace', rows });
      } catch (e) {
        handlersRef.current?.error?.(e);
      }
    },

    onError: (e) => {
      handlersRef.current?.error?.(e);
    },
  });

  const subscribe = React.useCallback(
    (nextCtx: FetchParams, handlers: { emit: (event: StreamEvent<RowT>) => void; error?: (err: unknown) => void }): Unsubscribe => {
      handlersRef.current = handlers;
      setCtx(nextCtx);
      setSubscribed(true);

      return () => {
        if (handlersRef.current === handlers) handlersRef.current = null;
        setSubscribed(false);
      };
    },
    [fetcher],
  );

  return <DataTable<RowT> ref={ref} columns={columns} fetcher={fetcher} subscribe={subscribe} limit={limit} filters={filters} {...(rest as any)} />;
}) as <RowT extends { id: Id }>(p: AppDataTableProps<RowT> & { ref?: React.Ref<DataTableRef<RowT>> }) => React.ReactElement;
