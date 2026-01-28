import * as React from 'react';
import { Inline, Stack } from '@/components/foundations';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderOverlay } from '@/components/compound/loader/loader-overlay';

export type Id = string | number;

export type FetchParams = {
  page: number;
  limit: number;
  filters?: Record<string, string | number | undefined>;
};

export type FetchResult<RowT> = {
  data: RowT[];
  page: number;
  limit: number;
  total: number;
};

export type DataTableFetcher<RowT> = (params: FetchParams) => Promise<FetchResult<RowT>>;

export type Unsubscribe = () => void;

const pageSizeOptions = [10, 20, 30, 50, 100];

/**
 * streaming updates / live data and exposes an emit function to push updates `emit(rows)`.
 */
export type StreamEvent<RowT> =
  | { type: 'patch'; id: Id; patch: Partial<RowT> }
  | { type: 'upsert'; row: RowT }
  | { type: 'remove'; id: Id }
  | { type: 'batchPatch'; patches: Array<{ id: Id; patch: Partial<RowT> }> }
  | { type: 'replace'; rows: RowT[] };

export type DataTableSubscribe<RowT> = (
  ctx: FetchParams,
  handlers: {
    emit: (event: StreamEvent<RowT>) => void;
    error?: (err: unknown) => void;
  },
) => Unsubscribe;

export interface ColumnDef<RowT extends { id: Id }> {
  label: string;
  key: keyof RowT | string;

  width?: string;
  headClassName?: string;
  className?: string;

  render?: (args: { row: RowT; rowIndex: number; value: any }) => React.ReactNode;
}

export interface EmptyState {
  title: string;
  description?: string;
  action?: string;
}

export interface DataTableRef<RowT extends { id: Id }> {
  refetch: () => Promise<void>;
  addItem: (row: RowT) => void;
  updateItem: (id: Id, patch: Partial<RowT>) => void;
  removeItem: (id: Id) => void;
  setPage: (page: number) => void;
}

export type DataTableProps<RowT extends { id: Id }> = {
  columns: ColumnDef<RowT>[];

  fetcher: DataTableFetcher<RowT>;
  subscribe?: DataTableSubscribe<RowT>;

  limit?: number;
  filters?: Record<string, string | number | undefined>;

  showPagination?: boolean;
  showCheckbox?: boolean;
  expandable?: boolean;

  empty?: EmptyState;

  renderExpandedRow?: (args: { row: RowT; rowIndex: number }) => React.ReactNode;

  /**
   * Events
   */
  onSelect?: (ids: Id[]) => void;
  onAdd?: () => void;
  onExpand?: (row: RowT) => void;

  /**
   * Styling hooks
   */
  tableContainerClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;

  /**
   * If you want to control how to get the id (in case it's not `id`)
   */
  getRowId?: (row: RowT) => Id;
};

function defaultGetRowId<RowT extends { id: Id }>(row: RowT) {
  return row.id;
}

/**
 * Shallow equal between an object and a patch (subset of keys).
 */
export function shallowEqualSubset<T extends object>(base: T, patch: Partial<T>): boolean {
  for (const k of Object.keys(patch) as Array<keyof T>) {
    if (base[k] !== patch[k]) return false;
  }
  return true;
}

/**
 * Shallow equal between two objects.
 */
export function shallowEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) return true;

  const aKeys = Object.keys(a) as Array<keyof T>;
  const bKeys = Object.keys(b) as Array<keyof T>;

  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }

  return true;
}

/**
 * Merges two row arrays, preserving references from `prev` when items are shallowly equal.
 */
function mergeRowsPreserveRefs<RowT extends { id: Id }>(prev: RowT[], next: RowT[], getId: (r: RowT) => Id): RowT[] {
  const prevById = new Map<Id, RowT>(prev.map((r) => [getId(r), r]));
  let changed = prev.length !== next.length;

  const merged = next.map((n) => {
    const id = getId(n);
    const p = prevById.get(id);
    if (!p) {
      changed = true;
      return n;
    }

    // shallow compare by keys of "next"
    const nKeys = Object.keys(n as any);
    for (const k of nKeys) {
      if ((p as any)[k] !== (n as any)[k]) {
        changed = true;
        return { ...(p as any), ...(n as any) };
      }
    }

    return p; // reuse reference
  });

  return changed ? merged : prev;
}

/*
 * Patch a row into the array, preserving references when shallowly equal.
 */
export function applyPatch<RowT extends object>(prev: RowT[], id: Id, patch: Partial<RowT>, getRowId: (row: RowT) => Id): RowT[] {
  const idx = prev.findIndex((r) => getRowId(r) === id);
  if (idx === -1) return prev;

  const current = prev[idx];

  if (shallowEqualSubset(current, patch)) return prev;

  const nextRow = { ...(current as any), ...(patch as any) } as RowT;

  const copy = prev.slice();
  copy[idx] = nextRow;
  return copy;
}

/*
 * Upsert a row into the array, preserving references when shallowly equal.
 */
