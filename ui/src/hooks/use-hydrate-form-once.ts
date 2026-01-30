import * as React from 'react';
import { useForm } from './use-form';
import { FieldValues } from 'react-hook-form';

export function useHydrateFormOnce<TForm extends FieldValues, TData>(opts: {
  form: ReturnType<typeof useForm<TForm>>;
  data: TData | undefined;
  mapToFormValues: (data: TData) => TForm;
  resetKey?: string | number;
}) {
  const { form, data, mapToFormValues, resetKey } = opts;
  const hydratedRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!data) return;

    const k = String(resetKey ?? 'default');

    if (hydratedRef.current === k) return;

    hydratedRef.current = k;
    form.reset(mapToFormValues(data), {
      keepDirty: true,
      keepTouched: true,
      keepErrors: true,
    });
  }, [data, resetKey, form, mapToFormValues]);
}
