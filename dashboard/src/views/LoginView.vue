<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MatuLogo from '../components/MatuLogo.vue'
import { api, setToken } from '../lib/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const { token } = await api.login({ email: email.value, password: password.value })
    setToken(token)
    router.push('/chat')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh matu-wave-bg flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-block mb-4">
          <MatuLogo size="lg" />
        </RouterLink>
        <p class="text-matu-muted mt-2">Inicia sesión para chatear o gestionar API Keys</p>
      </div>

      <form class="matu-card p-8 space-y-5" @submit.prevent="submit">
        <div>
          <label class="block text-sm text-matu-muted mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-xl bg-white border border-matu-border px-4 py-2.5 focus:outline-none focus:border-matu-blue"
          />
        </div>
        <div>
          <label class="block text-sm text-matu-muted mb-1.5">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-xl bg-white border border-matu-border px-4 py-2.5 focus:outline-none focus:border-matu-blue"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-matu-blue hover:bg-matu-blue-hover disabled:opacity-50 text-white font-medium py-2.5 transition"
        >
          {{ loading ? 'Entrando…' : 'Iniciar sesión' }}
        </button>

        <p class="text-center text-sm text-matu-muted">
          ¿No tienes cuenta?
          <RouterLink to="/register" class="text-matu-blue hover:text-matu-blue-hover font-medium">Regístrate</RouterLink>
        </p>
        <p class="text-center text-sm text-matu-muted">
          <RouterLink to="/" class="hover:text-matu-text">← Volver al inicio</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
