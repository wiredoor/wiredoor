import { FieldValues } from 'react-hook-form';
import { Switch } from '@/components/ui';
import { FormFieldProps } from './types';
import { FormField } from './form-field';
import { Text } from '@/components/foundations';
import { FieldShell } from './field-shell';

type SwitchProps = {
  label: React.ReactNode;
  labelClassName?: string;
  className?: string;
  switchProps?: Omit<
    React.ComponentProps<typeof Switch>,
    'id' | 'disabled' | 'checked' | 'defaultChecked' | 'onCheckedChange' | 'aria-invalid' | 'aria-describedby'
  >;
};

export type SwitchFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> &
  SwitchProps & {
    hideHeaderLabel?: boolean;
  };

export type SwitchInputProps = SwitchProps & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hideHeaderLabel?: boolean;
};

export type SwitchControlProps = SwitchProps & {
  id?: string;
  disabled?: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  inputRef?: React.Ref<any>;
};

function SwitchControl({
  id,
  disabled,
  checked,
  onCheckedChange,
  label,
  labelClassName,
  className,
  switchProps,
  inputRef,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: SwitchControlProps) {
  const toggle = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onPointerDown={(e) => {
        if (disabled) return;

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
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        checked={checked}
        onCheckedChange={onCheckedChange}
        ref={inputRef}
      />

      <Text className={labelClassName} variant='label'>
        {label}
      </Text>
    </div>
  );
}

// Switch without form context, useful for standalone use or inside custom field shells
export function SwitchInput({
  checked,
  onCheckedChange,
  label,
  labelClassName,
  className,
  switchProps,
  hideHeaderLabel = true,
  ...shell
}: SwitchInputProps) {
  return (
    <FieldShell
      {...shell}
      label={hideHeaderLabel ? undefined : label}
      render={({ a11y }) => (
        <SwitchControl
          id={a11y.id}
          disabled={a11y.disabled}
          aria-invalid={a11y['aria-invalid']}
          aria-describedby={a11y['aria-describedby']}
          checked={checked}
          onCheckedChange={onCheckedChange}
          label={label}
          labelClassName={labelClassName}
          className={className}
          switchProps={switchProps}
        />
      )}
    />
  );
}

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
        {({ field, a11y }) => (
          <SwitchControl
            id={a11y.id}
            disabled={a11y.disabled}
            aria-invalid={a11y['aria-invalid']}
            aria-describedby={a11y['aria-describedby']}
            checked={Boolean(field.value)}
            onCheckedChange={(v) => {
              field.onChange(v);
              field.onBlur();
            }}
            inputRef={field.ref}
            label={label}
            labelClassName={labelClassName}
            className={className}
            switchProps={switchProps}
          />
        )}
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
