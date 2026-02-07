<script setup lang="ts">
import FormModal from '@/components/ui/modal/FormModal.vue'
import { tcpServiceValidator } from '@/utils/validators/tcp-service'
import AutoCompleteField from '../ui/form/AutocompleteField.vue'
import InputField from '../ui/form/InputField.vue'
import FormField from '../ui/form/FormField.vue'
import SelectField from '../ui/form/SelectField.vue'
import { Button } from '../ui/button'
import CheckboxField from '../ui/form/CheckboxField.vue'
import { useTcpServiceForm } from '@/composables/services/useTcpServiceForm'

const { isOpen, formData, errors, options, closeDialog, submitDialog, validateField, node, domainOptions } =
  useTcpServiceForm()
</script>
<template>
  <FormModal
    :is-open="isOpen"
    :schema="tcpServiceValidator"
    :close-dialog="closeDialog"
    :submit-dialog="submitDialog"
    :form-data="formData"
    :options="options"
    size="large"
  >
    <div v-if="formData">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-if="node">
          <InputField
            v-model="node.name"
            label="Node Name"
            field="name"
            placeholder="Enter a friendly name for this service"
            description="Enter a descriptive name for this service (e.g., monitoring-api)"
            readonly
          >
            <template #tooltip>
              <div class="text-sm">
                <div><b>Node:</b> {{ node.name }}</div>
                <div><b>Internal IP:</b> {{ node.address }}</div>
                <div><b>Status:</b> {{ 'Connected' }}</div>
                <div><b>Is Gateway:</b> {{ node.isGateway ? 'Yes' : 'No' }}</div>
              </div>
            </template>
          </InputField>
        </div>
        <div>
          <InputField
            v-model="formData.name"
            field="name"
            label="Service Name"
            placeholder="Enter a friendly name for this service"
            description="Enter a descriptive name for this service (e.g., monitoring-api)"
            :errors="errors"
            :tabindex="0"
            required
            @input="(e) => validateField('name')"
          />
        </div>
        <div>
          <AutoCompleteField
            v-model="formData.domain"
            field="domain"
            label="Public Domain (Optional)"
            :options="domainOptions"
            placeholder="example.com"
            description="Specify a custom domain for this service (e.g., service.domain.com). If left empty, you will need to use Wiredoor's hostname or IP."
            :errors="errors"
            :tabindex="1"
            allowCustomValue
            @blur="(e) => validateField('domain')"
          />
        </div>
        <div>
          <InputField
            v-model="formData.port"
            field="port"
            type="number"
            label="Public Port (Optional)"
            placeholder="Assigned Automatically"
            description="Define the external port for this service. If left empty, a port will be auto-assigned based on the system's available port range."
            :errors="errors"
            :tabindex="2"
            @input="(e) => validateField('port')"
          />
        </div>
        <div class="col-span-2 mb-7">
          <CheckboxField
            v-model="formData.ssl"
            class="mt-4 mb-2"
            label="Enable SSL Termination"
            description="The client connection between public network and Wiredoor will be encrypted using TLS, but traffic to the backend remains unencrypted."
          >
            <span class="text-md ml-5">
              Enable <span class="font-bold">SSL Termination</span> (client-to-proxy encryption).
            </span>
          </CheckboxField>
        </div>
        <div>
          <FormField
            field="backendHost"
            label="Backend Protocol & Hostname/IP"
            description="slot"
            :errors="errors"
            :required="node?.isGateway || node?.isLocal"
            :tabindex="3"
          >
            <template #tooltip>
              <div class="text-sm">
                <p>
                  Choose the protocol (http:// or https://) and specify the backend service
                  hostname.
                </p>
                <p>
                  If the node is a gateway, specify the hostname or IP of the backend service (e.g.,
                  192.168.1.100 or internal.service.com).
                </p>
                <p>
                  If the node is not a gateway, this field is disabled, and only local services on
                  the node can be exposed.
                </p>
              </div>
            </template>
            <div class="grid grid-cols-10 gap-1">
              <div class="col-span-3">
                <SelectField
                  v-model="formData.proto"
                  field="proto"
                  placeholder="proto"
                  :options="[
                    { label: 'tcp://', value: 'tcp' },
                    { label: 'udp://', value: 'udp' },
                  ]"
                  :tabindex="4"
                />
              </div>
              <div class="col-span-7">
                <InputField
                  v-model="formData.backendHost"
                  field="backendHost"
                  placeholder="host/ip"
                  :disabled="!(node?.isGateway || node?.isLocal)"
                  :tabindex="5"
                />
              </div>
            </div>
          </FormField>
        </div>
        <div>
          <InputField
            v-model="formData.backendPort"
            field="backendPort"
            type="number"
            label="Backend Port"
            placeholder="1883"
            description="Specify the port where the service is running on the specified hostname or node (e.g., 1883)."
            :errors="errors"
            :tabindex="6"
            required
            @input="(e) => validateField('backendPort')"
          />
        </div>
        <div>
          <FormField
            field="allowedIps"
            label="Allowed IPs"
            description="Define a list of allowed IPs or subnets (e.g., 192.168.1.0/24, 10.0.0.5). If left empty, the service will be publicly accessible."
            :errors="errors"
          >
            <div v-if="formData.allowedIps">
              <div
                v-for="(ip, key) in formData.allowedIps"
                :key="`allowed-` + key"
                class="flex mt-2"
              >
                <div class="w-full">
                  <InputField
                    v-model="formData.allowedIps[key]"
                    field="allowedIps"
                    action="close"
                    placeholder="Enter an IP or subnet"
                    @action="() => formData.allowedIps?.splice(key, 1)"
                  />
                </div>
              </div>
            </div>
            <Button
              class="mt-2"
              @click.prevent="
                formData.allowedIps ? formData.allowedIps.push('') : (formData.allowedIps = [''])
              "
              >Add</Button
            >
          </FormField>
        </div>
        <div>
          <FormField
            field="blockedIps"
            label="Blocked IPs"
            description="Specify IPs or subnets that should be denied access for security purposes."
            :errors="errors"
          >
            <div v-if="formData.blockedIps">
              <div
                v-for="(ip, key) in formData.blockedIps"
                :key="`blocked-` + key"
                class="flex mt-2 relative"
              >
                <div class="w-full">
                  <InputField
                    v-model="formData.blockedIps[key]"
                    field="blockedIps"
                    action="close"
                    placeholder="Enter an IP or subnet"
                    @action="() => formData.blockedIps?.splice(key, 1)"
                  />
                </div>
              </div>
            </div>
            <Button
              class="mt-2"
              @click.prevent="
                formData.blockedIps ? formData.blockedIps.push('') : (formData.blockedIps = [''])
              "
              >Add</Button
            >
          </FormField>
        </div>
      </div>
    </div>
  </FormModal>
</template>
