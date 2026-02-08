<template>
  <div class="w-full flex flex-wrap -space-x-px">
    <button
      v-for="option in options"
      :key="`${option.value}`"
      @click.prevent="model = option.value"
      :class="[
        'btn grow border rounded-none first:rounded-l-lg last:rounded-r-lg',
        model === option.value
          ? 'bg-white dark:bg-gray-800 text-blue-500 border-gray-200 dark:border-gray-700/60'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/20',
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<string | number | boolean>()

defineProps<{
  options: { label: string; value: string | number | boolean }[]
}>()
</script>
