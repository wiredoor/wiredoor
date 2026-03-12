import Container from 'typedi';
import { StackReconciler } from '../core/reconciler/stack-reconciler';
import { setupReconciler } from '../iac-reconciler';

export default (): StackReconciler => {
  const reconciler = setupReconciler();

  Container.set<StackReconciler>('reconciler', reconciler);

  return reconciler;
};
