<script setup lang="ts">
import { InfoModal } from '@/components/ui/modal'
import { useServiceInfo } from '@/composables/services/useServiceInfo'
import type { HttpService } from '@/utils/validators/http-service';
import type { TcpService } from '@/utils/validators/tcp-service';

const { isOpen, closeDialog, service } = useServiceInfo()

</script>
<template>
  <InfoModal title="Your Service is Now Publicly Available" :is-open="isOpen" :close-dialog="closeDialog" size="large">
    <article v-if="service" class="prose m-auto">
      <h1 class="font-medium text-lg text-gray-800 dark:text-gray-100 mb-2">
        Your service <strong class="font-bold">{{ service.name }}</strong> has been successfully exposed on the network.
      </h1>

      <div class="flex justify-between items-center mt-5">
        <strong>Public Access<span>{{ (service as TcpService).ssl ? '(SSL)' : '' }}</span>:</strong>
        <a v-if="service.publicAccess" class="text-blue-600 hover:underline cursor-pointer" :href="service.publicAccess" target="_blank">
          {{ service.publicAccess }}
        </a>
        <span v-else class="text-gray-500">Not assigned</span>
      </div>

      <div class="flex justify-between items-center mt-5">
        <strong>Backend:</strong>
        <span class="text-gray-700 dark:text-gray-500">{{ (service as HttpService).backendProto || (service as TcpService).proto }}://{{ service.backendHost || 'localhost' }}:{{ service.backendPort }}</span>
      </div>

      <div v-if="service.allowedIps" class="flex justify-between items-center mt-5">
        <strong>Allowed IPs:</strong>
        <span v-if="service.allowedIps.length > 0">{{ service.allowedIps.join(", ") }}</span>
        <span v-else class="text-gray-500">No restrictions</span>
      </div>

      <div v-if="service.allowedDomains" class="flex justify-between items-center my-5">
        <strong>Allowed Domains:</strong>
        <span v-if="service.allowedDomains.length > 0">{{ service.allowedDomains.join(", ") }}</span>
        <span v-else class="text-gray-500">No restrictions</span>
      </div>

      <div v-if="service.blockedIps" class="flex justify-between items-center my-5">
        <strong>Blocked IPs:</strong>
        <span v-if="service.blockedIps.length > 0">{{ service.blockedIps.join(", ") }}</span>
        <span v-else class="text-gray-500">None</span>
      </div>

      <div v-if="service.blockedDomains" class="flex justify-between items-center my-5">
        <strong>Blocked Domains:</strong>
        <span v-if="service.blockedDomains.length > 0">{{ service.blockedDomains.join(", ") }}</span>
        <span v-else class="text-gray-500">None</span>
      </div>
    </article>
  </InfoModal>
</template>
