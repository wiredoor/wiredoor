import { FieldValues } from 'react-hook-form';
import { CheckedState } from '@radix-ui/react-checkbox';
import { Checkbox } from '@/components/ui/checkbox';
import { FormFieldProps } from './types';
import { FormField } from './form-field';
import { Text } from '@/components/foundations';

export type CheckboxFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> & {
  /** label del row (al lado del checkbox) */
  label: React.ReactNode;
  labelClassName?: string;
  className?: string;
  checkboxProps?: Omit<
    React.ComponentProps<typeof Checkbox>,
    'id' | 'disabled' | 'checked' | 'defaultChecked' | 'onCheckedChange' | 'aria-invalid' | 'aria-describedby'
  >;

  hideHeaderLabel?: boolean;
};

export function CheckboxField<T extends FieldValues>({
  label,
  labelClassName,
  className,
  checkboxProps,
  hideHeaderLabel = true,
  ...shell
}: CheckboxFieldProps<T>) {
  return (
    <FormField<T> {...shell} label={hideHeaderLabel ? undefined : label}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const checked = (field.value ?? false) as CheckedState;

          const setChecked = (v: CheckedState) => {
            field.onChange(v === 'indeterminate' ? true : v);
            field.onBlur();
          };

          const toggle = () => {
            if (a11y.disabled) return;
            setChecked(checked === true ? false : true);
          };

          return (
            <div
              className={className}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: a11y.disabled ? 'not-allowed' : 'pointer',
              }}
              onPointerDown={(e) => {
                if (a11y.disabled) return;

                const target = e.target as HTMLElement;
                const insideCheckbox = target.closest?.('[data-checkbox-root]') != null;

                if (insideCheckbox) return;

                e.preventDefault();
                toggle();
              }}
            >
              <Checkbox
                {...checkboxProps}
                data-checkbox-root
                id={a11y.id}
                disabled={a11y.disabled}
                aria-invalid={a11y['aria-invalid']}
                aria-describedby={a11y['aria-describedby']}
                checked={checked}
                onCheckedChange={setChecked}
                ref={field.ref as any}
              />

              <Text className={labelClassName} variant='label'>
                {label}
              </Text>
            </div>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}

export type CheckboxRowProps<T extends FieldValues> = Omit<CheckboxFieldProps<T>, 'label'> & {
  rowLabel: React.ReactNode;
};

export function CheckboxRow<T extends FieldValues>({ rowLabel, ...rest }: CheckboxRowProps<T>) {
  return <CheckboxField<T> {...rest} label={rowLabel} hideHeaderLabel />;
}
