import * as React from 'react';
import { FieldValues } from 'react-hook-form';

import { FormField } from './form-field';
import { FormFieldProps } from './types';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

type Adornment = React.ReactNode | string;

type TextFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> & {
  leading?: Adornment;
  trailing?: Adornment;
  leadingInteractive?: boolean;
  trailingInteractive?: boolean;
} & Omit<React.ComponentProps<typeof InputGroupInput>, 'id' | 'name' | 'disabled' | 'required' | 'aria-invalid' | 'aria-describedby' | 'form'>;

function renderAdornment(node: Adornment) {
  return typeof node === 'string' ? <span className='text-xs text-muted-foreground'>{node}</span> : node;
}

export function TextField<T extends FieldValues>(props: TextFieldProps<T>) {
  const {
    form,
    name,

    leading,
    trailing,
    leadingInteractive,
    trailingInteractive,

    className,
    ...rest
  } = props;

  return (
    <FormField<T> form={form} name={name} className={className} {...rest}>
      <FormField.Register<T>>
        {({ reg, a11y }) => (
          <InputGroup>
            {leading != null && (
              <InputGroupAddon align='inline-start' className={leadingInteractive ? 'pointer-events-auto' : undefined}>
                {renderAdornment(leading)}
              </InputGroupAddon>
            )}

            <InputGroupInput {...rest} {...reg} {...a11y} className={[className, leading != null ? 'pl-9' : ''].filter(Boolean).join(' ')} />

            {trailing != null && (
              <InputGroupAddon align='inline-end' className={trailingInteractive ? 'pointer-events-auto' : undefined}>
                {renderAdornment(trailing)}
              </InputGroupAddon>
            )}
          </InputGroup>
        )}
      </FormField.Register>
    </FormField>
  );
}
