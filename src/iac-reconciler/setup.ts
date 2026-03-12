import { Container } from 'typedi';

import { StackReconciler } from '../core/reconciler/stack-reconciler';
import { NodePhase } from './phases/node-phase';
import { ProviderPhase } from './phases/provider-phase';
import { HttpResourcePhase } from './phases/http-resource-phase';

/**
 * Register all reconciler phases at application startup.
 *
 * Adding a new resource type:
 *   1. Create phase in reconciler/phases/
 *   2. Register it here
 *   3. The orchestrator sorts by dependency automatically
 */
export function setupReconciler(): StackReconciler {
  const reconciler = Container.get(StackReconciler);

  reconciler
    .register(Container.get(NodePhase))
    .register(Container.get(ProviderPhase))
    .register(Container.get(HttpResourcePhase));

  // Future:
  // reconciler.register(Container.get(TcpResourcePhase));
  // reconciler.register(Container.get(CertificatePhase));

  return reconciler;
}
