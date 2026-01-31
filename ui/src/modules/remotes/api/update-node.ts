import { NodeForm } from '../validators/node-validator';
import axios from '@/lib/axios';

export type UpdateNode = Omit<NodeForm, 'id' | 'name'> & {
  name?: string;
  enabled?: boolean;
};

export async function updateNode(id: number, values: UpdateNode): Promise<Node> {
  const { data } = await axios.patch<Node>(`/api/nodes/${id}`, values);

  return data;
}

export async function enableNode(id: number, action: 'enable' | 'disable'): Promise<Node> {
  const { data } = await axios.patch<Node>(`/api/nodes/${id}/${action}`);

  return data;
}
