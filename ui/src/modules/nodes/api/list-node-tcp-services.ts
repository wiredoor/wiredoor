import axios from '@/lib/axios';

export async function listNodeTcpServices(id: number, filters?: any): Promise<Node[]> {
  const { data } = await axios.get<Node[]>(`/api/services/${id}/tcp`, { params: filters });

  return data;
}
