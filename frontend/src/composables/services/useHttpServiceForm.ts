import { type Node } from '@/utils/validators/node-validator'
import { useFormModal } from '../useFormModal'
import { useServiceInfo } from './useServiceInfo'
import { useDomainActions } from '../domains/useDomainActions'
import type { Domain } from '@/utils/validators/domain-validator'
import { httpServiceValidator, type HttpServiceForm } from '@/utils/validators/http-service'
import { ref } from 'vue'

let id: number | undefined = undefined

const node = ref<Node>()
const domainOptions = ref<
  {
    label: string
    value: string
    authentication: boolean
  }[]
>([])

const {
  isOpen,
  formData,
  errors,
  options,
  openDialog,
  closeDialog,
  submitDialog,
  validateField,
  validate,
} = useFormModal<HttpServiceForm>(httpServiceValidator)

export function useHttpServiceForm() {
  const { openServiceInfo } = useServiceInfo()
  const { fetchDomains } = useDomainActions()

  const openHttpServiceForm = async (
    serviceNode: Node,
    callback?: (form: HttpServiceForm, id: number | undefined) => void,
    initialData: Partial<HttpServiceForm> = { backendProto: 'http', backendPort: 80 },
    rowId: number | undefined = undefined,
  ) => {
    id = rowId
    node.value = serviceNode

    domainOptions.value = (await fetchDomains({})).map((d: Domain) => ({
      label: d.domain,
      value: d.domain,
      authentication: d.authentication,
    }))

    openDialog({
      id,
      initialData,
      title: 'Expose HTTP Service on Node',
      description: `This form allows you to expose an HTTP service from a node connected to Wiredoor. Each service keeps one public domain and path, but many services may point to the same backend host and port.`,
      endpoint: `/api/services/${node.value.id}/http`,
      onSubmit: async (form) => {
        openServiceInfo(form)
        if (!!callback) {
          callback(form, id)
        }
      },
    })
  }

  return {
    isOpen,
    formData,
    options,
    errors,
    closeDialog,
    submitDialog,
    validateField,
    validate,
    domainOptions,
    node,
    openHttpServiceForm,
  }
}
