import axios from '@/plugins/axios'
import type Joi from 'joi'
import { ref } from 'vue'

export interface FormModalOptions<T> {
  title: string
  endpoint: string
  id?: number
  description?: string
  initialData: Partial<T>
  onSubmit: (data: T) => void | Promise<void>
}

export function useFormModal<T>(schema: Joi.ObjectSchema<T>, initialForm: T = {} as T) {
  const isOpen = ref<boolean>(false)
  const formData = ref<T>(initialForm)
  const options = ref<FormModalOptions<T>>()
  const errors = ref<Record<keyof typeof formData.value, string>>(
    {} as Record<keyof typeof formData.value, string>,
  )

  const openDialog = (dialogOptions: FormModalOptions<T>): void => {
    options.value = dialogOptions
    formData.value = filterObject(dialogOptions.initialData)
    errors.value = {}
    isOpen.value = true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterObject = (data: any): T => {
    if (!data) {
      return {} as T
    }
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => {
        try {
          return !!schema.extract(key)
        } catch {
          return false
        }
      }),
    ) as T
  }

  const setFieldError = (field: keyof typeof formData.value, error: string) => {
    errors.value[field] = error
  }

  const deleteFieldError = (field: keyof typeof formData.value) => {
    delete errors.value[field]
  }

  const validateField = (field: keyof typeof formData.value) => {
    const fieldSchema = schema.extract(field as string)
    const { error } = fieldSchema.validate(formData.value[field])

    if (error) {
      setFieldError(field, error.message)
    } else {
      deleteFieldError(field)
    }
  }

  const validate = async (fields?: string): Promise<boolean> => {
    try {
      await schema.validateAsync(formData.value, { abortEarly: false })

      if (!fields) {
        errors.value = {}
      } else {
        fields.split(',').forEach((f) => deleteFieldError(f))
      }

      return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (!fields) {
        errors.value = {}
      } else {
        fields.split(',').forEach((f) => deleteFieldError(f))
      }

      if (error.isJoi && error.details) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error.details.forEach((detail: any) => {
          const field = detail.path[0]
          if (!fields || fields.split(',').includes(field)) {
            setFieldError(field, detail.message)
          }
        })
      }

      return false
    }
  }

  const closeDialog = (): void => {
    isOpen.value = false
    formData.value = undefined
    options.value = undefined
  }

  const submitDialog = async (): Promise<void> => {
    const isValid = await validate()
    if (isValid) {
      let method: 'post' | 'patch' = 'post'
      let endpoint: string | undefined = options.value?.endpoint
      if (options.value?.id) {
        method = 'patch'
        endpoint = `${endpoint}/${options.value.id}`
      }

      if (endpoint) {
        try {
          const { data } = await axios[method](endpoint, formData.value)
          await options.value?.onSubmit(data)
          closeDialog()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e.status === 422) {
            e.response.data.errors?.body?.forEach((i: { field: string; message: string }) => {
              if (i.field && i.message) {
                setFieldError(i.field as never, i.message)
              }
            })
          } else {
            console.error(e)
          }
        }
      }
    }
  }

  return {
    isOpen,
    formData,
    errors,
    options,
    openDialog,
    closeDialog,
    submitDialog,
    validate,
    validateField,
  }
}
