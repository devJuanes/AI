<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  KeyRound,
  FlaskConical,
  CreditCard,
  MessageSquare,
  BookOpen,
  LogOut,
  Menu,
  X,
} from '@lucide/vue'
import MatuLogo from '../components/MatuLogo.vue'
import { setToken } from '../lib/api'

defineProps<{ userName?: string | null }>()

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const nav = [
  { to: '/dashboard/usage', label: 'Uso', icon: BarChart3 },
  { to: '/dashboard/keys', label: 'API Keys', icon: KeyRound },
  { to: '/dashboard/playground', label: 'Probar API', icon: FlaskConical },
  { to: '/dashboard/billing', label: 'Facturación', icon: CreditCard },
]

const secondary = [
  { to: '/chat', label: 'Chat web', icon: MessageSquare },
  { to: '/docs', label: 'Documentación', icon: BookOpen },
]

const isPlayground = computed(() => route.path.includes('/playground'))

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function logout() {
  setToken(null)
  router.push('/login')
}
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-white">
    <header class="h-11 shrink-0 border-b border-matu-border flex items-center justify-between px-3 lg:px-4 bg-white z-30">
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="lg:hidden p-1.5 rounded-md text-matu-muted hover:bg-matu-surface"
          aria-label="Menú"
          @click="sidebarOpen = true"
        >
          <Menu class="w-5 h-5" />
        </button>
        <RouterLink to="/dashboard/usage" class="flex items-center gap-2 min-w-0">
          <MatuLogo size="sm" />
          <span class="hidden sm:inline text-sm text-matu-muted truncate">
            Matu AI <span class="text-matu-border mx-1">/</span>
            <span class="text-matu-text">Platform</span>
          </span>
        </RouterLink>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <RouterLink to="/docs" class="hidden sm:inline text-xs text-matu-muted hover:text-matu-text px-2 py-1">
          Docs
        </RouterLink>
        <RouterLink to="/chat" class="hidden sm:inline text-xs text-matu-muted hover:text-matu-text px-2 py-1">
          Chat
        </RouterLink>
        <div
          v-if="userName"
          class="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-xs font-medium"
          :title="userName"
        >
          {{ userName.charAt(0).toUpperCase() }}
        </div>
      </div>
    </header>

    <div class="flex flex-1 min-h-0 overflow-hidden">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 top-11 bg-black/25 z-40 lg:hidden"
          @click="sidebarOpen = false"
        />
      </Transition>

      <aside class="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-matu-border bg-[#fafafa] overflow-hidden">
        <nav class="flex-1 px-2 py-3 space-y-0.5">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors"
            :class="
              isActive(item.to)
                ? 'bg-white text-matu-text font-medium shadow-sm ring-1 ring-matu-border/70'
                : 'text-matu-muted hover:bg-white/80 hover:text-matu-text'
            "
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-70" />
            {{ item.label }}
          </RouterLink>
          <div class="my-3 mx-2 border-t border-matu-border" />
          <RouterLink
            v-for="item in secondary"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-matu-muted hover:bg-white/80 hover:text-matu-text transition-colors"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-60" />
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="shrink-0 p-2 border-t border-matu-border">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-matu-muted hover:bg-white hover:text-matu-text transition-colors"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <aside
        class="lg:hidden flex flex-col w-[260px] max-w-[85vw] shrink-0 bg-[#fafafa] border-r border-matu-border z-50 fixed top-11 bottom-0 left-0 transition-transform duration-200"
        :class="sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-matu-border">
          <span class="text-sm font-medium">Menú</span>
          <button type="button" class="p-1 text-matu-muted" @click="sidebarOpen = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <nav class="flex-1 px-2 py-3 overflow-y-auto">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm mb-0.5"
            :class="isActive(item.to) ? 'bg-white font-medium ring-1 ring-matu-border/70' : 'text-matu-muted'"
            @click="sidebarOpen = false"
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </RouterLink>
        </nav>
      </aside>

      <main
        class="flex-1 min-w-0 min-h-0 overflow-y-auto bg-white"
        :class="isPlayground ? 'flex flex-col overflow-hidden' : ''"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
