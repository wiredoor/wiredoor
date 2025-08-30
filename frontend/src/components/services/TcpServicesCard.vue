<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon'
import DataTable, { type ColumnDef, type Empty } from '@/components/ui/table/DataTable.vue'
import DropDown from '../ui/dropdown/DropDown.vue'
import Button from '../ui/button/Button.vue'
import { ref, type PropType } from 'vue'
import { useServiceInfo } from '@/composables/services/useServiceInfo'
import { useServiceActions } from '@/composables/services/useServiceActions'
import { useTcpServiceForm } from '@/composables/services/useTcpServiceForm'
import type { Node } from '@/utils/validators/node-validator'
import type { TcpService } from '@/utils/validators/tcp-service'

const route = useRoute()
const router = useRouter()

const { openServiceInfo } = useServiceInfo()
const { openTcpServiceForm } = useTcpServiceForm()
const { enableService, disableService, deleteService } = useServiceActions()

const table = ref()

const props = defineProps({
  node: Object as PropType<Node>,
  overwriteEmpty: Object as PropType<Empty>,
  endpoint: {
    type: String,
    default: '/api/services/http'
  },
})

const emptyServices: Empty = {
  title: 'No TCP services yet',
  description:
    "You haven't added any TCP service yet. Once you add services, they will appear here for easy management.",
  action: 'Add Service',
}

const columns: ColumnDef[] = [
  {
    label: 'Name',
    key: 'name',
    customSlot: 'name',
    head: {
      class: 'p-2 whitespace-nowrap text-left',
    },
  },
  {
    label: 'Ingress Config',
    key: 'publicAccess',
    customSlot: 'ingress',
    head: {
      class: 'p-2 whitespace-nowrap text-left',
    },
  },
  {
    label: '',
    key: 'id',
    customSlot: 'actions',
    class: 'w-px pr-5 relative',
  },
]

const thead = {
  class:
    'text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs',
}

const tbody = {
  class: 'text-sm divide-y divide-gray-100 dark:divide-gray-700/60',
}

const handleSubmit = (form: TcpService, id?: number) => {
  if (id) {
    table.value.updateItem(id, form)
  } else {
    table.value.addItem(form)
  }
}

const addService = () => {
  openTcpServiceForm(props.node as Node, handleSubmit)
}

