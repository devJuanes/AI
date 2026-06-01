<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { BookOpen, KeyRound, MessageSquare, LogIn, LogOut } from '@lucide/vue'
import MatuLogo from '../components/MatuLogo.vue'
import { setToken } from '../lib/api'

defineProps<{
  userName?: string | null
}>()

const route = useRoute()

function logout() {
  setToken(null)
  window.location.href = '/login'
}

const nav = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/docs', label: 'Documentación', icon: BookOpen },
  { to: '/dashboard', label: 'API Keys', icon: KeyRound },
]
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-white">
    <header class="border-b border-matu-border bg-white/90 backdrop-blur sticky top-0 z-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <RouterLink to="/">
          <MatuLogo size="md" />
        </RouterLink>

        <nav class="hidden sm:flex items-center gap-1">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition"
            :class="
              route.path.startsWith(item.to)
                ? 'bg-matu-blue-soft text-matu-blue font-medium'
                : 'text-matu-muted hover:text-matu-text hover:bg-matu-surface'
            "
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <span v-if="userName" class="text-sm text-matu-muted hidden md:block max-w-[120px] truncate">{{
            userName
          }}</span>
          <RouterLink
            v-if="!userName"
            to="/login"
            class="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-matu-blue hover:bg-matu-blue-hover text-white font-medium transition"
          >
            <LogIn class="w-4 h-4" />
            <span class="hidden sm:inline">Entrar</span>
          </RouterLink>
          <button
            v-else
            type="button"
            class="flex items-center gap-1.5 text-sm text-matu-muted hover:text-matu-text px-2 py-2 transition"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      <nav class="sm:hidden flex border-t border-matu-border">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition"
          :class="route.path.startsWith(item.to) ? 'text-matu-blue bg-matu-blue-soft' : 'text-matu-muted'"
        >
          <component :is="item.icon" class="w-3.5 h-3.5" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-matu-border py-6 text-center text-xs text-matu-muted">
      Matu AI · MatuByte ·
      <a
        href="https://github.com/devJuanes/AI"
        target="_blank"
        rel="noopener"
        class="hover:text-matu-blue transition"
        >GitHub</a
      >
    </footer>
  </div>
</template>
