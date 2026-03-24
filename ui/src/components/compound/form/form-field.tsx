import * as React from 'react';
import { useController, type FieldValues } from 'react-hook-form';

import { FieldShell } from './field-shell';
import { ControlRenderArgs, FormFieldCtx, FormFieldProps, RegisterRenderArgs, ControlA11y } from './types';

const Ctx = React.createContext<FormFieldCtx<any> | null>(null);

export function useFormField<T extends FieldValues>() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('FormField.* must be used within <FormField />');
  return ctx as FormFieldCtx<T>;
}

export function FormField<T extends FieldValues>({
  className,
  id,
  form,
  name,
  title,
  label,
  helper,
  description,
  required,
  disabled = false,
  invalid: invalidProp,
  errorMessage,
  asFieldSet = false,
  legend,
  separator = false,
  children,
}: FormFieldProps<T>) {
  const { error } = form.getFieldState(name, form.formState);
  const invalid = Boolean(invalidProp || error);

  return (
    <FieldShell
      className={className}
      id={id}
      title={title}
      label={label}
      helper={helper}
      description={description}
      required={required}
      disabled={disabled}
      invalid={invalid}
      errorMessage={(error?.message as string) ?? errorMessage ?? 'Invalid value'}
      asFieldSet={asFieldSet}
      legend={legend}
      separator={separator}
      render={({ a11y }) => {
        const ctxValue: FormFieldCtx<T> = {
          form,
          name,
          a11y: {
            id: a11y.id,
            disabled: a11y.disabled,
            required: a11y.required,
            invalid,
            describedBy: a11y['aria-describedby'],
          },
        };

        return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
      }}
    />
  );
}

FormField.Register = function Register<T extends FieldValues>(props: { children: (args: RegisterRenderArgs<T>) => React.ReactNode }) {
  const c = useFormField<T>();
  const reg = c.form.register(c.name);

  const a11y: ControlA11y = {
    id: c.a11y.id,
    disabled: c.a11y.disabled,
    required: c.a11y.required,
    'aria-invalid': c.a11y.invalid ? true : undefined,
    'aria-describedby': c.a11y.describedBy,
  };

  return <>{props.children({ reg, a11y })}</>;
};

FormField.Control = function Control<T extends FieldValues>(props: { children: (args: ControlRenderArgs<T>) => React.ReactNode }) {
  const c = useFormField<T>();

  const { field } = useController({
    control: c.form.control,
    name: c.name,
    disabled: c.a11y.disabled,
  });

  const a11y: ControlA11y = {
    id: c.a11y.id,
    disabled: c.a11y.disabled,
    required: c.a11y.required,
    'aria-invalid': c.a11y.invalid ? true : undefined,
    'aria-describedby': c.a11y.describedBy,
  };

  return <>{props.children({ field, a11y })}</>;
};

export type FormFieldRadioOption<V extends string = string> = {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};
