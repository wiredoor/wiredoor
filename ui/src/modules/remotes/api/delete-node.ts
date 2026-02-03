import { NodeForm } from '../validators/node-validator';
import axios from '@/lib/axios';

export type UpdateNode = Omit<NodeForm, 'id' | 'name'> & {
  name?: string;
  enabled?: boolean;
};

export async function deleteNode(id: number): Promise<void> {
  await axios.delete(`/api/nodes/${id}`);
}
