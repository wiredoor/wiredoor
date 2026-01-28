import * as React from 'react';
import type { FieldValues } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { FormField } from './form-field';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormFieldProps } from './types';
import { FieldButton } from './field-button';

export type Option<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  disabled?: boolean;
};

export type ComboboxFieldProps<T extends FieldValues, V extends string = string> = Omit<FormFieldProps<T>, 'children'> & {
  options: Array<Option<V>>;

  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;

  /**
   * Allow clearing selection by re-selecting the same value (default true)
   */
  allowClear?: boolean;

  /**
   * Trigger sizing / styling
   */
  triggerClassName?: string;
  popoverClassName?: string;

  /**
   * If your form stores null/undefined instead of empty string, you can convert here.""
   */
  serialize?: (v: V | '') => any;
  parse?: (v: any) => V | '';
};

function labelForValue<V extends string>(options: Array<Option<V>>, value: V | '') {
  const opt = options.find((o) => o.value === value);
  return opt?.label;
}

export function ComboboxField<T extends FieldValues, V extends string = string>({
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results.',
  allowClear = true,
  triggerClassName,
  popoverClassName,
  serialize,
  parse,
  ...shell
}: ComboboxFieldProps<T, V>) {
  const [open, setOpen] = React.useState(false);

  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const raw = field.value;

          const value: V | '' = parse ? parse(raw) : ((raw ?? '') as V | '');

          const setValue = (v: V | '') => {
            const out = serialize ? serialize(v) : v;
            field.onChange(out);
          };

          const selectedLabel = value ? labelForValue(options, value) : null;

          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FieldButton
                  id={a11y.id}
                  role='combobox'
                  aria-expanded={open}
                  disabled={a11y.disabled}
                  aria-invalid={a11y['aria-invalid']}
                  aria-describedby={a11y['aria-describedby']}
                  className={cn('w-48 justify-between', triggerClassName)}
                >
                  <span className={cn(!selectedLabel ? 'text-muted-foreground' : '')}>{selectedLabel ?? placeholder}</span>
                  <ChevronsUpDown className='text-muted-foreground size-4 opacity-50' />
                </FieldButton>
              </PopoverTrigger>

              <PopoverContent className={cn('w-48 p-0', popoverClassName)}>
                <Command>
                  <CommandInput placeholder={searchPlaceholder} className='h-9' />
                  <CommandList>
                    <CommandEmpty>{emptyText}</CommandEmpty>

                    <CommandGroup>
                      {options.map((opt) => {
                        const selected = value === opt.value;

                        return (
                          <CommandItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                            onSelect={(currentValue) => {
                              const next = allowClear && currentValue === value ? '' : (currentValue as V);

                              setValue(next);
                              field.onBlur();
                              setOpen(false);
                            }}
                          >
                            {opt.label}
                            <Check className={cn('ml-auto', selected ? 'opacity-100' : 'opacity-0')} />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
