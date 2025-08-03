import { nodeValidator, type NodeForm, type Node } from '@/utils/validators/node-validator'
import { useFormModal } from '../useFormModal'
import { useNodeInfo } from './useNodeInfo'
import { useToast } from '../useToast'

let id: number | undefined = undefined

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
} = useFormModal<NodeForm>(nodeValidator)

export function useNodeForm() {
  const { toast } = useToast()
  const { openNodeInfo } = useNodeInfo()

  const openNodeForm = (
    callback?: (form: NodeForm, id: number | undefined) => void,
    initialData: Partial<Node> = {
      name: '',
      dns: '',
      isGateway: false,
      allowInternet: false,
      advanced: false,
      keepalive: 25,
      gatewayNetworks: null,
    },
    ID: number | undefined = undefined,
  ) => {
    id = ID
    openDialog({
      id,
      initialData,
      title: 'Client / Node Configuration',
      description: 'Set up a network client or gateway',
      endpoint: '/api/nodes',
      onSubmit: async (form: NodeForm) => {
        if (!id) {
          openNodeInfo(form as Node)
        } else {
          toast('Node updated successfully!', 'success')
        }
        // eslint-disable-next-line no-extra-boolean-cast
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
    openNodeForm,
  }
}
