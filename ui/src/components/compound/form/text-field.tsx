import { FormField } from './form-field';
import { FieldValues } from 'react-hook-form';
import { FormFieldProps } from './types';
import { Input } from '@/components/ui';

export function TextField<T extends FieldValues>(
  props: Omit<FormFieldProps<T>, 'children'> &
    Omit<React.ComponentProps<typeof Input>, 'id' | 'form' | 'name' | 'disabled' | 'required' | 'aria-invalid' | 'aria-describedby'>,
) {
  const { form, name, ...rest } = props;

  return (
    <FormField<T> form={form} name={name} {...rest}>
      <FormField.Register<T>>{({ reg, a11y }) => <Input {...rest} {...reg} {...a11y} />}</FormField.Register>
    </FormField>
  );
}
