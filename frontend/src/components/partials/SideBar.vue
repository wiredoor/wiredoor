<template>
  <div class="min-w-fit">
    <!-- Sidebar backdrop (mobile only) -->
    <div
      class="fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200"
      :class="props.sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      aria-hidden="true"
    ></div>

    <!-- Sidebar -->
    <div
      id="sidebar"
      ref="sidebar"
      class="flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:w-64! shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out"
      :class="[
        props.variant === 'v2'
          ? 'border-r border-gray-200 dark:border-gray-700/60'
          : 'rounded-r-2xl shadow-xs',
        props.sidebarOpen ? 'translate-x-0' : '-translate-x-64',
      ]"
    >
      <!-- Sidebar header -->
      <div class="flex justify-between mb-10 pr-3 sm:px-2">
        <!-- Close button -->
        <button
          ref="trigger"
          class="lg:hidden text-gray-500 hover:text-gray-400"
          @click.stop="$emit('close-sidebar')"
          aria-controls="sidebar"
          :aria-expanded="props.sidebarOpen"
        >
          <span class="sr-only">Close sidebar</span>
          <SvgIcon name="back" class="w-6 h-6 fill-current" />
        </button>
        <!-- Logo -->
        <router-link class="flex items-center" to="/">
          <SvgIcon name="wiredoor" height="32" width="32" class="pl-2 mr-4" />
          <h1 class="text-2xl font-semibold text-blue-900">Wiredoor</h1>
        </router-link>
      </div>

      <!-- Links -->
      <div class="space-y-8">
        <div v-for="(menuGroup, kg) in menuItems" :key="kg">
          <h3
            v-if="menuGroup.title"
            class="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3"
          >
            <span
              class="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6"
              aria-hidden="true"
              >•••</span
            >
            <span class="lg:hidden lg:sidebar-expanded:block 2xl:block">{{ menuGroup.title }}</span>
          </h3>
          <ul>
            <div v-for="(menu, km) in menuGroup.menuList" :key="km">
              <router-link
                v-if="!menu.children"
                :to="menu.path"
                custom
                v-slot="{ href, navigate, isActive }"
              >
                <li
                  class="pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r"
                  :class="
                    isActive && 'from-blue-500/[0.12] dark:from-blue-500/[0.24] to-blue-500/[0.04]'
                  "
                >
                  <a
                    class="block text-gray-800 dark:text-gray-100 truncate transition"
                    :class="isActive ? '' : 'hover:text-gray-900 dark:hover:text-white'"
                    :href="href"
                    @click="navigate"
                  >
                    <div class="flex items-center">
                      <SvgIcon
                        :name="menu.icon"
                        width="16"
                        height="16"
                        class="shrink-0"
                        :class="
                          isActive
                            ? 'text-blue-800 dark:text-blue-200'
                            : 'text-gray-400 dark:text-gray-500'
                        "
                      />
                      <span
                        class="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200"
                        >{{ menu.text }}</span
                      >
                    </div>
                  </a>
                </li>
              </router-link>
              <SidebarLinkGroup
                v-else
                v-slot="parentLink"
                :activeCondition="menu.children.some((c) => c.path === currentRoute.path)"
              >
                <a
                  class="block text-gray-800 dark:text-gray-100 truncate transition"
                  :class="
                    currentRoute.fullPath.includes('ecommerce')
                      ? ''
                      : 'hover:text-gray-900 dark:hover:text-white'
                  "
                  :href="menu.path"
                  @click.prevent="openGroup(parentLink)"
                >
                  <div class="flex items-center justify-between hover:cursor-pointer">
                    <div class="flex items-center">
                      <SvgIcon
                        :name="menu.icon"
                        class="shrink-0 fill-current"
                        :class="
                          currentRoute.fullPath.includes('ecommerce')
                            ? 'text-blue-800 dark:text-blue-200'
                            : 'text-gray-400 dark:text-gray-500'
                        "
                        width="16"
                        height="16"
                      />
                      <span
                        class="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200"
                        >{{ menu.text }}</span
                      >
                    </div>
                    <!-- Icon -->
                    <div class="flex shrink-0 ml-2">
                      <svg
                        class="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500"
                        :class="parentLink.expanded && 'rotate-180'"
                        viewBox="0 0 12 12"
                      >
                        <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                      </svg>
                    </div>
                  </div>
                </a>
                <div class="lg:hidden lg:sidebar-expanded:block 2xl:block">
                  <ul class="pl-8 mt-1" :class="!parentLink.expanded && 'hidden'">
                    <router-link
                      v-for="(child, kc) in menu.children"
                      :key="kc"
                      :to="child.path"
                      custom
                      v-slot="{ href, navigate, isExactActive }"
                    >
                      <li class="mb-1 last:mb-0 hover:cursor-pointer">
                        <a
                          class="block transition truncate"
                          :class="
                            isExactActive
                              ? 'text-blue-800 dark:text-blue-200'
                              : 'text-gray-500/90 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          "
                          :href="href"
                          @click="navigate"
                        >
                          <span
                            class="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200"
                            >{{ child.text }}</span
                          >
                        </a>
                      </li>
                    </router-link>
                  </ul>
                </div>
              </SidebarLinkGroup>
            </div>
          </ul>
        </div>
      </div>

      <!-- Expand / collapse button -->
      <div class="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
        <div class="w-12 pl-4 pr-3 py-2">
          <button
            class="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            @click.prevent="sidebarExpanded = !sidebarExpanded"
          >
            <span class="sr-only">Expand / collapse sidebar</span>
            <SvgIcon
              name="collapseOrExpand"
              class="shrink-0 fill-current hover:cursor-pointer text-gray-400 dark:text-gray-500 sidebar-expanded:rotate-180"
              width="16"
              height="16"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import SidebarLinkGroup from './SidebarLinkGroup.vue'
