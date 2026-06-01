<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { BookOpen, KeyRound, LogIn, LogOut } from '@lucide/vue'
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
  { to: '/docs', label: 'Documentación', icon: BookOpen },
  { to: '/dashboard', label: 'API Keys', icon: KeyRound },
]
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <RouterLink to="/docs" class="flex items-center gap-3 shrink-0">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm ring-1 ring-indigo-500/30"
          >
            AI
          </div>
          <div>
            <p class="font-semibold text-white leading-tight">Matu AI</p>
            <p class="text-[11px] text-slate-500">ai.matubyte.com</p>
          </div>
        </RouterLink>

        <nav class="hidden sm:flex items-center gap-1">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition"
            :class="
              route.path.startsWith(item.to)
                ? 'bg-indigo-500/15 text-indigo-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            "
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <span v-if="userName" class="text-sm text-slate-400 hidden md:block max-w-[120px] truncate">{{
            userName
          }}</span>
          <RouterLink
            v-if="!userName"
            to="/login"
            class="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition"
          >
            <LogIn class="w-4 h-4" />
            <span class="hidden sm:inline">Entrar</span>
          </RouterLink>
          <button
            v-else
            type="button"
            class="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-2 py-2 transition"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      <nav class="sm:hidden flex border-t border-slate-800/80">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition"
          :class="route.path.startsWith(item.to) ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-500'"
        >
          <component :is="item.icon" class="w-3.5 h-3.5" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
      Matu AI · MatuByte ·
      <a
        href="https://github.com/devJuanes/AI"
        target="_blank"
        rel="noopener"
        class="text-slate-500 hover:text-indigo-400 transition"
        >GitHub</a
      >
    </footer>
  </div>
</template>
