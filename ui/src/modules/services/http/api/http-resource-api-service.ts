import axios from '@/lib/axios';
import { HttpResourceInfo, HttpResourceType } from '../http-resource-schemas';

export default class HttpResourceApiService {
  static async getNode(id: number): Promise<HttpResourceInfo> {
    const { data } = await axios.get<HttpResourceInfo>(`/api/http/${id}`);

    return data;
  }

  static async createHttpResource(values: HttpResourceType): Promise<Node> {
    const { data } = await axios.post<Node>('/api/http', values);
    return data;
  }

  static async updateHttpResource(id: number, values: HttpResourceInfo | HttpResourceType): Promise<HttpResourceInfo> {
    const { data } = await axios.patch<HttpResourceInfo>(`/api/http/${id}`, values);

    return data;
  }

  static async setHttpResourceAvailability(id: number, action: 'enable' | 'disable'): Promise<HttpResourceInfo> {
    const { data } = await axios.patch<HttpResourceInfo>(`/api/http/${id}/${action}`);

    return data;
  }

  static async deleteHttpResource(id: number): Promise<void> {
    await axios.delete(`/api/http/${id}`);
  }

  static mapToFormValues(data: HttpResourceInfo): HttpResourceType {
    return {
      name: data.name,
      domain: data.domain,
      oidcProviderId: data.oidcProviderId,
      httpUpstreams: data.httpUpstreams?.map((u) => u),
      accessRules: data.accessRules?.map((u) => u),
      edgeRules: data.edgeRules?.map((u) => u),
    };
  }
}
