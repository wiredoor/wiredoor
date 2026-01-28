import { dialogStore, type ConfirmSpec, type AlertSpec, type FormSpec, type CustomSpec } from './dialog-store';

export function useDialog() {
  return {
    alert: (spec: Omit<AlertSpec, 'type'>) => dialogStore.alert(spec),
    confirm: (spec: Omit<ConfirmSpec, 'type'>) => dialogStore.confirm(spec),
    form: <TValues extends Record<string, any>>(spec: Omit<FormSpec<TValues>, 'type'>) => dialogStore.form<TValues>(spec),
    custom: <TResult = any>(spec: Omit<CustomSpec<TResult>, 'type'>) => dialogStore.custom<TResult>(spec),
    info: dialogStore.info,
    dismiss: () => dialogStore.dismiss(),
  };
}
