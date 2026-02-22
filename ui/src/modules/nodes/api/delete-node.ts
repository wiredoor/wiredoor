import axios from '@/lib/axios';

export async function deleteNode(id: number): Promise<void> {
  await axios.delete(`/api/nodes/${id}`);
}
