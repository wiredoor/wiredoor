import axios from '@/lib/axios';
import { CreateNodeType, NodeInfo } from '../node-schemas';

export type UpdateNode = Omit<CreateNodeType, 'id' | 'name'> & {
  name?: string;
  enabled?: boolean;
};

export async function updateNode(id: number, values: UpdateNode): Promise<NodeInfo> {
  const { data } = await axios.patch<NodeInfo>(`/api/nodes/${id}`, values);

  return data;
}

export async function enableNode(id: number, action: 'enable' | 'disable'): Promise<NodeInfo> {
  const { data } = await axios.patch<NodeInfo>(`/api/nodes/${id}/${action}`);

  return data;
}
