import axios from '@/lib/axios';

export async function regenerateNodeKeys(id: number): Promise<{ token: string }> {
  const { data } = await axios.post<{ token: string }>(`/api/nodes/${id}/regenerate-keys`);

  return data;
}
