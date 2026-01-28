import * as React from 'react';
import type { FieldValues } from 'react-hook-form';
import { ChevronDownIcon } from 'lucide-react';

import { FormField } from './form-field';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormFieldProps } from './types';
import { Inline } from '@/components/foundations';
import { FieldButton } from './field-button';

type CalendarProps = React.ComponentProps<typeof Calendar>;

export type DatePickerFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, 'children'> & {
  placeholder?: string;

  /**
   * Button format function (Date -> string)
   */
  format?: (date: Date) => string;

  /**
   * Extra props for the Calendar (excluding controlled selected/onSelect)
   */
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect'>;

  triggerProps?: Omit<React.ComponentProps<typeof Button>, 'id' | 'children' | 'aria-invalid' | 'aria-describedby'>;

  /**
   * Allows controlling the popover state from outside (optional)
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /**
   * Closes the popover when a date is selected (default true)
   */
  closeOnSelect?: boolean;

  /**
   * If your form stores string (ISO) instead of Date, you can convert here.
   * - parse: field.value -> Date | undefined
   * - serialize: Date | undefined -> field.onChange(value)
   */
  parse?: (value: any) => Date | undefined;
  serialize?: (date: Date | undefined) => any;
};

export function DatePickerField<T extends FieldValues>({
  placeholder = 'Select date',
  format,
  calendarProps,
  triggerProps,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  closeOnSelect = true,
  parse,
  serialize,
  ...shell
}: DatePickerFieldProps<T>) {
  const [openInternal, setOpenInternal] = React.useState(false);

  const open = openProp ?? openInternal;
  const setOpen = onOpenChangeProp ?? setOpenInternal;

  const fmt =
    format ??
    ((d: Date) => {
      // simple & stable
      return d.toLocaleDateString();
    });

  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const raw = field.value;

          const selected: Date | undefined = parse ? parse(raw) : (raw as any) instanceof Date ? raw : raw ? new Date(raw) : undefined;

          const setDate = (d: Date | undefined) => {
            const out = serialize ? serialize(d) : d;
            field.onChange(out);
          };

          const isDisabled = Boolean(a11y.disabled || triggerProps?.disabled);

          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FieldButton
                  {...triggerProps}
                  id={a11y.id}
                  disabled={isDisabled}
                  aria-invalid={a11y['aria-invalid']}
                  aria-describedby={a11y['aria-describedby']}
                  className={triggerProps?.className ?? 'w-48 flex-row justify-between font-normal'}
                >
                  <Inline className='w-full' justify='between' align='center'>
                    {selected ? fmt(selected) : placeholder}
                    <ChevronDownIcon className='ml-2 size-4 text-muted-foreground opacity-50' />
                  </Inline>
                </FieldButton>
              </PopoverTrigger>

              <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
                <Calendar
                  {...calendarProps}
                  mode='single'
                  selected={selected}
                  onSelect={(d) => {
                    setDate(d);
                    field.onBlur();
                    if (closeOnSelect) setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
