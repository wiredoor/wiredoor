<script setup lang="ts">
import { ref } from 'vue'
import { InfoModal } from '@/components/ui/modal'
import { useTokenInfo } from '@/composables/tokens/useTokenInfo'
import InputField from '../ui/form/InputField.vue'
import { formatDistanceToNow } from 'date-fns'

const { isOpen, closeDialog, accessToken } = useTokenInfo()

const copyIcon = ref('copy')

const copyToken = async () => {
  if (accessToken && accessToken.value?.token) {
    copyIcon.value = 'copyCheck'
    try {
      await navigator.clipboard.writeText(accessToken.value?.token)
      setTimeout(() => (copyIcon.value = 'copy'), 2000)
    } catch (err) {
      copyIcon.value = 'copy'
      console.error('Error copying text: ', err)
    }
  }
}
</script>
<template>
  <InfoModal title="New Access Token Generated" :is-open="isOpen" :close-dialog="closeDialog">
    <article v-if="accessToken" class="prose m-auto">
      <h1 class="font-medium text-gray-800 dark:text-gray-100 mb-2">
        Your new Personal Access Token has been successfully created. Make sure to store it securely, as it will not be shown again.
      </h1>

      <div class="mt-6">
        <div>
          <span class="font-bold">Token Name:</span>
          {{ accessToken.name }}
        </div>
      </div>

      <div v-if="accessToken.expireAt" class="mt-6">
        <div>
          <span class="font-bold">Token expires:</span>
          {{ formatDistanceToNow(accessToken.expireAt) }}
        </div>
      </div>

      <div class="my-6">
        <div class="mt-5">
          <InputField
            v-if="accessToken.token"
            v-model="accessToken.token"
            field="token"
            :action="copyIcon"
            message="The token is only visible once. Make sure to store it securely."
            readonly
            @action="copyToken"
          ></InputField>
        </div>
      </div>

      <p class="mt-4">
        You can use this token to authenticate your node with various tools. Refer to the
        <a class="text-blue-500 cursor-pointer hover:underline" href="https://www.wiredoor.net/docs/" target="_blank">documentation</a>
        for detailed instructions on how to use it with the Wiredoor CLI Tool, Docker
        (wiredoor-client image), or Kubernetes (Wiredoor Gateway Chart).
      </p>
    </article>
  </InfoModal>
</template>
