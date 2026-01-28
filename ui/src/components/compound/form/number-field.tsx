import { Input } from '@/components/ui';
import { FieldValues } from 'react-hook-form';
import { FormField } from './form-field';
import { FormFieldProps } from './types';

export function NumberField<T extends FieldValues>(
  props: Omit<FormFieldProps<T>, 'children'> & {
    min?: number;
    max?: number;
    step?: number;
    parseAs?: 'number' | 'string';
  } & Omit<
      React.ComponentProps<typeof import('@/components/ui').Input>,
      'id' | 'name' | 'disabled' | 'required' | 'aria-invalid' | 'aria-describedby' | 'value' | 'defaultValue' | 'onChange'
    >,
) {
  const { min, max, step, parseAs = 'number', ...shell } = props;

  return (
    <FormField<T> {...(shell as any)}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const value = field.value === null || field.value === undefined ? '' : String(field.value);

          return (
            <Input
              {...(shell as any)}
              id={a11y.id}
              disabled={a11y.disabled}
              aria-invalid={a11y['aria-invalid']}
              aria-describedby={a11y['aria-describedby']}
              inputMode='numeric'
              type='number'
              min={min}
              max={max}
              step={step}
              value={value}
              onBlur={field.onBlur}
              ref={field.ref as any}
              onChange={(e) => {
                const raw = e.target.value;

                if (parseAs === 'string') {
                  field.onChange(raw);
                  return;
                }

                // parseAs number
                if (raw === '') {
                  field.onChange(undefined);
                  return;
                }

                const n = Number(raw);
                field.onChange(Number.isNaN(n) ? undefined : n);
              }}
            />
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
