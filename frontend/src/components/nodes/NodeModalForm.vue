<script setup lang="ts">
import FormModal from '@/components/ui/modal/FormModal.vue'
import { nodeValidator } from '@/utils/validators/node-validator'
import InputField from '@/components/ui/form/InputField.vue'
import CheckboxField from '@/components/ui/form/CheckboxField.vue'
import { useNodeForm } from '@/composables/nodes/useNodeForm'
import NodeInfo from './NodeInfo.vue'

const { isOpen, formData, options, errors, closeDialog, submitDialog, validateField } = useNodeForm()

</script>
<template>
  <div>
    <NodeInfo />
    <FormModal
      :is-open="isOpen"
      :schema="nodeValidator"
      :close-dialog="closeDialog"
      :submit-dialog="submitDialog"
      :form-data="formData"
      :options="options"
      size="small"
    >
      <div v-if="formData">
        <div class="">
          <InputField
            v-model="formData.name"
            field="name"
            label="Name"
            placeholder="Enter a friendly name for this node"
            :errors="errors"
            required
            @input="(e) => validateField('name')"
          />
          <InputField
            v-if="formData.address"
            v-model="formData.address"
            field="address"
            label="Address"
            description="Address used by Wiredoor Network"
            :errors="errors"
          />

          <CheckboxField
            v-model="formData.isGateway"
            class="mt-2 mb-5"
            label="Act as a network gateway"
            description="Enabling this option allows this node to act as a gateway, enabling Wiredoor to
                    forward traffic to any host in the specified network. You must specify the subnet
                    to which the traffic will be forwarded (e.g., 192.168.2.0/24)."
            @change="
              () => {
                if (!formData.isGateway) {
                  formData.gatewayNetwork = ''
                  validateField('gatewayNetwork')
                }
              }
            "
          />

          <InputField
            v-model="formData.gatewayNetwork"
            field="gatewayNetwork"
            placeholder="Target subnet (e.g., 192.168.2.0/24)"
            :errors="errors"
            :disabled="!formData.isGateway"
          />

          <CheckboxField
            v-model="formData.allowInternet"
            class="mt-4 mb-2"
            label="Send all internet traffic through the VPN"
            description="Enabling this option may affect node internet connection performance."
          />
        </div>
      </div>
    </FormModal>
  </div>
</template>
