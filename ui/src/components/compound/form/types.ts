import { useForm } from '@/hooks/use-form';
import { ControllerRenderProps, FieldValues, Path } from 'react-hook-form';

export type A11y = {
  id: string;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

export type ControlA11y = {
  id: string;
  required?: boolean;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export type FieldShellRenderArgs = {
  a11y: ControlA11y;
};

export type FormFieldCtx<T extends FieldValues = FieldValues> = {
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;
  a11y: A11y;
};

export type FieldShellProps = React.HTMLAttributes<HTMLDivElement> & {
  id?: string;

  title?: React.ReactNode;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  description?: React.ReactNode;

  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  errorMessage?: React.ReactNode;

  asFieldSet?: boolean;
  legend?: React.ReactNode;
  separator?: boolean;

  children?: React.ReactNode;
  render?: (args: FieldShellRenderArgs) => React.ReactNode;
};

export type FormFieldProps<T extends FieldValues> = FieldShellProps & {
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;
};

export type RegisterRenderArgs<T extends FieldValues> = {
  reg: ReturnType<FormFieldCtx<T>['form']['register']>;
  a11y: ControlA11y;
};

export type ControlRenderArgs<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
  a11y: ControlA11y;
};
