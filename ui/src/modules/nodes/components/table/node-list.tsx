import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { type ColumnDef, DataTableRef, RowActionItem } from '@/components/compound/table/data-table';

import { enableNode } from '../../api/update-node';
import { cn } from '@/lib/utils';
import { useDialog } from '@/components/compound/dialogs';
import { deleteNode } from '../../api/delete-node';
import { toast } from '@/components/compound/toast';
import { NodeTokenDialog } from '../dialog/node-token-dialog';
import { AppDataTable } from '@/modules/shared/components/app-data-table';
import { type NodeInfo } from '../../node-schemas';
import { NodeDetails } from './node-details';
import { nodeColumns } from './columns';
import { regenerateNodeKeys } from '../../api/regenerate-keys';

type Filters = {
  search: string;
  status: '' | 'online' | 'offline' | 'idle' | 'disabled';
  type: '' | 'node' | 'gateway';
};

export type RemotesTableProps = {
  limit?: number;
  live?: boolean;
  filters: Filters;

  onAdd?: () => void;
  onRowClick?: (row: NodeInfo) => void;
};

export function NodeList({ limit = 10, filters, live = true, onAdd }: RemotesTableProps) {
  const tableRef = React.useRef<DataTableRef<NodeInfo>>(null);
  const [expandedRow, setExpandedRow] = React.useState<NodeInfo | null>(null);

  void expandedRow;

  const dialog = useDialog();
  const navigate = useNavigate();

  const rowActions = React.useCallback(
    ({ row, table }: { row: NodeInfo; table: DataTableRef<NodeInfo> }): RowActionItem<NodeInfo>[] => {
      return [
        {
          label: 'Instructions',
          type: 'item',
          onAction: async () => {
            await NodeTokenDialog({
              id: row.id as number,
              name: row.name,
              showInstallInstructions: true,
            });
          },
        },
        {
          label: 'Edit',
          type: 'item',
          onAction: () => {
            navigate(`/nodes/edit/${row.id}`);
          },
        },
        {
          label: row.enabled ? 'Disable' : 'Enable',
          type: 'item',
          onAction: async () => {
            const title = row.enabled ? 'Disable node?' : 'Enable node?';
            const description = row.enabled
              ? 'Disabling the node will stop all connections and exposed services. Are you sure you want to disable this node?'
              : 'Enabling the node will allow connections if the node is properly configured. Are you sure you want to enable this node?';
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
              table.updateItem(row.id, { enabled: enable });
              table.setSseOn(false);
              try {
                await enableNode(row.id as number, enable ? 'enable' : 'disable');
              } catch {
                table.updateItem(row.id, { enabled: !enable });
              } finally {
                table.setSseOn(true);
              }
              return;
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Regenerate Keys',
          type: 'item',
          onAction: async () => {
            const title = 'Regenerate node keys?';
            const description =
              'Regenerating the node keys will invalidate the current keys and generate new ones. Are you sure you want to proceed?';

            const ok = await dialog.confirm({
              title: title,
              description: description,
              destructive: true,
              confirmText: 'Regenerate',
              cancelText: 'Cancel',
              closeOnOverlayClick: false,
              closeOnEsc: true,
              size: 'sm',
            });

            if (ok) {
              const { token } = await regenerateNodeKeys(row.id as number);
              await NodeTokenDialog({
                id: row.id as number,
                name: row.name,
                showInstallInstructions: true,
                token,
                eventSource: 'regenerate',
              });
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Delete',
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
              table.removeItem(row.id);
              table.setSseOn(false);
              try {
                await deleteNode(row.id as number);
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

  const handleExpand = React.useCallback((row: NodeInfo) => {
    queueMicrotask(() => setExpandedRow(row));
  }, []);

  const columns: ColumnDef<NodeInfo>[] = React.useMemo(() => [...nodeColumns], []);

  return (
    <AppDataTable<NodeInfo>
      ref={tableRef}
      columns={columns}
      filters={filters}
      rowActions={rowActions}
      limit={limit}
      live={live}
      endpoint={'/api/nodes'}
      dataStream={'/api/nodes/stream'}
      showPagination
      onAdd={onAdd}
      expandable
      empty={{
        title: 'No nodes yet',
        description: 'Create your first node to start exposing services from private networks.',
        action: 'Create node',
      }}
      onExpand={handleExpand}
      rowClassName={(row) => cn(!row.enabled ? 'opacity-60' : '')}
      renderExpandedRow={({ row }) => <NodeDetails row={row} />}
    />
  );
}