const editService = (service: TcpService) => {
  openTcpServiceForm(props.node as Node, handleSubmit, service, service.id)
}
</script>
<template>
  <div class="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
    <header
      class="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700/60"
    >
      <h2 class="font-semibold text-gray-800 dark:text-gray-100">TCP Services</h2>
      <Button v-if="props.node" variant="black" size="sm" @click="addService">+ Add Service</Button>
    </header>
    <div class="p-3">
      <!-- Table -->
      <div class="overflow-x-auto">
        <DataTable
          ref="table"
          :columns="columns"
          :thead="thead"
          :tbody="tbody"
          :filters="{ limit: 5 }"
          :tableContainer="{ class: 'w-full min-h-[340px]' }"
          :empty="props.overwriteEmpty ? props.overwriteEmpty : emptyServices"
          :endpoint="props.node ? `/api/services/${route.params.id}/tcp` : props.endpoint"
          @add="addService"
        >
          <template #name="{ row }">
            <div class="flex items-center relative">
              <div class="relative">
                <div
                  class="shrink-0 w-9 h-9 animate rounded-full mr-2 sm:mr-3 bg-gray-900 flex justify-center items-center"
                >
                  <SvgIcon name="expose" class="w-6 h-6 text-white" />
                </div>
                <div v-if="row.enabled"
                  class="absolute top-0 right-3 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"
                ></div>
                <div v-else
                  class="absolute top-0 right-3 w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full"
                ></div>
              </div>
              <div class="font-medium text-gray-800 dark:text-gray-100">{{ row.name }}</div>
            </div>
          </template>
          <template #ingress="{ row }">
            <div v-if="row.publicAccess" class="">
              <a
                class="text-blue-500 hover:underline"
                :href="`${row.publicAccess}`"
                target="_blank"
                >{{ row.publicAccess }}</a
              >
              <br />
              <span>
                Proxy ->
                <span class="font-medium">
                  {{
                    row.backendHost
                      ? `${row.backendHost}:${row.backendPort}`
                      : `${row.proto}://localhost:${row.backendPort}`
                  }}
                </span>
              </span>
            </div>
          </template>
          <template #actions="{ row }">
            <DropDown align="right">
              <template #trigger>
                <span class="sr-only">Actions</span>
                <SvgIcon name="more" class="w-8 h-8 fill-current" />
              </template>
              <template #overlay="{ close }">
                <li>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    href=""
                    @click.prevent="() => {
                      openServiceInfo(row as unknown as TcpService)
                      close()
                    }"
                  >
                    <SvgIcon name="info" class="w-4 h-4 text-gray-500 fill-current shrink-0 mr-2" />
                    <span>Info</span>
                  </a>
                </li>
                <li>
                  <router-link
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :to="{ name: 'service-logs', params: { nodeId: row.nodeId as string, type: 'tcp', id: row.id } }"
                    @click="close"
                  >
                    <SvgIcon name="eye" class="w-4 h-4 shrink-0 mr-2" />
                    <span>Logs Monitor</span>
                  </router-link>
                </li>
                <li v-if="props.node">
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/services/${row.id}/edit`"
                    @click.prevent="
                      () => {
                        editService(row as unknown as TcpService)
                        close()
                      }
                    "
                  >
                    <SvgIcon name="edit" class="w-4 h-4 shrink-0 mr-2" />
                    <span>Edit Service</span>
                  </a>
                </li>
                <li v-else>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${row.nodeId}`"
                    @click.prevent="
                      () => {
                        router.push({ name: 'node', params: { id: `${row.nodeId}` } })
                        close()
                      }
                    "
                  >
                    <SvgIcon name="switch" class="w-4 h-4 shrink-0 mr-2" />
                    <span>Go to node</span>
                  </a>
                </li>
                <hr class="border-gray-200 dark:border-gray-600" />
                <li v-if="row.enabled">
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/nodes/${row.id}/disable`"
                    @click.prevent="
                      () => {
                        disableService(row.nodeId as number, 'tcp', row.id, () => { table.updateItem(row.id, { ...row, enabled: false }) })
                        close()
                      }
                    "
                  >
                    <SvgIcon
                      name="linkOff"
                      class="w-4 h-4 text-orange-500 fill-current shrink-0 mr-2"
                    />
                    <span>Disable Access</span>
                  </a>
                </li>
                <li v-else>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/services/${row.id}/enable`"
                    @click.prevent="
                      () => {
                        enableService(row.nodeId as number, 'tcp', row.id, () => { table.updateItem(row.id, { ...row, enabled: true }) })
                        close()
                      }
                    "
                  >
                    <SvgIcon
                      name="connect"
                      class="w-4 h-4 text-orange-500 fill-current shrink-0 mr-2"
                    />
                    <span>Enable Access</span>
                  </a>
                </li>
                <hr class="border-gray-200 dark:border-gray-600" />
                <li>
                  <a
                    class="font-medium text-sm flex items-center py-1 px-3 hover:bg-gray-100 hover:dark:bg-gray-700"
                    :href="`/services/${row.id}/delete`"
                    @click.prevent="
                      () => {
                        deleteService(row.nodeId as number, 'tcp', row.id, () => { table.removeItem(row.id) })
                        close()
                      }
                    "
                  >
                    <SvgIcon name="delete" class="w-4 h-4 text-red-500 shrink-0 mr-2" />
                    <span>Delete Service</span>
                  </a>
                </li>
              </template>
            </DropDown>
          </template>
        </DataTable>
      </div>

      <!-- <div class="text-center border-t border-gray-100 dark:border-gray-700/60 px-2">
        <a
          class="block text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 pt-4 pb-1"
          href="#0"
          >View All -&gt;</a
        >
      </div> -->
    </div>
  </div>
</template>
