<script setup lang="ts">
import { useNodeActions } from '@/composables/nodes/useNodeActions'
import { useAuthStore } from '@/stores/auth'
import type { Node } from '@/utils/validators/node-validator'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import HttpServicesCard from '../services/HttpServicesCard.vue'
import TcpServicesCard from '../services/TcpServicesCard.vue'
import { getLatestHS, getTraffic } from '@/utils/format'
import NodeStatus from './partials/NodeStatus.vue'
import DropDown from '../ui/dropdown/DropDown.vue'
import SvgIcon from '../SvgIcon'
import TokensCard from '../tokens/TokensCard.vue'
import { useNodeForm } from '@/composables/nodes/useNodeForm'
import BreadCrumb from '../ui/BreadCrumb.vue'

let eventSource: EventSource | undefined

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)

const node = ref<Node>()

const { fetchNodeById } = useNodeActions()

const { downloadConfig, enableNode, disableNode } = useNodeActions()

const { openNodeForm } = useNodeForm()

const dataMonitor = () => {
  if (node.value?.id) {
    if (eventSource) {
      eventSource.close()
    }
    eventSource = new EventSource(`/api/nodes/stream?id=${node.value.id}&token=${authStore.token}`)

    // eventSource.onopen = (event) => {
    //   // console.log('Monitoring started')
    // }

    eventSource.onmessage = (event) => {
      node.value = JSON.parse(event.data)
    }

    eventSource.onerror = (error) => {
      console.error('Error en SSE:', error)
      eventSource?.close()
    }
  }
}

const updateNode = (form: Partial<Node>, id?: number) => {
  node.value = { ...node.value, id, ...form } as Node
  dataMonitor()
}

onMounted(async () => {
  loading.value = true

  node.value = await fetchNodeById(+route.params.id)

  if (!node.value) {
  }

  loading.value = false

  dataMonitor()
})

