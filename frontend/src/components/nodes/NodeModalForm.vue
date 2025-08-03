<script setup lang="ts">
import FormModal from '@/components/ui/modal/FormModal.vue'
import { nodeValidator } from '@/utils/validators/node-validator'
import InputField from '@/components/ui/form/InputField.vue'
import CheckboxField from '@/components/ui/form/CheckboxField.vue'
import { useNodeForm } from '@/composables/nodes/useNodeForm'
import NodeInfo from './NodeInfo.vue'
import Button from '../ui/button/Button.vue'
import ButtonRadioGroup from '../ui/button/ButtonRadioGroup.vue'
import FormField from '../ui/form/FormField.vue'

const { isOpen, formData, options, errors, closeDialog, submitDialog, validateField } =
  useNodeForm()
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
        <div class="mb-4">
          <ButtonRadioGroup
            v-model="formData.advanced"
            :options="[
              { label: 'Simple Form', value: false },
              { label: 'Advanced Form', value: true },
            ]"
          />
        </div>
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

          <InputField
            v-if="formData.advanced"
            v-model="formData.dns"
            field="dns"
            label="DNS (optional)"
            description="Specify a DNS server to be used while connected. For example: 1.1.1.1"
            :errors="errors"
          />

          <CheckboxField
            v-model="formData.isGateway"
            class="mt-2 mb-5"
            label="Act as a network gateway"
            description="slot"
            @change="
              (e) => {
                if (formData.isGateway) {
                  formData.gatewayNetworks = [{ interface: 'eth0', subnet: '' }]
                } else {
                  formData.gatewayNetworks = null
                  validateField('gatewayNetworks')
                }
              }
            "
          >
            <template #tooltip>
              <div class="text-sm">
                <p>
                  Enabling this option allows this node to act as a gateway, enabling Wiredoor to
                  forward traffic to any host in the specified network. You must specify the subnet
                  to which the traffic will be forwarded in CIDR notation.
                </p>
                <p>Example: 192.168.2.0/24</p>
              </div>
            </template>
          </CheckboxField>

          <FormField
            v-if="formData.isGateway"
            field="gatewayNetworks"
            label="Interface & Subnet"
            description="slot"
            :required="formData.isGateway"
            :errors="errors"
          >
            <template #tooltip>
              <div class="text-sm">
                <p>
                  Specify the network interface and subnet for this gateway. The interface is
                  typically the name of the network interface (e.g., eth0), and the subnet is the
                  target subnet in CIDR notation (e.g., 192.168.1.0/24).
                </p>
              </div>
            </template>
            <div v-if="formData.gatewayNetworks">
              <div
                v-for="(gatewayNetwork, key) in formData.gatewayNetworks"
                :key="`eth-` + key"
                class="flex mt-2 relative"
              >
                <div class="w-full">
                  <div class="grid grid-cols-10 gap-1">
                    <div class="col-span-2">
                      <InputField
                        v-model="gatewayNetwork.interface"
                        field="interface"
                        placeholder="eth0"
                      />
                    </div>
                    <div class="col-span-8">
                      <InputField
                        v-model="gatewayNetwork.subnet"
                        field="subnet"
                        placeholder="Target subnet (e.g., 192.168.2.0/24)"
                        :action="formData.gatewayNetworks?.length > 1 ? 'close' : undefined"
                        @action="() => formData.gatewayNetworks?.splice(key, 1)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FormField>
          <Button
            v-if="formData.isGateway && formData.gatewayNetworks && formData.advanced"
            class="-mt-2 mb-4"
            @click.prevent="
              formData.gatewayNetworks.push({
                interface: `eth${formData.gatewayNetworks?.length}`,
                subnet: '',
              })
            "
            >Add Interface</Button
          >

          <InputField
            v-if="formData.advanced"
            v-model="formData.keepalive"
            field="keepalive"
            type="number"
            label="Persistence Keepalive"
            placeholder="25"
            description="Interval in seconds to keep the connection alive through NAT. Default value: 25. Use 0 to disable."
            :errors="errors"
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
