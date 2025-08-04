import { ref } from 'vue'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const toasts = ref<Toast[]>([])

const toast = (message: string, type: ToastType = 'info', duration = 6000) => {
  const id = Date.now()
  toasts.value.push({ id, message, type, duration })

  setTimeout(() => removeToast(id), duration)
}

const removeToast = (id: number) => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export const useToast = () => ({
  toasts,
  toast,
  removeToast,
})
