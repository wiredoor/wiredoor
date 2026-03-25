import * as React from 'react';
import Joi from 'joi';
import type { FieldValues } from 'react-hook-form';

import { useShake } from '@/hooks/use-shake';
import { useForm } from '@/hooks/use-form';

export function useAppForm<TForm extends FieldValues, TData>(cfg: {
  id?: string | number;
  schema: Joi.ObjectSchema<TForm>;
  defaultValues?: Partial<TForm>;

  get?: (id: number, opts?: { signal?: AbortSignal }) => Promise<TData>;
  mapToFormValues?: (data: TData) => TForm;

  create: (values: TForm) => Promise<any>;
  update?: (id: number, values: TForm) => Promise<any>;

  onSuccess?: (ctx: { id?: number; result: any }) => void;
  onCancel?: () => void;

  getErrorMessage?: (err: any) => string;
}) {
  const id = cfg.id !== undefined && cfg.id !== null && cfg.id !== '' ? Number(cfg.id) : undefined;
  const isEdit = id !== undefined && Number.isFinite(id);

  const { shake, triggerShake } = useShake();

  const form = useForm<TForm>({
    mode: 'onSubmit',
    schema: cfg.schema,
    defaultValues: cfg.defaultValues as any,
    onSubmit: async (values: TForm) => {
      console.log('Submitting form with values:', values);
      try {
        const result = isEdit && cfg.update ? await cfg.update(id!, values) : await cfg.create(values);
        cfg.onSuccess?.({ id, result });
      } catch (err: any) {
        triggerShake();
        const message = cfg.getErrorMessage?.(err) ?? err?.response?.data?.message ?? err?.message ?? 'Unknown Server Error';
        if (err.status === 422) {
          err.response.data.errors?.body?.forEach((i: { field: string; message: string }) => {
            if (i.field && i.message) {
              form.setError(i.field as any, { type: 'server', message: i.message });
            }
          });
        } else {
          form.setError('root' as any, { message });
        }
      }
    },
    onError: (err: any) => {
      void err;
      triggerShake();
    },
  });

  const getRef = React.useRef(cfg.get);
  const mapRef = React.useRef(cfg.mapToFormValues);

  const resetRef = React.useRef(form.reset);

  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<any>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const inFlightRef = React.useRef(false);
  const lastLoadedIdRef = React.useRef<number | null>(null);

  const doLoad = React.useCallback(
    async (force = false) => {
      if (!isEdit) return;

      const get = getRef.current;
      if (!get) return;

      if (!force && lastLoadedIdRef.current === id) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setLoadError(null);

      try {
        const data = await get(id!, { signal: ac.signal });
        const values = mapRef.current ? mapRef.current(data) : (data as any as TForm);
        resetRef.current(values);
        lastLoadedIdRef.current = id!;
      } catch (err: any) {
        if (err?.name !== 'AbortError') setLoadError(err);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [isEdit, id],
  );

  React.useEffect(() => {
    lastLoadedIdRef.current = null;
    void doLoad(false);

    return () => {
      abortRef.current?.abort();
    };
  }, [doLoad]);

  const cancel = React.useCallback(() => cfg.onCancel?.(), [cfg.onCancel]);

  return {
    form,
    id,
    loading,
    loadError,
    shake,
    cancel,
    retry: () => doLoad(true),
  };
}
