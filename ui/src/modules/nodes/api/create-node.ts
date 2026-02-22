import axios from '@/lib/axios';
import { CreateNodeType } from '../node-schemas';

export async function createNode(values: CreateNodeType): Promise<Node> {
  const { data } = await axios.post<Node>('/api/nodes', values);

  return data;
}
