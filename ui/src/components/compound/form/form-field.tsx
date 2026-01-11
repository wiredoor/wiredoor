import * as React from "react";

import {
  Field,
  Input,
  PasswordInput,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldSeparator,
  FieldContent,
  FieldGroup,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@/components/ui";

type ControlA11y = {
  id: string;
  name?: string;
  disabled?: boolean;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

type FormFieldContextValue = ControlA11y;

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null,
);

function useFormField() {
  const ctx = React.useContext(FormFieldContext);
  if (!ctx) throw new Error("FormField.* must be used within <FormField />");
  return ctx;
}

function joinIds(ids: Array<string | undefined>) {
  const s = ids.filter(Boolean).join(" ");
  return s.length ? s : undefined;
}

export type FormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  id?: string;
  name?: string;

  // text
  title?: React.ReactNode;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;

  // flags
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;

  // layout helpers
  /**
   * When true, wraps content in FieldSet/FieldLegend (useful for grouped inputs).
   */
  asFieldSet?: boolean;
  legend?: React.ReactNode;
  /**
   * Adds a separator between header (title/label/description) and the control
   */
  separator?: boolean;

  /**
   * Control renderer so we can inject a11y props into your Input components.
   */
  render: (control: ControlA11y) => React.ReactNode;
};

export function FormField({
  className,
  id: idProp,
  name,
  title,
  label,
  description,
  error,
  required,
  disabled = false,
  invalid: invalidProp,
  asFieldSet = false,
  legend,
  separator = false,
  render,
  ...props
}: FormFieldProps) {
  const reactId = React.useId();
  const id = idProp ?? `field-${reactId}`;

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error || invalidProp ? `${id}-error` : undefined;

  const invalid = Boolean(invalidProp || error);
  const describedBy = joinIds([descriptionId, errorId]);

  const control: ControlA11y = {
    id,
    name,
    disabled,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": describedBy,
  };

  const Header = (
    <>
      {title ? <FieldTitle>{title}</FieldTitle> : null}

      {label ? (
        <FieldLabel htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </FieldLabel>
      ) : null}

      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}

      {separator ? <FieldSeparator /> : null}
    </>
  );

  const Body = (
    <FormFieldContext.Provider value={control}>
      <FieldContent>
        <FieldGroup>{render(control)}</FieldGroup>
        {invalid ? (
          <FieldError id={errorId}>{error ?? "Invalid value"}</FieldError>
        ) : null}
      </FieldContent>
    </FormFieldContext.Provider>
  );

  // root wrapper: Field (y luego opcional FieldSet)
  return (
    <div className={className} {...props}>
      <Field id={id}>
        {asFieldSet ? (
          <FieldSet>
            {legend ? <FieldLegend>{legend}</FieldLegend> : null}
            {Header}
            {Body}
          </FieldSet>
        ) : (
          <>
            {Header}
            {Body}
          </>
        )}
      </Field>
    </div>
  );
}

/**
 * Helpers: para que tu "render" sea consistente y no repitas a11y props.
 * Los usas dentro de render={() => <FormField.Input .../>}
 */
FormField.Input = function FormFieldInput(
  props: Omit<
    React.ComponentProps<typeof Input>,
    "id" | "name" | "disabled" | "aria-invalid" | "aria-describedby"
  >,
) {
  const c = useFormField();
  return (
    <Input
      {...props}
      id={c.id}
      name={c.name}
      disabled={c.disabled}
      aria-invalid={c["aria-invalid"]}
      aria-describedby={c["aria-describedby"]}
    />
  );
};

FormField.Password = function FormFieldPassword(
  props: Omit<
    React.ComponentProps<typeof PasswordInput>,
    "id" | "name" | "disabled" | "aria-invalid" | "aria-describedby"
  >,
) {
  const c = useFormField();
  return (
    <PasswordInput
      {...props}
      id={c.id}
      name={c.name}
      disabled={c.disabled}
      aria-invalid={c["aria-invalid"]}
      aria-describedby={c["aria-describedby"]}
    />
  );
};

// FormField.Otp = function FormFieldOtp(
//   props: Omit<
//     React.ComponentProps<typeof InputOTP>,
//     "id" | "name" | "disabled" | "aria-invalid" | "aria-describedby"
//   >,
// ) {
//   const c = useFormField();
//   return (
//     <InputOTP
//       {...props}
//       id={c.id}
//       name={c.name}
//       disabled={c.disabled}
//       maxLength={6}
//       aria-invalid={c["aria-invalid"]}
//       aria-describedby={c["aria-describedby"]}
//     />
//   );
// };
