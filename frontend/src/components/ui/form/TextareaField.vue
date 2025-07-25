<script setup lang="ts">
import type { PropType } from 'vue'
import ToolTip from '../ToolTip.vue'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
  label: String,
  description: String,
  placeholder: String,
  message: String,
  disabled: Boolean,
  readonly: Boolean,
  spellcheck: Boolean,
  tabindex: Number,
  rows: {
    type: Number,
    default: 4,
  },
  required: {
    type: Boolean,
    default: false,
  },
  errors: Object as PropType<Record<string, string>>,
})

const model = defineModel<string>()
const emit = defineEmits(['change', 'input', 'blur'])
</script>

<template>
  <div class="form-field">
    <div>
      <div v-if="props.label" class="flex items-center justify-between">
        <label class="block text-sm font-medium mb-1" :for="field">
          {{ props.label }} <span v-if="props.required" class="text-red-500">*</span>
        </label>
        <ToolTip v-if="props.description" class="ml-2" bg="dark" size="md" position="left">
          <slot name="tooltip">
            <div class="text-sm text-gray-200">{{ props.description }}</div>
          </slot>
        </ToolTip>
      </div>
      <div class="relative">
        <textarea
          :id="field"
          v-model="model"
          :rows="props.rows"
          class="form-textarea w-full resize-y"
          :placeholder="props.placeholder"
          :class="{ 'border-red-300': !!props.errors?.[props.field] }"
          :disabled="disabled"
          :spellcheck="props.spellcheck"
          :readonly="readonly"
          :tabindex="tabindex"
          @input="emit('input', model)"
          @blur="emit('blur', model)"
          @change="emit('change', model)"
        />
      </div>
    </div>
    <div v-if="props.label || props.errors || props.message" class="form-message">
      <div v-if="props.errors?.[props.field]" class="text-xs mt-1 text-red-500">
        {{ props.errors[props.field] }}
      </div>
      <div v-else-if="props.message" class="text-xs mt-1 text-gray-600 dark:text-gray-400">
        {{ props.message }}
      </div>
    </div>
  </div>
</template>
