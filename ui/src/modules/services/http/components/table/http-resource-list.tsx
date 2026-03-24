import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef, DataTableRef, RowActionItem } from '@/components/compound/table/data-table';
import { useDialog } from '@/components/compound/dialogs';
import { Icon, Inline } from '@/components/foundations';
import { toast } from '@/components/compound/toast';
import { HttpResourceInfo } from '../../http-resource-schemas';
import { httpResourceColumns } from './columns';
import { AppDataTable } from '../../../../shared/components/app-data-table';
import { cn } from '@/lib/utils';
import { HttpResourceDetails } from './http-resource-details';
import { SwitchInput } from '@/components/compound/form';
import HttpResourceApiService from '../../api/http-resource-api-service';

type Filters = {
  search: string;
};

export type HttpResourceTableProps = {
  limit?: number;
  live?: boolean;
  filters: Filters;

  onAdd?: () => void;
  onRowClick?: (row: HttpResourceInfo) => void;
};

export function HttpResourceList({ limit = 10, filters, live = true, onAdd }: HttpResourceTableProps) {
  const tableRef = React.useRef<DataTableRef<HttpResourceInfo>>(null);
  const [expandedRow, setExpandedRow] = React.useState<HttpResourceInfo | null>(null);

  void expandedRow;

  const dialog = useDialog();
  const navigate = useNavigate();

  const handleStatus = React.useCallback(
    async ({ row }: { row: HttpResourceInfo }): Promise<void> => {
      const title = row.enabled ? 'Disable resource?' : 'Enable resource?';
      const description = row.enabled
        ? 'Disabling the HTTP Resource will stop all connections and exposed services. Are you sure you want to disable this resource?'
        : 'Enabling the HTTP Resource will allow connections if is properly configured. Are you sure you want to enable this resource?';
      const enable = row.enabled ? false : true;

      const ok = await dialog.confirm({
        title: title,
        description: description,
        destructive: row.enabled ? true : false,
        confirmText: row.enabled ? 'Disable' : 'Enable',
        cancelText: 'Cancel',
        closeOnOverlayClick: false,
        closeOnEsc: true,
        size: 'sm',
      });

      if (ok) {
        tableRef.current?.setSseOn(false);
        tableRef.current?.updateItem(row.id, { enabled: enable });
        try {
          await HttpResourceApiService.setHttpResourceAvailability(row.id as number, enable ? 'enable' : 'disable');
          tableRef.current?.updateItem(row.id, { enabled: enable });
        } catch {
          tableRef.current?.updateItem(row.id, { enabled: !enable });
        } finally {
          tableRef.current?.setSseOn(true);
        }
        return;
      }
    },
    [dialog],
  );

  const rowActions = React.useCallback(
    ({ row, table }: { row: HttpResourceInfo; table: DataTableRef<HttpResourceInfo> }): RowActionItem<HttpResourceInfo>[] => {
      return [
        {
          label: (
            <Inline gap={1}>
              <Icon name='edit' />
              Edit
            </Inline>
          ),
          type: 'item',
          onAction: () => {
            navigate(`/nodes/edit/${row.id}`);
          },
        },
        {
          type: 'separator',
        },
        {
          label: (
            <Inline gap={1}>
              <Icon name='delete' />
              Delete
            </Inline>
          ),
          type: 'item',
          variant: 'destructive',
          onAction: async () => {
            const ok = await dialog.confirm({
              title: `Delete node?`,
              description: `This action cannot be undone. All data associated with the node will be permanently deleted. Are you sure you want to delete the node ${row.name}?`,
              destructive: true,
              confirmText: 'Delete',
              cancelText: 'Cancel',
              closeOnOverlayClick: false,
              closeOnEsc: true,
              size: 'sm',
            });

            if (ok) {
              table.setSseOn(false);
              table.removeItem(row.id);
              try {
                await HttpResourceApiService.deleteHttpResource(row.id as number);
                toast.success(`Node ${row.name} deleted successfully`, { duration: 2500 });
              } catch {
                table.refetch();
              } finally {
                table.setSseOn(true);
              }
            }
          },
        },
      ];
    },
    [dialog, navigate],
  );

  const handleExpand = React.useCallback((row: HttpResourceInfo) => {
    queueMicrotask(() => setExpandedRow(row));
  }, []);

  const columns: ColumnDef<HttpResourceInfo>[] = React.useMemo(
    () => [
      ...httpResourceColumns,
      {
        label: 'Status',
        key: 'enabled',
        className: 'text-center w-24',
        render: ({ row }) => {
          return (
            <Inline justify='center'>
              <div className='w-[32px]'>
                <SwitchInput
                  label=''
                  checked={row.enabled!}
                  onCheckedChange={async (checked: boolean) => {
                    void checked;
                    await handleStatus({ row });
                  }}
                />
              </div>
            </Inline>
          );
        },
      },
    ],
    [],
  );

  return (
    <AppDataTable<HttpResourceInfo>
      ref={tableRef}
      columns={columns}
      filters={filters}
      rowActions={rowActions}
      limit={limit}
      live={live}
      endpoint={'/api/http'}
      showPagination
      onAdd={onAdd}
      expandable
      empty={{
        title: 'No HTTP resources yet',
        description: 'Create your first HTTP Resource.',
        action: 'Create HTTP Resource',
      }}
      onExpand={handleExpand}
      rowClassName={(row) => cn(!row.enabled ? 'opacity-60' : '')}
      renderExpandedRow={({ row }) => <HttpResourceDetails row={row} />}
    />
  );
}
