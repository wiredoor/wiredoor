import { createItemResource } from '@/lib/react-query/create-item-resource';
import { NodeForm } from '../validators/node-validator';

export const nodeById = createItemResource<{ id: number }, Node>({
  resourceKey: '/api/nodes/:id',
  normalize: (p) => ({ id: p.id }),
  enabledWhen: (p) => Number.isFinite(p.id) && p.id > 0,
  fetcher: async ({ id }) => {
    const res = await fetch(`/api/nodes/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch node');
    return (await res.json()) as Node;
  },
});

export function mapToFormValues(data: any): NodeForm {
  return {
    id: data.id,
    name: data.name,
    address: data.address,
    dns: data.dns || '',
    keepalive: data.keepalive,
    mtu: data.mtu,
    isGateway: data.isGateway,
    allowInternet: data.allowInternet,
    advanced: data.advanced,
    gatewayNetworks: data.gatewayNetworks || [],
  };
}