export function upsertRow<RowT extends object>(prev: RowT[], row: RowT, getRowId: (row: RowT) => Id, opts?: { position?: 'start' | 'end' }): RowT[] {
  const id = getRowId(row);
  const idx = prev.findIndex((r) => getRowId(r) === id);

  // Insert
  if (idx === -1) {
    if (opts?.position === 'start') return [row, ...prev];
    return [...prev, row];
  }

  // Update (reusar referencia si no cambió)
  const current = prev[idx];

  if (shallowEqual(current, row)) return prev;

  // Merge (por si row viene incompleto)
  const nextRow = { ...(current as any), ...(row as any) } as RowT;

  // Si luego del merge resulta igual, reusa
  if (shallowEqual(current, nextRow)) return prev;

  const copy = prev.slice();
  copy[idx] = nextRow;
  return copy;
}

function applyBatchPatch<RowT extends object>(prev: RowT[], patches: Array<{ id: Id; patch: Partial<RowT> }>, getRowId: (row: RowT) => Id): RowT[] {
  const patchMap = new Map<Id, Partial<RowT>>();
  for (const p of patches) patchMap.set(p.id, p.patch);

  let changed = false;
  const next = prev.map((row) => {
    const id = getRowId(row);
    const patch = patchMap.get(id);
    if (!patch) return row;

    for (const k of Object.keys(patch) as Array<keyof RowT>) {
      if ((row as any)[k] !== (patch as any)[k]) {
        changed = true;
        return { ...(row as any), ...(patch as any) } as RowT;
      }
    }
    return row;
  });

  return changed ? next : prev;
}

function getPaginationRange(current: number, total: number) {
  const items: Array<number | 'ellipsis'> = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) items.push(i);
    return items;
  }

  items.push(1);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push('ellipsis');

  for (let i = left; i <= right; i++) items.push(i);

  if (right < total - 1) items.push('ellipsis');

  items.push(total);

  return items;
}

