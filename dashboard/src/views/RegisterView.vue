<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MatuLogo from '../components/MatuLogo.vue'
import { api, setToken } from '../lib/api'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const { token } = await api.register({
      name: name.value,
      email: email.value,
      password: password.value,
    })
    setToken(token)
    router.push('/chat')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al registrarse'
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
        <h1 class="text-xl font-semibold text-matu-text">Crear cuenta</h1>
        <p class="text-matu-muted mt-1">Accede al chat y a la API de MatuByte</p>
      </div>

      <form class="matu-card p-8 space-y-5" @submit.prevent="submit">
        <div>
          <label class="block text-sm text-matu-muted mb-1.5">Nombre</label>
          <input
            v-model="name"
            type="text"
            required
            minlength="2"
            class="w-full rounded-xl bg-white border border-matu-border px-4 py-2.5 focus:outline-none focus:border-matu-blue"
          />
        </div>
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
          <label class="block text-sm text-matu-muted mb-1.5">Contraseña (mín. 8)</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            class="w-full rounded-xl bg-white border border-matu-border px-4 py-2.5 focus:outline-none focus:border-matu-blue"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-matu-blue hover:bg-matu-blue-hover disabled:opacity-50 text-white font-medium py-2.5 transition"
        >
          {{ loading ? 'Creando…' : 'Crear cuenta' }}
        </button>

        <p class="text-center text-sm text-matu-muted">
          ¿Ya tienes cuenta?
          <RouterLink to="/login" class="text-matu-blue hover:text-matu-blue-hover font-medium">Inicia sesión</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
