import * as React from 'react';
import { Path, useController, type FieldValues } from 'react-hook-form';

import {
  Field,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldSeparator,
  FieldContent,
  FieldGroup,
  FieldError,
  FieldSet,
  FieldLegend,
} from '@/components/ui';
import { Inline } from '@/components/foundations';
import { ControlRenderArgs, FormFieldCtx, FormFieldProps, RegisterRenderArgs } from './types';

const Ctx = React.createContext<FormFieldCtx<any> | null>(null);

export function useFormField<T extends FieldValues>() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('FormField.* must be used within <FormField />');
  return ctx as FormFieldCtx<T>;
}

function joinIds(ids: Array<string | undefined>) {
  const s = ids.filter(Boolean).join(' ');
  return s.length ? s : undefined;
}

export function FormField<T extends FieldValues>({
  className,
  id: idProp,
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
  ...props
}: FormFieldProps<T>) {
  const { error } = form.getFieldState(name, form.formState);

  const reactId = React.useId();
  const id = idProp ?? `field-${reactId}`;

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error || invalidProp ? `${id}-error` : undefined;

  const invalid = Boolean(invalidProp || error);
  const describedBy = joinIds([descriptionId, errorId]);

  const Header = (
    <>
      {title ? <FieldTitle>{title}</FieldTitle> : null}

      {label || helper ? (
        <Inline justify='between' align='center'>
          <FieldLabel htmlFor={id}>
            {label}
            {required ? (
              <span aria-hidden='true' className='text-destructive'>
                {' '}
                *
              </span>
            ) : null}
          </FieldLabel>
          {helper ? helper : null}
        </Inline>
      ) : null}

      {separator ? <FieldSeparator /> : null}
    </>
  );

  const ctxValue: FormFieldCtx<T> = {
    form,
    name,
    a11y: { id, disabled, required, describedBy, invalid },
  };

  const Body = (
    <Ctx.Provider value={ctxValue}>
      <FieldContent>
        <FieldGroup>{children}</FieldGroup>
        {invalid ? (
          <FieldError id={errorId}>{(error?.message as string) ?? errorMessage ?? 'Invalid value'}</FieldError>
        ) : description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
      </FieldContent>
    </Ctx.Provider>
  );

  return (
    <div className={className} {...props}>
      <Field>
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

FormField.Register = function Register<T extends FieldValues>(props: { children: (args: RegisterRenderArgs<T>) => React.ReactNode }) {
  const c = useFormField<T>();
  const reg = c.form.register(c.name);

  const a11y = {
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
    name: c.name as Path<T>,
    disabled: c.a11y.disabled,
  });

  const a11y = {
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
