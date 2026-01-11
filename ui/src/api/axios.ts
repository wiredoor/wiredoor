import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/components/compound/toast'

// const agent = new https.Agent({
//   rejectUnauthorized: false,
// })

axios.interceptors.request.use(
  (requestConfig) => {
    const auth = useAuthStore()

    requestConfig.withCredentials = true

    if (auth.token) {
      requestConfig.headers['Authorization'] = `Bearer ${auth.token}`
    }

    console.log(requestConfig)

    return requestConfig
  },
  (error) => {
    return Promise.reject(error)
  },
)

axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }

    const { status } = error.response

    if (status === 400) {
      console.log(error.response)
      toast.destructive('Error', { description: error.response.data?.message || 'Unknown Server Error'})
    }

    if ([401, 403, 429].includes(status)) {
      const auth = useAuthStore()

      if (auth.token) {
        console.log('Logging out by API response')
        await auth.logout()
        console.log('Logged out by API response')
      }
    }

    return Promise.reject(error)
  },
)

export default axios