import SvgIcon from '@/components/SvgIcon.tsx'

const emit = defineEmits(['close-sidebar'])

const props = defineProps({
  sidebarOpen: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'v2',
  },
})

const trigger = ref<HTMLElement>()
const sidebar = ref<HTMLElement>()

const storedSidebarExpanded = localStorage.getItem('sidebar-expanded')
const sidebarExpanded = ref(
  storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
)

const currentRoute = useRouter().currentRoute.value

interface MenuLeaf {
  text: string
  path: string
}

interface Menu {
  icon: string
  text: string
  path: string
  children?: MenuLeaf[]
}

interface MenuGroup {
  title?: string
  menuList: Menu[]
}

const menuItems: MenuGroup[] = [
  {
    menuList: [
      {
        icon: 'home',
        text: 'Home',
        path: '/',
      },
    ],
  },
  {
    title: 'Pages',
    menuList: [
      {
        icon: 'www',
        text: 'Domain Names',
        path: '/domains',
      },
      {
        icon: 'nodes',
        text: 'Client / Nodes',
        path: '/nodes',
      },
    ],
  },
]

// @ts-expect-error: Unreachable code error
const clickHandler = ({ target }) => {
  if (!sidebar.value || !trigger.value) return
  if (!props.sidebarOpen || sidebar.value.contains(target) || trigger.value.contains(target)) return
  emit('close-sidebar')
}

// @ts-expect-error: Unreachable code error
const openGroup = (parentLink) => {
  parentLink.handleClick()
  sidebarExpanded.value = true
}

// @ts-expect-error: Unreachable code error
const keyHandler = ({ keyCode }) => {
  if (!props.sidebarOpen || keyCode !== 27) return
  emit('close-sidebar')
}

onMounted(() => {
  document.addEventListener('click', clickHandler)
  document.addEventListener('keydown', keyHandler)
})

onUnmounted(() => {
  document.removeEventListener('click', clickHandler)
  document.removeEventListener('keydown', keyHandler)
})

watch(sidebarExpanded, () => {
  localStorage.setItem('sidebar-expanded', `${sidebarExpanded.value}`)
  if (sidebarExpanded.value) {
    document.querySelector('body')?.classList.add('sidebar-expanded')
  } else {
    document.querySelector('body')?.classList.remove('sidebar-expanded')
  }
})
</script>
