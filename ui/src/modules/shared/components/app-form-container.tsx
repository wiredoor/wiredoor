import React from 'react';
import type { FieldValues } from 'react-hook-form';

import { useAppForm } from '@/hooks/use-app-form';
import { Button } from '@/components/ui';

type AppFormContainerProps<TForm extends FieldValues, TData> = {
  id?: string | number;

  schema: any;
  defaultValues?: Partial<TForm>;

  get?: (id: number) => Promise<TData>;
  mapToFormValues?: (data: TData) => TForm;

  create: (values: TForm) => Promise<any>;
  update?: (id: number, values: TForm) => Promise<any>;

  onSuccess?: (ctx: { id?: number; result: any }) => void;
  onCancel?: () => void;

  render: (ctx: { form: any; shake: boolean; loading: boolean; onCancel: () => void }) => React.ReactNode;
};

export function AppFormContainer<TForm extends FieldValues, TData>({
  id,
  schema,
  defaultValues,
  get,
  mapToFormValues,
  create,
  update,
  onSuccess,
  onCancel,
  ...props
}: AppFormContainerProps<TForm, TData>) {
  const { form, loading, loadError, shake, cancel, retry } = useAppForm<TForm, TData>({
    id,
    schema,
    defaultValues,
    get,
    mapToFormValues,
    create,
    update,
    onSuccess,
    onCancel,
  });

  if (!!id && loadError) {
    return (
      <div className='p-6 text-sm space-y-3'>
        <div>
          <div className='font-medium'>Failed to load</div>
          <div className='text-muted-foreground'>Please try again.</div>
        </div>

        <div className='flex gap-2'>
          <Button onClick={() => retry()} disabled={loading}>
            Retry
          </Button>

          {onCancel && (
            <Button variant='ghost' size='sm' onClick={() => cancel()} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{props.render({ form, shake, loading, onCancel: cancel })}</>;
}
