import * as React from 'react';
import type { FieldValues } from 'react-hook-form';
import type { UseQueryResult } from '@tanstack/react-query';

import { useHydrateFormOnce } from '@/hooks/use-hydrate-form-once';
import { useShake } from '@/hooks/use-shake';

import { useForm } from '@/hooks/use-form';

export function useAppForm<TForm extends FieldValues, TData>(cfg: {
  id?: string | number;

  schema: any;

  /**
   * Default values for create (or function if needed)
   */
  defaultValues?: Partial<TForm>;

  /**
   * data fetching hook  (for edit forms)
   */
  useGet?: (id: number) => UseQueryResult<TData, any>;

  /**
   * mapper API data -> form values
   */
  mapToFormValues?: (data: TData) => TForm;

  /**
   * actions
   */
  create: (values: TForm) => Promise<any>;
  update?: (id: number, values: TForm) => Promise<any>;

  /**
   * callbacks
   */
  onSuccess?: (ctx: { id?: number; result: any }) => void;
  onCancel?: () => void;

  /**
   * Custom error message extractor
   */
  getErrorMessage?: (err: any) => string;
}) {
  const numericId = cfg.id !== undefined && cfg.id !== null && cfg.id !== '' ? Number(cfg.id) : undefined;

  const { shake, triggerShake } = useShake();

  const form = useForm<TForm>({
    mode: 'onSubmit',
    schema: cfg.schema,
    defaultValues: cfg.defaultValues as any,
    onSubmit: async (values: TForm) => {
      try {
        const result = numericId && cfg.update ? await cfg.update(numericId, values) : await cfg.create(values);

        cfg.onSuccess?.({ id: numericId, result });
      } catch (err: any) {
        triggerShake();
        const message = cfg.getErrorMessage?.(err) ?? err?.response?.data?.message ?? err?.message ?? 'Unknown Server Error';

        form.setError('root' as any, { message });
      }
    },
    onError: (err: any) => {
      triggerShake();
      const message = cfg.getErrorMessage?.(err) ?? err?.response?.data?.message ?? 'Validation Error';

      form.setError('root' as any, { message });
    },
  });

  const query = numericId && cfg.useGet ? cfg.useGet(numericId) : null;

  useHydrateFormOnce<TForm, TData>({
    form,
    data: query?.data,
    mapToFormValues: (data) => cfg.mapToFormValues?.(data) ?? (data as any as TForm),
    resetKey: numericId,
  });

  const cancel = React.useCallback(() => cfg.onCancel?.(), [cfg]);

  return { form, id: numericId, query, shake, cancel };
}
