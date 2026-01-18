import { useState } from "react";
import { useForm as rhfUseForm, UseFormProps, FieldValues } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface FormConfig<T extends FieldValues> extends Omit<UseFormProps<T>, "resolver"> {
  schema?: z.ZodType<T, any>;
  onSubmit: (values: T) => Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useForm<T extends FieldValues>(config: FormConfig<T>) {
  const { schema, onSubmit, onSuccess, onError, defaultValues, mode = "onBlur", ...formProps } = config;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = rhfUseForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    mode,
    ...formProps,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const result = await onSubmit(values);

      onSuccess?.(result);

      return result;
    } catch (error) {
      // const backendErrors = BackendErrorMapper.map(error);

      // Object.entries(backendErrors).forEach(([field, errorObj]) => {
      //   if (field === 'root') {
      //     setSubmitError(errorObj.message);
      //   } else {
      //     form.setError(field as Path<T>, errorObj);
      //   }
      // });

      onError?.(error);
      setSubmitError(error instanceof Error ? error.message : String(error));

      return;
    }
  });

  return {
    ...form,
    handleSubmit,
    submitError,
    clearSubmitError: () => setSubmitError(null),
  };
}
