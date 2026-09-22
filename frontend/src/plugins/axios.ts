import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '../composables/useToast'

// const agent = new https.Agent({
//   rejectUnauthorized: false,
// })

const { toast } = useToast()

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
      toast(error.response.data?.message || 'Unknown Error', 'error')
    }

    if ([401, 403, 429].includes(status)) {
      const auth = useAuthStore()

      if (auth.token) {
        console.log('Logging out due to API response')
        await auth.logout()
        console.log('Logged out due to API response')
      }
    }

    return Promise.reject(error)
  },
)

export default axios