onUnmounted(async () => {
  if (eventSource) {
    eventSource.close()
  }
})
</script>
<template>
  <div v-if="node && !loading">
    <BreadCrumb
      :items="[{ label: 'Client / Nodes', to: { name: 'nodes' } }, { label: node.name }]"
    />

    <div class="grid grid-cols-12 gap-4">
      <div
        class="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl"
      >
        <div class="px-5 pt-5">
          <header class="flex justify-between items-start mb-2">
            <div class="px-5 py-3 w-7/10">
              <div class="flex items-center">
                <!-- Red dot -->
                <NodeStatus v-if="node.isLocal === false" class="mr-3" :node="node" />
                <div class="w-full">
                  <div class="text-2xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                    {{ node.name }}
                    <div
                      v-if="node.isGateway"
                      class="text-xs inline-flex font-medium bg-sky-500/20 text-sky-700 rounded-full text-center px-2.5 py-1"
                    >
                      Gateway
                    </div>
                  </div>
                  <div class="w-full flex justify-between">
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      <span class="font-semibold">IP:</span>
                      {{ node.address }}
                    </div>
                    <div v-if="node.isGateway && node.gatewayNetworks?.length" class="text-sm text-gray-500 dark:text-gray-400">
                      <span class="font-semibold">Subnet:</span>
                      {{
                        node.gatewayNetworks.map((net) => `${net.interface}: ${net.subnet}`).join(', ')
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DropDown v-if="node.isLocal === false">
              <template #trigger>
                <span class="sr-only">Actions</span>
                <SvgIcon name="more" class="w-8 h-8 fill-current" />
              </template>
              <template #overlay="{ close }">
                <li>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${node.id}/edit`"
                    @click.prevent="
                      () => {
                        openNodeForm(updateNode, node, +route.params.id)
                        close()
                      }
                    "
                  >
                    <SvgIcon name="edit" class="w-4 h-4 shrink-0 mr-2" />
                    <span>Edit Node</span>
                  </a>
                </li>
                <li>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${route.params.id}/config`"
                    @click.prevent="
                      () => {
                        downloadConfig(+route.params.id)
                        close()
                      }
                    "
                  >
                    <SvgIcon name="download" class="w-4 h-4 shrink-0 mr-2" />
                    <span>Download Config</span>
                  </a>
                </li>
                <hr class="border-gray-200 dark:border-gray-600" />
                <li v-if="node.enabled">
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${node.id}/disable`"
                    @click.prevent="
                      () => {
                        disableNode(+route.params.id, () => updateNode({ enabled: false }))
                        close()
                      }
                    "
                  >
                    <SvgIcon
                      name="disconnect"
                      class="w-4 h-4 text-orange-500 fill-current shrink-0 mr-2"
                    />
                    <span>Disconnect</span>
                  </a>
                </li>
                <li v-else>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${node.id}/enable`"
                    @click.prevent="
                      () => {
                        enableNode(+route.params.id, () => updateNode({ enabled: true }))
                        close()
                      }
                    "
                  >
                    <SvgIcon
                      name="connect"
                      class="w-4 h-4 text-orange-500 fill-current shrink-0 mr-2"
                    />
                    <span>Connect</span>
                  </a>
                </li>
              </template>
            </DropDown>
            <!-- <EditMenu align="right" class="relative inline-flex">
              <li>
                <a
                  class="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3"
                  href="#0"
                  >Option 1</a
                >
              </li>
              <li>
                <a
                  class="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3"
                  href="#0"
                  >Option 2</a
                >
              </li>
              <li>
                <a
                  class="font-medium text-sm text-red-500 hover:text-red-600 flex py-1 px-3"
                  href="#0"
                  >Remove</a
                >
              </li>
            </EditMenu> -->
          </header>
          <div v-if="node.isLocal === false" class="grow px-5 pt-3 pb-1">
            <div class="overflow-x-auto">
              <table class="table-auto w-full dark:text-gray-300">
                <!-- Table body -->
                <tbody class="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  <!-- Row -->
                  <tr>
                    <td class="py-2">
                      <div class="text-left">Client IP</div>
                    </td>
                    <td class="py-2">
                      <div class="font-medium text-right text-gray-800 dark:text-gray-400">
                        {{ node.clientIp || '-' }}
                      </div>
                    </td>
                  </tr>
                  <!-- Row -->
                  <tr>
                    <td class="py-2">
                      <div class="text-left">Latest Handshake</div>
                    </td>
                    <td class="py-2">
                      <div class="font-medium text-right text-gray-800 dark:text-gray-400">
                        {{ getLatestHS(node.latestHandshakeTimestamp) }}
                      </div>
                    </td>
                  </tr>
                  <!-- Row -->
                  <tr>
                    <td class="py-2">
                      <div class="text-left">Transmitted</div>
                    </td>
                    <td class="py-2">
                      <div class="font-medium text-right text-gray-800 dark:text-gray-400">
                        {{ getTraffic(node.transferTx) }}
                      </div>
                    </td>
                  </tr>
                  <!-- Row -->
                  <tr>
                    <td class="py-2">
                      <div class="text-left">Received</div>
                    </td>
                    <td class="py-2">
                      <div class="font-medium text-right text-gray-800 dark:text-gray-400">
                        {{ getTraffic(node.transferRx) }}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="py-2">
                      <div class="text-left">Send all internet traffic through the VPN</div>
                    </td>
                    <td class="py-2">
                      <div class="font-medium text-right text-gray-800 dark:text-gray-400">
                        {{ node.allowInternet ? 'Yes' : 'No' }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="node.isLocal === false"
        class="flex flex-col col-span-full sm:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl"
      >
        <TokensCard :node="node" />
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4 mt-4">
      <div class="flex flex-col col-span-full lg:col-span-6">
        <HttpServicesCard :node="node" />
      </div>
      <div class="flex flex-col col-span-full lg:col-span-6">
        <TcpServicesCard :node="node" />
      </div>
    </div>
  </div>
</template>
