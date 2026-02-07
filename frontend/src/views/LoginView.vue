<template>
  <AuthLayout>
    <div
      class="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded-md shadow-md mx-auto px-4 py-8"
    >
      <div class="w-full flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <!-- Logo -->
        <router-link class="flex items-center" to="/">
          <SvgIcon name="wiredoor" height="32" width="32" class="pl-2 mr-4" />
          <h1 class="text-2xl font-medium text-blue-900 dark:text-blue-400">Wiredoor</h1>
        </router-link>
        <ThemeToggle />
      </div>
      <Alert v-if="invalid" class="w-full" type="error" :message="invalidMessage" closable @close="() => { invalid = false }" />
      <!-- Form -->
      <form class="mt-4 space-y-6" action="#" method="POST" @submit.prevent="signIn">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 dark:text-gray-300" for="username">Username</label>
            <input
              v-model="form.username"
              id="username"
              name="username"
              type="text"
              autocomplete="username"
              autofocus
              required
              class="form-input w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 dark:text-gray-300" for="password">Password</label>
            <input
              v-model="form.password"
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="form-input w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            />
          </div>
        </div>
        <div class="flex items-center justify-end mt-6">
          <button
            type="submit"
            :disabled="loading"
            class="btn bg-gray-900 cursor-pointer text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white whitespace-nowrap ml-3"
          >
            Sign in
          </button>
        </div>
      </form>
      <!-- Footer -->
      <div class="pt-5 mt-6 border-t border-gray-200 dark:border-gray-700">
        <!-- Warning -->
        <div class="mt-5">
          <div class="bg-yellow-500/20 text-yellow-700 px-3 py-2 rounded-lg">
            <svg class="inline w-3 h-3 shrink-0 fill-current mr-2" viewBox="0 0 12 12">
              <path
                d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"
              />
            </svg>
            <span class="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              By logging in, you agree to the
              <a
                href="https://github.com/wiredoor/wiredoor/blob/main/TERMS.md"
                target="_blank"
                class="text-blue-600 hover:underline dark:text-blue-400"
              >
                Terms of Service
              </a>.
            </span>
          </div>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>
<script setup lang="ts">
import AuthLayout from '@/components/layouts/AuthLayout.vue'
import SvgIcon from '@/components/SvgIcon'
import ThemeToggle from '@/components/partials/ThemeToggle.vue'
import Alert from '@/components/ui/Alert.vue'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const invalid = ref(false)
const invalidMessage = ref('Invalid Credentials')
const form = ref({
  username: '',
  password: '',
})

const signIn = async () => {
  loading.value = true
  try {
    await authStore.login(form.value.username, form.value.password)
    if (authStore.redirect) {
      await router.push(authStore.redirect)
    } else {
      await router.push('/')
    }
    authStore.setRedirect('/')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    invalid.value = true
    if (e.response.status == 429) {
      invalidMessage.value = 'Too many attempts, try again later'
    } else {
      invalidMessage.value = 'Invalid Credentials'
    }
  } finally {
    loading.value = false
  }
}
</script>
