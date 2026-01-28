import * as React from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { useForm } from '@/hooks/use-form';
import { useDebouncedValue } from '@/hooks/use-debounce';

import { Button } from '@/components/ui/button';
import { Inline } from '@/components/foundations';

function isRenderProp<T>(children: React.ReactNode | ((form: any) => React.ReactNode)): children is (form: T) => React.ReactNode {
  return typeof children === 'function';
}

export type DataTableToolbarProps<TValues extends FieldValues> = {
  defaultValues: DefaultValues<TValues>;

  schema?: z.ZodType<TValues, any>;

  debounceMs?: number;

  onFiltersChange: (values: TValues) => void;

  children: React.ReactNode | ((form: ReturnType<typeof useForm<TValues>>) => React.ReactNode);

  actions?: React.ReactNode;

  showClear?: boolean;

  clearLabel?: string;

  className?: string;

  hideClearWhenPristine?: boolean;
};

export function DataTableToolbar<TValues extends FieldValues>({
  defaultValues,
  schema,
  debounceMs = 300,
  onFiltersChange,
  children,
  actions,
  showClear = true,
  clearLabel = 'Clear',
  className,
  hideClearWhenPristine = true,
}: DataTableToolbarProps<TValues>) {
  // Tu hook exige onSubmit; aquí lo usamos como "noop" porque no habrá submit manual.
  const form = useForm<TValues>({
    schema,
    defaultValues,
    mode: 'onChange',
    onSubmit: async (values) => values,
  });

  const watched = useWatch({ control: form.control }) as TValues;
  const debounced = useDebouncedValue(watched, debounceMs);

  // Emit debounced filters
  React.useEffect(() => {
    onFiltersChange(debounced);
  }, [debounced, onFiltersChange]);

  const isPristine = React.useMemo(() => {
    try {
      return JSON.stringify(watched) === JSON.stringify(defaultValues);
    } catch {
      return false;
    }
  }, [watched, defaultValues]);

  const canClear = showClear && !(hideClearWhenPristine && isPristine);

  return (
    <FormProvider {...form} handleSubmit={() => form.handleSubmit}>
      <Inline className={['px-4 py-3 border-b bg-muted/30 rounded-lg justify-between', className ?? ''].join(' ')}>
        <Inline className='items-center gap-2 flex-wrap'>
          {isRenderProp<ReturnType<typeof useForm<TValues>>>(children) ? children(form) : children}

          {canClear ? (
            <Button variant='ghost' onClick={() => form.reset(defaultValues)}>
              {clearLabel}
            </Button>
          ) : null}
        </Inline>

        {/* Right: actions */}
        {actions ? <Inline className='ml-auto items-center gap-2'>{actions}</Inline> : null}
      </Inline>
    </FormProvider>
  );
}
