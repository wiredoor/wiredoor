import * as React from "react";
import type { FieldValues } from "react-hook-form";

import { FormField } from "./form-field";
import { FormFieldProps } from "./types";
import { Textarea } from "@/components/ui";

type TextareaExtraProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "id" | "name" | "disabled" | "required" | "aria-invalid" | "aria-describedby" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref"
>;

export type TextareaFieldProps<T extends FieldValues> = Omit<FormFieldProps<T>, "children"> & {
  textareaProps?: TextareaExtraProps;
};

export function TextareaField<T extends FieldValues>({ textareaProps, ...shell }: TextareaFieldProps<T>) {
  return (
    <FormField<T> {...shell}>
      <FormField.Register<T>>
        {({ reg, a11y }) => (
          <Textarea
            {...textareaProps}
            {...reg}
            id={a11y.id}
            disabled={a11y.disabled}
            aria-invalid={a11y["aria-invalid"]}
            aria-describedby={a11y["aria-describedby"]}
          />
        )}
      </FormField.Register>
    </FormField>
  );
}
