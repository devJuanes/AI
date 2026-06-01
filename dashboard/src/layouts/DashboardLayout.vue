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
  ChevronRight,
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

const pageMeta = computed(() => {
  if (route.path.includes('/usage'))
    return { title: 'Uso', subtitle: 'Consumo de tokens y solicitudes API por mes.' }
  if (route.path.includes('/keys'))
    return { title: 'API Keys', subtitle: 'Crea y gestiona claves para integraciones externas.' }
  if (route.path.includes('/playground'))
    return { title: 'Probar API', subtitle: 'Chat de prueba con tu API Key en tiempo real.' }
  if (route.path.includes('/billing'))
    return { title: 'Facturación', subtitle: 'Planes y facturación del consumo API.' }
  return { title: 'Plataforma', subtitle: 'Panel de desarrolladores Matu AI.' }
})

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
  <div class="min-h-dvh flex bg-white">
    <!-- Backdrop móvil -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/25 z-40 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar izquierdo -->
    <aside
      class="flex flex-col shrink-0 bg-[#fbfbfc] border-r border-matu-border z-50
        w-[248px] max-w-[85vw]
        fixed inset-y-0 left-0 transition-transform duration-200 ease-out
        lg:static lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'"
    >
      <!-- Logo -->
      <div class="h-[60px] flex items-center justify-between px-5 border-b border-matu-border/70 shrink-0">
        <RouterLink to="/dashboard/usage" class="flex items-center gap-2.5 min-w-0" @click="sidebarOpen = false">
          <MatuLogo size="sm" />
          <span
            class="text-[10px] font-bold uppercase tracking-widest text-matu-muted/90 px-1.5 py-0.5 rounded border border-matu-border bg-white"
          >
            Platform
          </span>
        </RouterLink>
        <button
          type="button"
          class="lg:hidden p-1 rounded-md text-matu-muted hover:bg-white"
          @click="sidebarOpen = false"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Nav principal -->
      <nav class="flex-1 px-3 py-5 overflow-y-auto">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] mb-0.5 transition-all"
          :class="
            isActive(item.to)
              ? 'bg-white text-matu-blue font-medium shadow-sm ring-1 ring-matu-border/80'
              : 'text-matu-text/75 hover:bg-white/70 hover:text-matu-text'
          "
          @click="sidebarOpen = false"
        >
          <component
            :is="item.icon"
            class="w-[18px] h-[18px] shrink-0"
            :class="isActive(item.to) ? 'text-matu-blue' : 'text-matu-muted'"
          />
          {{ item.label }}
        </RouterLink>

        <div class="my-5 mx-3 border-t border-matu-border/80" />

        <p class="px-3 mb-2 text-[11px] font-medium text-matu-muted/80">Enlaces</p>
        <RouterLink
          v-for="item in secondary"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-matu-muted hover:bg-white/70 hover:text-matu-text transition-colors mb-0.5"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-70" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- Footer sidebar -->
      <div class="shrink-0 px-3 py-4 border-t border-matu-border/70">
        <div
          v-if="userName"
          class="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-lg bg-white border border-matu-border/60"
        >
          <div
            class="w-8 h-8 rounded-full bg-matu-blue-soft text-matu-blue flex items-center justify-center text-sm font-semibold shrink-0"
          >
            {{ userName.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-matu-text truncate">{{ userName }}</p>
            <p class="text-[11px] text-matu-muted">Cuenta activa</p>
          </div>
        </div>
        <button
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-matu-muted hover:bg-white hover:text-matu-text transition-colors"
          @click="logout"
        >
          <LogOut class="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Columna principal -->
    <div class="flex flex-col flex-1 min-w-0 min-h-dvh">
      <!-- Header superior -->
      <header class="shrink-0 bg-white border-b border-matu-border sticky top-0 z-30">
        <!-- Barra móvil -->
        <div class="lg:hidden flex items-center gap-3 h-14 px-4">
          <button
            type="button"
            class="p-2 -ml-1 rounded-lg text-matu-muted hover:bg-matu-surface"
            aria-label="Abrir menú"
            @click="sidebarOpen = true"
          >
            <Menu class="w-5 h-5" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-matu-text truncate">{{ pageMeta.title }}</p>
          </div>
        </div>

        <!-- Header desktop -->
        <div class="hidden lg:flex items-start justify-between gap-6 px-8 xl:px-10 pt-7 pb-6">
          <div>
            <nav class="flex items-center gap-1.5 text-xs text-matu-muted mb-2">
              <RouterLink to="/dashboard/usage" class="hover:text-matu-blue transition-colors">
                Matu AI Platform
              </RouterLink>
              <ChevronRight class="w-3.5 h-3.5 opacity-50" />
              <span class="text-matu-text/70">{{ pageMeta.title }}</span>
            </nav>
            <h1 class="text-[28px] font-bold text-matu-text tracking-tight leading-tight">
              {{ pageMeta.title }}
            </h1>
            <p class="mt-1.5 text-sm text-matu-muted max-w-xl">{{ pageMeta.subtitle }}</p>
          </div>
          <div v-if="userName" class="flex items-center gap-2 pt-1 shrink-0">
            <div
              class="w-9 h-9 rounded-full bg-matu-blue-soft text-matu-blue flex items-center justify-center text-sm font-semibold"
            >
              {{ userName.charAt(0).toUpperCase() }}
            </div>
          </div>
        </div>
      </header>

      <!-- Contenido -->
      <main
        class="flex-1 overflow-y-auto bg-[#f7f8fa]"
        :class="isPlayground ? 'flex flex-col min-h-0' : ''"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
