import React from 'react';
import { useForm } from '@/hooks/use-form';
import { FieldValues } from 'react-hook-form';

export type FocusMeta = {
  key: string;
  group?: string;
  kind?: string;
  label?: string;
};

type FormState = {
  state: {
    focused: FocusMeta | undefined;
  };
  setFocused: (meta?: FocusMeta) => void;
  clearFocused: () => void;
};

const FormContext = React.createContext<FormState | null>(null);

type FormProps<T extends FieldValues> = {
  children: React.ReactNode;
  form: ReturnType<typeof useForm<T>>;
};

export function Form<T extends FieldValues>({ form: innerForm, children }: FormProps<T>) {
  const [focused, setFocusedState] = React.useState<FocusMeta | undefined>(undefined);

  const state = React.useMemo<FormState>(
    () => ({
      state: { focused },
      setFocused: (meta) => setFocusedState(meta),
      clearFocused: () => setFocusedState(undefined),
    }),
    [focused],
  );

  return (
    <FormContext.Provider value={state}>
      <form onSubmit={innerForm.handleSubmit} noValidate>
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function useFormContext(): FormState {
  const context = React.useContext(FormContext);
  if (!context) {
    return {
      state: { focused: undefined },
      setFocused: () => {},
      clearFocused: () => {},
    };
  }
  return context;
}
