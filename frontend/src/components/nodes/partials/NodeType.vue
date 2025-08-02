<script setup lang="ts">
import ToolTip from '@/components/ui/ToolTip.vue'
import type { Node } from '@/utils/validators/node-validator'

const props = defineProps<{
  node: Node
}>()
</script>

<template>
  <div class="pl-2">
    <ToolTip>
      <template #trigger>
        <div
          v-if="props.node.isLocal"
          class="text-xs inline-flex font-medium bg-orange-500/20 text-orange-700 rounded-full text-center px-2.5 py-1"
        >
          Local
        </div>
        <div
          v-else-if="props.node.isGateway"
          class="text-xs inline-flex font-medium bg-sky-500/20 text-sky-700 rounded-full text-center px-2.5 py-1"
        >
          Gateway
        </div>
        <div
          v-else
          class="text-xs inline-flex font-medium bg-green-500/20 text-green-700 rounded-full text-center px-2.5 py-1"
        >
          Node
        </div>
      </template>
      <template #default>
        <div v-if="props.node.isLocal" class="text-sm">
          Created automatically to expose internal<br />
          services running on this Wiredoor server.
        </div>
        <div v-else-if="props.node.isGateway" class="text-sm">
          This node is a gateway, <br />
          forwarding traffic to:
          <span class="font-bold">
            {{
              props.node.gatewayNetworks.map((net) => `${net.interface}: ${net.subnet}`).join(', ')
            }}
          </span>
          <br />
          and handling external connections.
        </div>
        <div v-else class="text-sm">
          This node is a standard client and only routes traffic to itself.
        </div>
      </template>
    </ToolTip>
  </div>
</template>
