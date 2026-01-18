import * as React from "react";
import type { FieldValues } from "react-hook-form";

import { FormField } from "./form-field"; // tu shell + Control
import { RadioGroup, RadioGroupItem } from "@/components/ui";
import { FormFieldProps } from "./types";

export type RadioOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

export type RadioGroupFieldProps<T extends FieldValues, V extends string = string> = Omit<FormFieldProps<T>, "children"> & {
  options: Array<RadioOption<V>>;
  direction?: "vertical" | "horizontal";
  radioGroupProps?: Omit<React.ComponentProps<typeof RadioGroup>, "value" | "defaultValue" | "onValueChange" | "disabled">;
};

export function RadioGroupField<T extends FieldValues, V extends string = string>({
  options,
  direction = "vertical",
  radioGroupProps,
  ...shell
}: RadioGroupFieldProps<T, V>) {
  return (
    <FormField<T> {...shell}>
      <FormField.Control<T>>
        {({ field, a11y }) => {
          const value = field.value == null ? "" : String(field.value);

          return (
            <RadioGroup
              {...radioGroupProps}
              value={value}
              onValueChange={(v) => field.onChange(v)}
              onBlur={(e) => {
                radioGroupProps?.onBlur?.(e as any);
                field.onBlur();
              }}
              disabled={a11y.disabled as any}
              aria-invalid={a11y["aria-invalid"]}
              aria-describedby={a11y["aria-describedby"]}
              style={{
                display: "grid",
                gap: 10,
                ...(direction === "horizontal" ? { gridAutoFlow: "column", justifyContent: "start" } : {}),
                ...(radioGroupProps?.style ?? {}),
              }}
            >
              {options.map((opt) => {
                const id = `${a11y.id}-${String(opt.value)}`;
                const disabled = Boolean(a11y.disabled || opt.disabled);

                return (
                  <label
                    key={String(opt.value)}
                    htmlFor={id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "18px 1fr",
                      alignItems: "start",
                      gap: 10,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.6 : 1,
                    }}
                    onPointerDown={(e) => {
                      if (disabled) return;

                      // evita doble dispatch si click en el control
                      const target = e.target as HTMLElement;
                      const insideRadio = target.closest?.("[data-radio-root]") != null;
                      if (insideRadio) return;

                      e.preventDefault();
                      field.onChange(String(opt.value));
                    }}
                  >
                    <RadioGroupItem
                      id={id}
                      value={String(opt.value)}
                      disabled={disabled}
                      data-radio-root
                      ref={value === String(opt.value) ? (field.ref as any) : undefined}
                    />

                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 14 }}>{opt.label}</div>
                      {opt.description ? <div style={{ fontSize: 12, opacity: 0.75 }}>{opt.description}</div> : null}
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          );
        }}
      </FormField.Control>
    </FormField>
  );
}
