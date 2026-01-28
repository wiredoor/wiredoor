import { FieldValues } from 'react-hook-form';
import { Switch } from '@/components/ui';
import { FormFieldProps } from './types';
import { FormField } from './form-field';
import { Text } from '@/components/foundations';

export type SwitchFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> & {
  label: React.ReactNode;
  labelClassName?: string;
  className?: string;
  switchProps?: Omit<
    React.ComponentProps<typeof Switch>,
    'id' | 'disabled' | 'checked' | 'defaultChecked' | 'onCheckedChange' | 'aria-invalid' | 'aria-describedby'
  >;
  hideHeaderLabel?: boolean;
};

export function SwitchField<T extends FieldValues>({
  label,
  labelClassName,
  className,
  switchProps,
  hideHeaderLabel = true,
  ...shell
}: SwitchFieldProps<T>) {
  return (
    <FormField<T> {...shell} label={hideHeaderLabel ? undefined : label}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const checked = Boolean(field.value);

          const setChecked = (v: boolean) => {
            field.onChange(v);
            field.onBlur();
          };

          const toggle = () => {
            if (a11y.disabled) return;
            setChecked(!checked);
          };

          return (
            <div
              className={className}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: a11y.disabled ? 'not-allowed' : 'pointer',
              }}
              onPointerDown={(e) => {
                if (a11y.disabled) return;

                const target = e.target as HTMLElement;
                const insideSwitch = target.closest?.('[data-switch-root]') != null;

                if (insideSwitch) return;

                e.preventDefault();
                toggle();
              }}
            >
              <Switch
                {...switchProps}
                data-switch-root
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

export type SwitchRowProps<T extends FieldValues> = Omit<SwitchFieldProps<T>, 'label'> & {
  rowLabel: React.ReactNode;
};

export function SwitchRow<T extends FieldValues>({ rowLabel, ...rest }: SwitchRowProps<T>) {
  return <SwitchField<T> {...rest} label={rowLabel} hideHeaderLabel />;
}
