import { NodeForm } from '../validators/node-validator';
import axios from '@/lib/axios';

export async function createNode(values: NodeForm): Promise<Node> {
  const { data } = await axios.post<Node>('/nodes', values);

  return data;
}
