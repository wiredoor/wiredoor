<template>
  <div class="max-w-3xl mx-auto">
    <div
      class="relative h-[180px] max-h-[300px] bg-gray-900 rounded-2xl px-5 py-3 shadow-xl before:absolute before:-inset-5 before:border-y before:[border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] before:pointer-events-none after:absolute after:-inset-5 after:border-x after:[border-image:linear-gradient(to_bottom,transparent,--theme(--color-slate-300/.8),transparent)1] after:-z-10"
    >
      <div
        class="relative flex items-center justify-between before:block before:w-[41px] before:h-[9px] before:[background-image:radial-gradient(circle_at_4.5px_4.5px,var(--color-gray-600)_4.5px,transparent_0)] before:bg-[length:16px_9px] after:w-[41px] mb-8"
      >
        <span class="text-white font-medium text-[13px]">{{ props.title }}</span>
      </div>
      <div class="text-gray-500 text-sm font-mono [&_span]:opacity-0">
        <div v-for="(cmd, key) in commands" :key="key">
          <div class="group">
            $
            <span class="text-gray-200 animate-[fadeIn_0.2s_ease-out_0.5s_forwards] w-100">{{
              cmd.command
            }}</span>
            <span
              v-for="(flag, kf) in cmd.flags"
              :key="kf"
              class="animate-[fadeIn_0.2s_ease-out_0.5s_forwards]"
            >
              &nbsp;{{ flag }}</span
            >
            <button
              v-if="cmd.copy"
              class="opacity-0 cursor-pointer float-end group-hover:opacity-100 transition-opacity text-white rounded"
              @click="copyCommand(key)"
            >
              <SvgIcon v-if="copied" name="copyCheck" class="text-green-600" width="16" height="16" />
              <SvgIcon v-else name="copy" width="16" height="16" />
            </button>
          </div>
          <div v-for="(result, kr) in cmd.results" :key="kr">
            <span class="animate-[fadeIn_0.1s_ease-out_1.5s_forwards]"> {{ result }}</span>
            <br />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon'
import { onMounted, ref, type PropType } from 'vue'

export interface Command {
  command: string
  flags: string[]
  results: string[]
  copy?: boolean
}

const emit = defineEmits(['copy'])

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  entries: {
    type: Object as PropType<Command[]>,
    required: true,
  },
  delay: {
    type: Number,
    default: 2000,
  },
  interval: {
    type: Number,
  },
})

const commands = ref<Command[]>([])
const copied = ref(false)

const refillCommands = () => {
  let n = 0
  commands.value = []
  props.entries.forEach((c) => {
    setTimeout(() => {
      commands.value.push(c)
    }, n * props.delay)
    n++
  })
}

onMounted(() => {
  refillCommands()
  if (props.interval) {
    setInterval(
      () => {
        refillCommands()
      },
      props.entries.length * props.delay + props.interval,
    )
  }
})

const copyCommand = async (key: number) => {
  if (commands.value[key]) {
    try {
      copied.value = true
      await navigator.clipboard.writeText(`${commands.value[key].command} ${commands.value[key].flags.join(' ')}`)
      emit('copy', key)
      setTimeout(() => (copied.value = false), 2000)
    } catch (err) {
      copied.value = false
      console.error('Error copying text: ', err)
    }
  }
}
</script>
