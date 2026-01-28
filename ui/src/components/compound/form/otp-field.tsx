import * as React from 'react';
import type { FieldValues } from 'react-hook-form';

import { FormField } from './form-field';

import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui';
import { FormFieldProps } from './types';

export type OtpFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> & {
  length?: number;

  separators?: number[];

  otpProps?: Omit<
    React.ComponentProps<typeof InputOTP>,
    'value' | 'onChange' | 'maxLength' | 'disabled' | 'aria-invalid' | 'aria-describedby' | 'id' | 'render'
  >;

  slotClassName?: string;
  groupClassName?: string;
  containerClassName?: string;
};

export function OtpField<T extends FieldValues>({
  length = 6,
  separators,
  otpProps,
  slotClassName,
  groupClassName,
  containerClassName,
  ...shell
}: OtpFieldProps<T>) {
  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const value = String(field.value ?? '');

          const handleChange = (next: string) => {
            field.onChange(next);
          };

          const sepSet = new Set(separators ?? []);

          return (
            <InputOTP
              {...otpProps}
              id={a11y.id}
              value={value}
              onChange={handleChange}
              maxLength={length}
              disabled={a11y.disabled}
              aria-invalid={a11y['aria-invalid']}
              aria-describedby={a11y['aria-describedby']}
              onBlur={() => field.onBlur()}
              containerClassName={containerClassName ?? (otpProps as any)?.containerClassName}
            >
              <InputOTPGroup className={groupClassName}>
                {Array.from({ length }).map((_, i) => (
                  <React.Fragment key={i}>
                    <InputOTPSlot index={i} className={slotClassName} />
                    {sepSet.has(i + 1) ? <InputOTPSeparator /> : null}
                  </React.Fragment>
                ))}
              </InputOTPGroup>
            </InputOTP>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
