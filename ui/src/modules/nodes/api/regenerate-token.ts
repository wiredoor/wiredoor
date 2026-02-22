import axios from '@/lib/axios';

export async function regenerateNodeToken(id: number): Promise<{ token: string }> {
  const { data } = await axios.post<{ token: string }>(`/api/nodes/${id}/regenerate-token`);

  return data;
}