export const DataTable = React.forwardRef(function DataTableInner<RowT extends { id: Id }>(
  props: DataTableProps<RowT>,
  ref: React.ForwardedRef<DataTableRef<RowT>>,
) {
  const {
    columns,
    fetcher,
    subscribe,
    limit = 10,
    filters,
    showPagination = true,
    showCheckbox = false,
    expandable = false,
    empty,
    renderExpandedRow,
    onSelect,
    onAdd,
    onExpand,
    tableContainerClassName = 'w-full',
    theadClassName = [
      'text-xs font-medium tracking-wide text-muted-foreground',
      'bg-muted/20 border-y border-border',
      '[&>tr>th]:py-3 [&>tr>th]:align-middle',
    ].join(' '),
    tbodyClassName = 'text-sm border-b border-border [&>tr]:border-b [&>tr]:border-border/60 last:[&>tr]:border-b-0',
    getRowId = defaultGetRowId,
  } = props;

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<RowT[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(limit);
  const [total, setTotal] = React.useState(0);

  const [selected, setSelected] = React.useState<Id[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const totalPages = React.useMemo(() => {
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const ctx = React.useMemo<FetchParams>(() => {
    return { page, limit: pageSize, filters };
  }, [page, pageSize, filters]);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher(ctx);
      setRows((prev) => mergeRowsPreserveRefs(prev, result.data, getRowId));
      setPage(result.page);
      setPageSize(result.limit);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [fetcher, ctx, getRowId]);

  // initial + when ctx changes
  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  // subscribe (stream / live updates)
  React.useEffect(() => {
    if (!subscribe) return;

    return subscribe(ctx, {
      emit: (event) => {
        if (event.type === 'replace') {
          setRows((prev) => mergeRowsPreserveRefs(prev, event.rows, getRowId));
          return;
        }
        if (event.type === 'patch') {
          setRows((prev) => applyPatch(prev, event.id, event.patch, getRowId));
          return;
        }
        if (event.type === 'batchPatch') {
          setRows((prev) => applyBatchPatch(prev, event.patches, getRowId));
          return;
        }
        if (event.type === 'upsert') {
          setRows((prev) => upsertRow(prev, event.row, getRowId));
          return;
        }
        if (event.type === 'remove') {
          setRows((prev) => prev.filter((r) => getRowId(r) !== event.id));
        }
      },
    });
  }, [subscribe, ctx, getRowId]);

  // selection
  const checkAll = (checked: boolean) => {
    const ids = checked ? rows.map(getRowId) : [];
    setSelected(ids);
    onSelect?.(ids);
  };

  const checkRow = (id: Id, checked: boolean) => {
    setSelected((prev) => {
      const next = checked ? [...prev, id] : prev.filter((x) => x !== id);
      onSelect?.(next);
      return next;
    });
  };

  const toggleExpand = (row: RowT) => {
    const id = String(getRowId(row));
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) onExpand?.(row);
      return next;
    });
  };

  // imperative API (para replicar defineExpose de Vue)
  React.useImperativeHandle(
    ref,
    () => ({
      refetch,
      addItem: (row) => setRows((prev) => [...prev, row]),
      updateItem: (id, patch) => setRows((prev) => prev.map((r) => (getRowId(r) === id ? ({ ...(r as any), ...(patch as any) } as RowT) : r))),
      removeItem: (id) => setRows((prev) => prev.filter((r) => getRowId(r) !== id)),
      setPage,
    }),
    [refetch, getRowId],
  );

  if (empty && rows.length === 0 && !loading) {
    return (
      <div className='p-8 text-center'>
        <div className='text-lg font-medium'>{empty.title}</div>
        {empty.description ? <div className='text-sm text-muted-foreground'>{empty.description}</div> : null}
        {empty.action ? (
          <div className='mt-4'>
            <button className='inline-flex items-center rounded-md border px-3 py-2 text-sm' onClick={onAdd}>
              {empty.action}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Stack justify='between' className='w-full'>
      <div className={['w-full rounded-md border bg-card overflow-x-auto', tableContainerClassName].join(' ')}>
        <table className='table-auto w-full dark:text-gray-300'>
          <thead className={theadClassName}>
            <tr>
              {showCheckbox ? (
                <th className='px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px'>
                  <span className='sr-only'>Select all</span>
                  <input
                    className='form-checkbox'
                    type='checkbox'
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={(e) => checkAll(e.target.checked)}
                  />
                </th>
              ) : null}

              {expandable ? (
                <th className='px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px'>
                  <span className='sr-only'>Expand</span>
                </th>
              ) : null}

              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={c.headClassName ?? 'text-left px-3 first:pl-5 last:pr-5 whitespace-nowrap align-middle'}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={tbodyClassName}>
            {rows.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isExpanded = !!expanded[String(rowId)];

              return (
                <React.Fragment key={rowId}>
                  <tr
                    data-selected={selected.includes(rowId) ? 'true' : 'false'}
                    className={[
                      'group transition-colors',
                      'hover:bg-muted/40',
                      'data-[selected=true]:bg-primary/5',
                      'data-[selected=true]:hover:bg-primary/8',
                      rowIndex % 2 === 1 ? 'bg-muted/10' : '',
                    ].join(' ')}
                  >
                    {showCheckbox ? (
                      <td className='px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px'>
                        <span className='sr-only'>Select</span>
                        <input
                          className='form-checkbox'
                          type='checkbox'
                          checked={selected.includes(rowId)}
                          onChange={(e) => checkRow(rowId, e.target.checked)}
                        />
                      </td>
                    ) : null}

                    {expandable ? (
                      <td className='px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px'>
                        <button
                          className={[
                            'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transform',
                            isExpanded ? 'rotate-180' : '',
                          ].join(' ')}
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleExpand(row);
                          }}
                        >
                          <span className='sr-only'>Expand</span>
                          <svg className='w-8 h-8 fill-current' viewBox='0 0 32 32'>
                            <path d='M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z' />
                          </svg>
                        </button>
                      </td>
                    ) : null}

                    {columns.map((c) => {
                      const value = (row as any)[c.key as any];
                      return (
                        <td
                          key={`${rowId}:${String(c.key)}`}
                          className={c.className ?? 'px-3 first:pl-5 last:pr-5 py-3 whitespace-nowrap align-middle'}
                        >
                          {c.render ? c.render({ row, rowIndex, value }) : String(value ?? '')}
                        </td>
                      );
                    })}
                  </tr>

                  {expandable && isExpanded ? (
                    <tr role='region'>
                      <td colSpan={columns.length + (showCheckbox ? 1 : 0) + (expandable ? 1 : 0)} className='px-2 first:pl-5 last:pr-5 py-3'>
                        {renderExpandedRow ? renderExpandedRow({ row, rowIndex }) : null}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {<LoaderOverlay loading={loading} />}
      </div>

      {showPagination && total > limit ? (
        <div className='w-full px-3 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Inline>
            <Inline>
              <span className='text-sm text-muted-foreground'>Items</span>

              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  const next = Number(v);
                  if (Number.isNaN(next)) return;

                  setPageSize(next);
                  setPage(1);
                }}
                disabled={loading}
              >
                <SelectTrigger className='h-10 w-[110px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align='start'>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Inline>

            <div className='text-sm text-muted-foreground whitespace-nowrap'>
              Showing <span className='font-medium text-foreground'>{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className='font-medium text-foreground'>{Math.min(page * pageSize, total)}</span> of{' '}
              <span className='font-medium text-foreground'>{total}</span>
            </div>
          </Inline>

          <Pagination className='justify-end'>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={page === 1 || loading}
                  className={page === 1 || loading ? 'pointer-events-none opacity-50' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    if (page === 1 || loading) return;
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>

              {getPaginationRange(page, totalPages).map((item, idx) => {
                if (item === 'ellipsis') {
                  return (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                const p = item;
                const isActive = p === page;

                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={isActive}
                      aria-disabled={loading}
                      className={loading ? 'pointer-events-none opacity-50' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        if (loading) return;
                        setPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  aria-disabled={page === totalPages || loading}
                  className={page === totalPages || loading ? 'pointer-events-none opacity-50' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    if (page === totalPages || loading) return;
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </Stack>
  );
}) as <RowT extends { id: Id }>(p: DataTableProps<RowT> & { ref?: React.Ref<DataTableRef<RowT>> }) => React.ReactElement;
