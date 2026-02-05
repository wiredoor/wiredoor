import * as React from 'react';
import { type FieldValues } from 'react-hook-form';

import { FormFieldProps } from './types';
import { FormField } from './form-field';
import { Icon, IconName } from '@/components/foundations';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

export type SelectOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  disabled?: boolean;
};

export type SelectFieldProps<T extends FieldValues, V extends string = string> = Omit<FormFieldProps<T>, 'children'> & {
  options: Array<SelectOption<V>>;
  placeholder?: string;
  icon?: IconName | React.ReactNode;

  parseValue?: (v: string) => any;
  formatValue?: (v: any) => string | undefined;

  triggerProps?: Omit<React.ComponentProps<typeof SelectTrigger>, 'id' | 'disabled' | 'aria-invalid' | 'aria-describedby'>;

  contentProps?: Omit<React.ComponentProps<typeof SelectContent>, 'children'>;
};

export function SelectField<T extends FieldValues, V extends string = string>({
  options,
  placeholder = 'Select an option',
  icon,
  parseValue = (v) => (v == null || v === '' || v === '__none' ? undefined : v),
  formatValue = (v) => (v == null || v === '' || v === '__none' ? undefined : String(v)),
  triggerProps,
  contentProps,
  ...shell
}: SelectFieldProps<T, V>) {
  const tProps = {
    icon: icon ? typeof icon === 'string' ? <Icon name={icon as IconName} className='opacity-50' /> : icon : undefined,
    ...triggerProps,
  };
  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => (
          <Select value={formatValue(field.value)} onValueChange={(v) => field.onChange(parseValue(v))} disabled={a11y.disabled}>
            <SelectTrigger
              {...tProps}
              id={a11y.id}
              disabled={a11y.disabled}
              aria-invalid={a11y['aria-invalid']}
              aria-describedby={a11y['aria-describedby']}
              onBlur={(e) => {
                tProps.onBlur?.(e as any);
                field.onBlur();
              }}
              ref={field.ref as any}
              className='w-full text-muted-foreground'
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent {...contentProps}>
              {options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)} disabled={o.disabled}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField.Control>
    </FormField>
  );
}
