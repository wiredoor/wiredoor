import { TableToolbar } from '@/components/compound/table/table-toolbar';
import { Icon, Inline } from '@/components/foundations';
import { TextField } from '@/components/compound/form';
import { Button } from '@/components/ui/button';
import { HttpResourceTableProps } from './http-resource-list';

export type HttpResourceFilterProps = {
  filters: HttpResourceTableProps['filters'];
  onChange: (filters: HttpResourceTableProps['filters']) => void;
};

export function HttpResourceFilters({ filters, onChange }: HttpResourceFilterProps) {
  return (
    <TableToolbar defaultValues={filters} debounceFields={['search']} onChange={onChange}>
      {(form, isPristine) => (
        <Inline gap={3} className='mb-4'>
          {/* Search */}
          <TextField
            form={form}
            name='search'
            placeholder='Search resources...'
            leading={<Icon name='search' />}
            className='min-w-[200px] max-w-sm'
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
