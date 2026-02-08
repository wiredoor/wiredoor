<template>
  <button
    class="flex items-center justify-center cursor-pointer w-8 h-8 hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full transition-colors"
    @click="next()"
    title="Cycle theme (Light / Dark / System)"
  >
    <SvgIcon v-if="mode === 'light'" name="sun" class="fill-current text-gray-500/80" width="16" height="16" />
    <SvgIcon v-else-if="mode === 'dark'" name="moon" class="fill-current text-gray-400/80" width="16" height="16" />
    <SvgIcon v-else name="system" class="text-gray-500/80 dark:text-gray-400/80" width="16" height="16" />
    <span class="sr-only">Cycle between light, dark and system theme</span>
  </button>
</template>

<script setup lang="ts">
import { useColorMode, useCycleList } from '@vueuse/core'
import { watch } from 'vue'
import SvgIcon from '../SvgIcon'

const mode = useColorMode({
  emitAuto: true,
})

const { next, state } = useCycleList(['light', 'dark', 'auto'] as const, { initialValue: mode.value })

watch(state, (newValue) => {
  mode.value = newValue
})

// Sync state back if mode changes from outside
watch(mode, (newMode) => {
  state.value = newMode
})
</script>
