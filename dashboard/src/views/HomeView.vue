<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import MatuLogo from '../components/MatuLogo.vue'
import { api, getToken } from '../lib/api'

const userName = ref<string | null>(null)

onMounted(async () => {
  if (!getToken()) return
  try {
    const { user } = await api.me()
    userName.value = user.name
  } catch {
    /* visitante */
  }
})
</script>

<template>
  <div class="min-h-dvh matu-wave-bg flex flex-col">
    <header class="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
      <RouterLink to="/">
        <MatuLogo size="md" />
      </RouterLink>
      <nav class="flex items-center gap-4 sm:gap-6 text-sm text-matu-muted">
        <RouterLink to="/docs" class="hover:text-matu-blue transition">Documentación API</RouterLink>
        <RouterLink
          v-if="userName"
          to="/chat"
          class="text-matu-blue font-medium hover:text-matu-blue-hover transition"
        >
          Ir al chat
        </RouterLink>
        <RouterLink
          v-else
          to="/login"
          class="text-matu-blue font-medium hover:text-matu-blue-hover transition"
        >
          Iniciar sesión
        </RouterLink>
      </nav>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center px-6 pb-24 pt-8">
      <p class="text-sm text-matu-muted mb-8 text-center">
        IA local para MatuByte · API Matu AI
      </p>

      <MatuLogo size="hero" class="mb-6" />

      <p class="text-matu-muted text-center mb-12 max-w-md">
        Explora el chat web o integra modelos Ollama en tus aplicaciones.
      </p>

      <div class="grid sm:grid-cols-2 gap-5 w-full max-w-3xl">
        <RouterLink :to="userName ? '/chat' : '/login'" class="matu-card p-8 block group">
          <h2 class="text-xl font-semibold text-matu-blue mb-3 group-hover:text-matu-blue-hover transition">
            Iniciar conversación con Matu AI
          </h2>
          <p class="text-matu-muted text-sm leading-relaxed">
            Chatea en la web con tus modelos locales. Sin API Key — solo inicia sesión.
          </p>
        </RouterLink>

        <RouterLink to="/docs" class="matu-card p-8 block group">
          <h2 class="text-xl font-semibold text-matu-blue mb-3 group-hover:text-matu-blue-hover transition">
            Accede a la API de Matu AI
          </h2>
          <p class="text-matu-muted text-sm leading-relaxed">
            Documentación, ejemplos de código y gestión de API Keys para tus integraciones.
          </p>
        </RouterLink>
      </div>
    </main>

    <footer class="py-6 text-center text-xs text-matu-muted">
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
