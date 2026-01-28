import { dialogStore } from './dialog-store';

export function createDialog<TArgs, TResult>(factory: (args: TArgs) => Parameters<typeof dialogStore.custom<TResult>>[0]) {
  return (args: TArgs) => dialogStore.custom<TResult>(factory(args));
}
