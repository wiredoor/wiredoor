import axios, { InternalAxiosRequestConfig } from 'axios';
import { toast } from '@/components/compound/toast';

// const agent = new https.Agent({
//   rejectUnauthorized: false,
// })

axios.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    if (requestConfig.headers) {
      requestConfig.headers.Accept = 'application/json';
    }

    requestConfig.withCredentials = true;

    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 400) {
      console.log(error.response);
      toast.destructive('Error', { description: error.response.data?.message || 'Unknown Server Error' });
    }

    if ([401, 403, 429].includes(status)) {
      // toast.destructive("Error", { description: error.response.data?.message || "Unauthorized request" });
    }

    return Promise.reject(error);
  },
);

export default axios;
