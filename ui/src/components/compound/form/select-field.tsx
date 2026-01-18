import * as React from "react";
import { type FieldValues } from "react-hook-form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";

import { FormFieldProps } from "./types";
import { FormField } from "./form-field";

export type SelectOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  disabled?: boolean;
};

export type SelectFieldProps<T extends FieldValues, V extends string = string> = Omit<FormFieldProps<T>, "children"> & {
  options: Array<SelectOption<V>>;
  placeholder?: string;

  parseValue?: (v: string) => any;
  formatValue?: (v: any) => string | undefined;

  triggerProps?: Omit<React.ComponentProps<typeof SelectTrigger>, "id" | "disabled" | "aria-invalid" | "aria-describedby">;

  contentProps?: Omit<React.ComponentProps<typeof SelectContent>, "children">;
};

export function SelectField<T extends FieldValues, V extends string = string>({
  options,
  placeholder = "Select an option",
  parseValue = (v) => v,
  formatValue = (v) => (v == null || v === "" ? undefined : String(v)),
  triggerProps,
  contentProps,
  ...shell
}: SelectFieldProps<T, V>) {
  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => (
          <Select value={formatValue(field.value)} onValueChange={(v) => field.onChange(parseValue(v))} disabled={a11y.disabled}>
            <SelectTrigger
              {...triggerProps}
              id={a11y.id}
              disabled={a11y.disabled}
              aria-invalid={a11y["aria-invalid"]}
              aria-describedby={a11y["aria-describedby"]}
              onBlur={(e) => {
                triggerProps?.onBlur?.(e as any);
                field.onBlur();
              }}
              ref={field.ref as any}
              className="w-full"
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
