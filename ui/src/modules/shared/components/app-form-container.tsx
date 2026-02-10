import React from 'react';
import type { FieldValues } from 'react-hook-form';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppForm } from '@/hooks/use-app-form';

type AppFormContainerProps<TForm extends FieldValues, TData> = {
  id?: string | number;

  schema: any;
  defaultValues?: Partial<TForm>;

  resetKey?: string | number;

  useGet?: (id: number) => UseQueryResult<TData, any>;
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
  resetKey,
  useGet,
  mapToFormValues,
  create,
  update,
  onSuccess,
  onCancel,
  ...props
}: AppFormContainerProps<TForm, TData>) {
  const { form, query, shake, cancel } = useAppForm<TForm, TData>({
    id,
    schema,
    defaultValues,
    resetKey,
    useGet,
    mapToFormValues,
    create,
    update,
    onSuccess,
    onCancel,
  });

  const loading = Boolean(!!id && (query?.isLoading || (query?.isFetching && !query?.data)));

  if (!!id && query?.isError) {
    return (
      <div className='p-6 text-sm'>
        <div className='font-medium'>Failed to load</div>
        <div className='text-muted-foreground'>Please try again.</div>
      </div>
    );
  }

  return <>{props.render({ form, shake, loading, onCancel: cancel })}</>;
}
