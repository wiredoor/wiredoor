import { TableToolbar } from '@/components/compound/table/table-toolbar';
import { RemotesTableProps } from './node-list';
import { Icon, Inline } from '@/components/foundations';
import { SelectField, TextField } from '@/components/compound/form';
import { Button } from '@/components/ui/button';

export type NodeFilterProps = {
  filters: RemotesTableProps['filters'];
  onChange: (filters: RemotesTableProps['filters']) => void;
};

export function NodeFilters({ filters, onChange }: NodeFilterProps) {
  return (
    <TableToolbar defaultValues={filters} debounceFields={['search']} onChange={onChange}>
      {(form, isPristine) => (
        <Inline gap={3} className='mb-4'>
          {/* Search */}
          <TextField form={form} name='search' placeholder='Search nodes...' leading={<Icon name='search' />} className='min-w-[200px] max-w-sm' />

          {/* Status Filter */}
          <SelectField
            form={form}
            name='status'
            placeholder='All Statuses'
            className='min-w-[150px]'
            options={[
              { label: 'All Statuses', value: '__none' },
              { label: 'Online', value: 'online' },
              { label: 'Offline', value: 'offline' },
              { label: 'Enabled', value: 'enabled' },
              { label: 'Disabled', value: 'disabled' },
            ]}
            triggerProps={{ icon: <Icon name='funnel' className='opacity-50' /> }}
          />

          <SelectField
            form={form}
            name='type'
            className='min-w-[150px]'
            placeholder='All Types'
            options={[
              { label: 'All Types', value: '__none' },
              { label: 'Nodes', value: 'nodes' },
              { label: 'Gateways', value: 'gateways' },
            ]}
            icon='funnel'
          />

          {isPristine ? null : (
            <Button type='button' variant='ghost' size='sm' onClick={() => form.reset()}>
              Clear
            </Button>
          )}

          {/* Column Settings (placeholder) */}
        </Inline>
      )}
    </TableToolbar>
  );
}
