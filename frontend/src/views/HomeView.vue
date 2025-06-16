<script setup lang="ts">
import MainLayout from '@/components/layouts/MainLayout.vue'
import { Button } from '@/components/ui/button';
import { useNodeForm } from '@/composables/nodes/useNodeForm';
import { useRouter } from 'vue-router';

const router = useRouter();
const { openNodeForm } = useNodeForm()

const wiredoorMainPage = 'https://www.wiredoor.net'

</script>

<template>
  <MainLayout>
    <div class="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      <div class="max-w-5xl mx-auto p-6 space-y-8">
        <div class="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-white">👋 Welcome to Wiredoor</h1>
          <p class="text-gray-600 dark:text-gray-300">
            Wiredoor is a self-hosted ingress-as-a-service platform that lets you securely expose services
            running in private environments — using a reverse VPN powered by WireGuard.
          </p>
          <ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mt-4 space-y-1">
            <li>No open firewall ports required</li>
            <li>Works with Docker, Kubernetes, Raspberry Pi and more</li>
            <li>Automatic SSL (Let's Encrypt or self-signed)</li>
          </ul>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <!-- Create Node -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">➕ Create Your First Node</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Nodes are systems that connect to Wiredoor and let you expose local or subnet services.
            </p>
            <Button variant="info" @click="openNodeForm((form, id) => router.push({ name: 'nodes' }))">
              Create Node
            </Button>
          </div>

          <!-- CLI -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">🧰 Install the CLI</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Use <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">wiredoor-cli</code> to automate service exposure from any system.
            </p>
            <a :href="`${wiredoorMainPage}/docs/cli`" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
              View CLI Docs →
            </a>
          </div>

          <!-- Gateway -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-white">📦 Gateway Deployments</h2>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Connect entire Docker or Kubernetes environments using our lightweight agents.
            </p>
            <ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-2">
              <li>
                <a :href="`${wiredoorMainPage}/docs/docker-gateway`" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
                  Docker Gateway
                </a>
              </li>
              <li>
                <a :href="`${wiredoorMainPage}/docs/kubernetes-gateway`" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
                  Kubernetes Gateway
                </a>
              </li>
              <li>
                <a href="https://github.com/wiredoor/home-assistant-wiredoor-addon" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
                  Home Assistant Add-On
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          Need help? Visit the
          <a :href="`${wiredoorMainPage}/docs`" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
            documentation
          </a>
          or check our
          <a href="https://github.com/wiredoor/wiredoor" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">
            GitHub
          </a>.
        </div>

        <div class="text-center mt-12 text-sm text-gray-600 dark:text-gray-400">
          If you find Wiredoor useful, consider supporting the project ❤️

          <div class="flex justify-center items-center mt-4 space-x-4">
            <a
              href="https://github.com/sponsors/wiredoor"
              target="_blank"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition"
            >
              💖 Sponsor on GitHub
            </a>

            <a
              href="https://github.com/wiredoor/wiredoor"
              target="_blank"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
            >
              ⭐ Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
