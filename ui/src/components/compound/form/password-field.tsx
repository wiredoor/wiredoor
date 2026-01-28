import { FieldValues } from 'react-hook-form';
import { PasswordInput } from '@/components/ui';
import { FormField } from './form-field';
import { FormFieldProps } from './types';

export function PasswordField<T extends FieldValues>(
  props: Omit<FormFieldProps<T>, 'children'> &
    Omit<React.ComponentProps<typeof PasswordInput>, 'id' | 'form' | 'name' | 'disabled' | 'required' | 'aria-invalid' | 'aria-describedby'>,
) {
  const { form, name, ...rest } = props;

  return (
    <FormField<T> form={form} name={name} {...rest}>
      <FormField.Register<T>>{({ reg, a11y }) => <PasswordInput {...rest} {...reg} {...a11y} />}</FormField.Register>
    </FormField>
  );
}
