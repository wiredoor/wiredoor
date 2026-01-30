import { NodeForm } from '../validators/node-validator';
import axios from '@/lib/axios';

export async function updateNode(id: number, values: NodeForm): Promise<Node> {
  const { data } = await axios.patch<Node>(`/api/nodes/${id}`, values);

  return data;
}
