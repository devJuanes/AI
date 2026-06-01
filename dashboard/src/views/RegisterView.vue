<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
    router.push('/dashboard')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 text-2xl font-bold mb-4">
          AI
        </div>
        <h1 class="text-2xl font-semibold text-white">Crear cuenta</h1>
        <p class="text-slate-400 mt-1">Accede a la IA de MatuByte</p>
      </div>

      <form class="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 space-y-5" @submit.prevent="submit">
        <div>
          <label class="block text-sm text-slate-400 mb-1.5">Nombre</label>
          <input
            v-model="name"
            type="text"
            required
            minlength="2"
            class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1.5">Contraseña (mín. 8)</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-medium py-2.5 transition"
        >
          {{ loading ? 'Creando…' : 'Crear cuenta' }}
        </button>

        <p class="text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?
          <RouterLink to="/login" class="text-indigo-400 hover:text-indigo-300">Inicia sesión</RouterLink>
        </p>
        <p class="text-center text-sm text-slate-500">
          <RouterLink to="/docs" class="hover:text-slate-300">Ver documentación</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
