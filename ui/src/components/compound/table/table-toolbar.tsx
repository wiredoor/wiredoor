import * as React from 'react';
import Joi from 'joi';
import { DefaultValues, type FieldValues, useWatch } from 'react-hook-form';

import { useForm } from '@/hooks/use-form';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { Form } from '@/components/compound/form';

export type DataTableToolbarProps<TValues extends FieldValues> = {
  defaultValues: TValues;
  schema?: Joi.ObjectSchema<TValues>;

  onChange: (values: TValues) => void;
  debounceMs?: number;

  debounceFields?: Array<keyof TValues>;

  children: React.ReactNode | ((form: ReturnType<typeof useForm<TValues>>, isPristine: boolean) => React.ReactNode);
};

function isFn<TValues extends FieldValues>(x: any): x is (form: ReturnType<typeof useForm<TValues>>, isPristine: boolean) => React.ReactNode {
  return typeof x === 'function';
}

function stableStringify(value: any): string {
  return JSON.stringify(value ?? {});
}

export function TableToolbar<TValues extends FieldValues>({
  defaultValues,
  schema,
  onChange,
  debounceMs = 300,
  debounceFields = [],
  children,
}: DataTableToolbarProps<TValues>) {
  const form = useForm<TValues>({
    schema,
    defaultValues: defaultValues as DefaultValues<TValues>,
    mode: 'onChange',
    onSubmit: async (v) => v,
  });

  const watched = useWatch({ control: form.control }) as TValues;

  const debouncedSlice = React.useMemo(() => {
    const slice: Partial<TValues> = {};
    for (const k of debounceFields) slice[k] = watched?.[k];
    return slice;
  }, [watched, debounceFields]);

  const debouncedSliceValue = useDebouncedValue(debouncedSlice, debounceMs);

  const payload = React.useMemo(() => {
    return { ...(watched as any), ...(debouncedSliceValue as any) } as TValues;
  }, [watched, debouncedSliceValue]);

  const lastEmittedRef = React.useRef<string>('');

  React.useEffect(() => {
    const next = stableStringify(payload);
    if (next === lastEmittedRef.current) return;
    lastEmittedRef.current = next;

    onChange(payload);
  }, [payload, onChange]);

  const isPristine = React.useMemo(() => {
    try {
      return stableStringify(watched) === stableStringify(defaultValues);
    } catch {
      return false;
    }
  }, [watched, defaultValues]);

  return <Form form={form}>{isFn<TValues>(children) ? children(form, isPristine) : children}</Form>;
}
