import { useForm } from "@/hooks/use-form";
import { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

export type A11y = {
  id: string;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

export type ControlA11y = {
  id: string;
  name?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export type FormFieldCtx<T extends FieldValues = FieldValues> = {
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;
  a11y: A11y;
};

export type FormFieldProps<T extends FieldValues> = React.HTMLAttributes<HTMLDivElement> & {
  id?: string;
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;

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

  children: React.ReactNode;
};

export type RegisterRenderArgs<T extends FieldValues> = {
  reg: ReturnType<FormFieldCtx<T>["form"]["register"]>;
  a11y: ControlA11y;
};

export type ControlRenderArgs<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
  a11y: ControlA11y;
};
