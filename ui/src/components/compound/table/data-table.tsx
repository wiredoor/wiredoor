/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";

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

/**
 * streaming updates / live data and exposes an emit function to push updates `emit(rows)`.
 */
export type StreamEvent<RowT> =
  | { type: "patch"; id: Id; patch: Partial<RowT> }
  | { type: "upsert"; row: RowT }
  | { type: "remove"; id: Id }
  | { type: "batchPatch"; patches: Array<{ id: Id; patch: Partial<RowT> }> }
  | { type: "replace"; rows: RowT[] };

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
export function upsertRow<RowT extends object>(prev: RowT[], row: RowT, getRowId: (row: RowT) => Id, opts?: { position?: "start" | "end" }): RowT[] {
  const id = getRowId(row);
  const idx = prev.findIndex((r) => getRowId(r) === id);

  // Insert
  if (idx === -1) {
    if (opts?.position === "start") return [row, ...prev];
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
    tableContainerClassName = "w-full",
    theadClassName = "text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700/60",
    tbodyClassName = "text-sm divide-y divide-gray-100 dark:divide-gray-700/60 border-b border-gray-200 dark:border-gray-700/60",
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
        if (event.type === "replace") {
          setRows((prev) => mergeRowsPreserveRefs(prev, event.rows, getRowId));
          return;
        }
        if (event.type === "patch") {
          setRows((prev) => applyPatch(prev, event.id, event.patch, getRowId));
          return;
        }
        if (event.type === "batchPatch") {
          setRows((prev) => applyBatchPatch(prev, event.patches, getRowId));
          return;
        }
        if (event.type === "upsert") {
          setRows((prev) => upsertRow(prev, event.row, getRowId));
          return;
        }
        if (event.type === "remove") {
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
      <div className="p-8 text-center">
        <div className="text-lg font-medium">{empty.title}</div>
        {empty.description ? <div className="text-sm text-muted-foreground">{empty.description}</div> : null}
        {empty.action ? (
          <div className="mt-4">
            <button className="inline-flex items-center rounded-md border px-3 py-2 text-sm" onClick={onAdd}>
              {empty.action}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className={tableContainerClassName}>
        <table className="table-auto w-full dark:text-gray-300">
          <thead className={theadClassName}>
            <tr>
              {showCheckbox ? (
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
                  <span className="sr-only">Select all</span>
                  <input
                    className="form-checkbox"
                    type="checkbox"
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={(e) => checkAll(e.target.checked)}
                  />
                </th>
              ) : null}

              {expandable ? (
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
                  <span className="sr-only">Expand</span>
                </th>
              ) : null}

              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={c.headClassName ?? "text-left px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"}
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
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {showCheckbox ? (
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
                        <span className="sr-only">Select</span>
                        <input
                          className="form-checkbox"
                          type="checkbox"
                          checked={selected.includes(rowId)}
                          onChange={(e) => checkRow(rowId, e.target.checked)}
                        />
                      </td>
                    ) : null}

                    {expandable ? (
                      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
                        <button
                          className={[
                            "text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transform",
                            isExpanded ? "rotate-180" : "",
                          ].join(" ")}
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleExpand(row);
                          }}
                        >
                          <span className="sr-only">Expand</span>
                          <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                            <path d="M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z" />
                          </svg>
                        </button>
                      </td>
                    ) : null}

                    {columns.map((c) => {
                      const value = (row as any)[c.key];
                      return (
                        <td key={`${rowId}:${String(c.key)}`} className={c.className ?? "px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"}>
                          {c.render ? c.render({ row, rowIndex, value }) : String(value ?? "")}
                        </td>
                      );
                    })}
                  </tr>

                  {expandable && isExpanded ? (
                    <tr role="region">
                      <td colSpan={columns.length + (showCheckbox ? 1 : 0) + (expandable ? 1 : 0)} className="px-2 first:pl-5 last:pr-5 py-3">
                        {renderExpandedRow ? renderExpandedRow({ row, rowIndex }) : null}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 ? (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <nav className="mb-4 sm:mb-0 sm:order-1" aria-label="Navigation">
              <ul className="flex justify-center">
                <li className="ml-3 first:ml-0">
                  <button
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    &lt;- Previous
                  </button>
                </li>
                <li className="ml-3 first:ml-0">
                  <button
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
                    disabled={page === totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next -&gt;
                  </button>
                </li>
              </ul>
            </nav>

            <div className="text-sm text-gray-500 text-center sm:text-left">
              Showing <span className="font-medium text-gray-600 dark:text-gray-300">{(page - 1) * pageSize}</span> to{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">{page * pageSize > total ? total : page * pageSize}</span> of{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">{total}</span> results
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}) as <RowT extends { id: Id }>(p: DataTableProps<RowT> & { ref?: React.Ref<DataTableRef<RowT>> }) => React.ReactElement;
