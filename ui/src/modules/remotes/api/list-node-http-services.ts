import axios from '@/lib/axios';

export async function listNodeHttpServices(id: number, filters?: any): Promise<Node[]> {
  const { data } = await axios.get<Node[]>(`/api/services/${id}/http`, { params: filters });

  return data;
}
