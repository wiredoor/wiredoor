import { useFormModal } from '../useFormModal'
import { useToast } from '../useToast'
import { domainValidator, type Domain, type DomainForm } from '@/utils/validators/domain-validator'

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
} = useFormModal<DomainForm>(domainValidator)

export function useDomainForm() {
  const { toast } = useToast()

  const openDomainForm = (
    callback?: (form: DomainForm, id: number | undefined) => void,
    initialData: Partial<Domain> = { domain: '', ssl: '', skipValidation: false },
    ID: number | undefined = undefined,
  ) => {
    id = ID
    openDialog({
      id,
      initialData,
      title: 'Domain & SSL Settings',
      description: 'Set up a domain pointing to wiredoor',
      endpoint: '/api/domains',
      onSubmit: async (form: DomainForm) => {
        if (!id) {
          toast('Domain created successfully!', 'success')
        } else {
          toast('Domain updated successfully!', 'success')
        }
         
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
    openDomainForm,
  }
}
