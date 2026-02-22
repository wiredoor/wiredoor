import { CreateNodeType, NodeInfo } from '../node-schemas';
import axios from '../../../lib/axios';

export async function getNode(id: number): Promise<NodeInfo> {
  const { data } = await axios.get<NodeInfo>(`/api/nodes/${id}`);

  return data;
}

export function mapToFormValues(data: NodeInfo): CreateNodeType {
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
