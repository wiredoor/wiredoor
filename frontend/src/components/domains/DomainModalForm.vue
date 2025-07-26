<script setup lang="ts">
import { domainValidator } from '@/utils/validators/domain-validator'
import FormModal from '../ui/modal/FormModal.vue'
import InputField from '../ui/form/InputField.vue'
import SelectField from '../ui/form/SelectField.vue'
import CheckboxField from '../ui/form/CheckboxField.vue'
import { useDomainForm } from '@/composables/domains/useDomainForm'
import FormField from '../ui/form/FormField.vue'
import { Button } from '../ui/button'


const { isOpen, formData, errors, options, closeDialog, submitDialog, validateField } =
  useDomainForm()

const sslOptions = [
  {
    label: 'Self Signed',
    value: 'self-signed',
  },
  {
    label: "Let's Encrypt",
    value: 'certbot',
  },
]
</script>

<template>
  <FormModal
    :is-open="isOpen"
    :schema="domainValidator"
    :close-dialog="closeDialog"
    :submit-dialog="submitDialog"
    :form-data="formData"
    :options="options"
    size="small"
  >
    <div v-if="formData">
      <div class="">
        <InputField
          v-model="formData.domain"
          field="domain"
          label="Domain"
          placeholder="example.com"
          description="Enter the domain name that should resolve to the specified IP address."
          :errors="errors"
          required
          @blur="(e) => validateField('domain')"
        />

        <CheckboxField
          v-if="(formData.domain && errors.domain) || formData.skipValidation"
          v-model="formData.skipValidation"
          class="mb-6"
          label="Skip Domain Validation"
          description="If you skip domain validation, Certbot (Let's Encrypt) certificates cannot be issued. Only self-signed certificates will be available."
          @change="
            (e) => {
              if (formData.skipValidation) {
                if (errors.domain) {
                  delete errors.domain
                }
                formData.ssl = 'self-signed'
              }
            }
          "
        />

        <SelectField
          v-model="formData.ssl"
          field="ssl"
          label="SSL Certificate Type"
          description="Select the SSL certificate type for this domain. If validation is skipped, only self-signed certificates will be available."
          :options="sslOptions"
          :disabled="formData.skipValidation"
          :message="formData.skipValidation ? 'Self-Signed when skipping domain validation' : undefined"
          required
        />

        <CheckboxField
          v-model="formData.authentication"
          class="mt-2 mb-6"
          label="Enable OAuth2 Authentication"
          description="Enable OAuth2 authentication support for this domain. Services exposed with authentication required will restrict access to the specified users only. Public services can still be exposed without authentication."
          @change="
            (e) => {
              if (formData.authentication) {
                formData.allowedEmails = ['']
              } else {
                formData.allowedEmails = undefined
              }
            }
          "
        />

        <div v-if="formData.authentication">
          <FormField
            field="allowedEmails"
            label="Allowed Emails"
            class="mt-4"
            description="List of email addresses allowed to access services with authentication enabled."
            :errors="errors"
          >
            <div v-if="formData.allowedEmails">
              <div
                v-for="(ip, key) in formData.allowedEmails"
                :key="`allowed-` + key"
                class="flex mt-2"
              >
                <div class="w-full">
                  <InputField
                    v-model="formData.allowedEmails[key]"
                    field="allowedEmails"
                    action="close"
                    placeholder="Enter an email address"
                    @action="() => formData.allowedEmails?.splice(key, 1)"
                  />
                </div>
              </div>
            </div>
            <Button
              class="mt-2"
              @click.prevent="
                formData.allowedEmails ? formData.allowedEmails.push('') : (formData.allowedEmails = [''])
              "
              >Add Email</Button
            >
          </FormField>
        </div>
      </div>
    </div>
  </FormModal>
</template>
