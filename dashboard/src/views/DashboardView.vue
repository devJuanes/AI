<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { KeyRound, Plus, Trash2, Copy } from '@lucide/vue'
import AppLayout from '../layouts/AppLayout.vue'
import { api, type ApiKeyRecord, type User } from '../lib/api'
import { API_BASE } from '../content/docs'

const router = useRouter()
const user = ref<User | null>(null)
const keys = ref<ApiKeyRecord[]>([])
const newKeyName = ref('')
const newSecret = ref<string | null>(null)
const loading = ref(true)
const creating = ref(false)
const error = ref('')
const copied = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [me, keyList] = await Promise.all([api.me(), api.listKeys()])
    user.value = me.user
    keys.value = keyList.keys
  } catch {
    router.push('/login')
  } finally {
    loading.value = false
  }
}

async function createKey() {
  if (!newKeyName.value.trim()) return
  creating.value = true
  error.value = ''
  try {
    const res = await api.createKey(newKeyName.value.trim())
    newSecret.value = res.secret
    newKeyName.value = ''
    keys.value = [res.key, ...keys.value]
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear key'
  } finally {
    creating.value = false
  }
}

async function revokeKey(id: string) {
  if (!confirm('¿Revocar esta API Key? Las apps que la usen dejarán de funcionar.')) return
  try {
    await api.revokeKey(id)
    keys.value = keys.value.filter((k) => k.id !== id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al revocar'
  }
}

async function copySecret() {
  if (!newSecret.value) return
  await navigator.clipboard.writeText(newSecret.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

onMounted(load)
</script>

<template>
  <AppLayout :user-name="user?.name">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-10 space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-white mb-1">API Keys</h1>
        <p class="text-slate-400 text-sm">
          Gestiona las claves para consumir la API en
          <span class="text-indigo-400 font-mono">{{ API_BASE }}</span>
        </p>
      </div>

      <section v-if="newSecret" class="rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-5">
        <p class="text-emerald-400 font-medium mb-2">¡API Key creada! Cópiala ahora — no se volverá a mostrar.</p>
        <div class="flex gap-2 items-center">
          <code class="flex-1 bg-slate-950 rounded-lg px-3 py-2 text-sm text-emerald-300 break-all">{{ newSecret }}</code>
          <button
            type="button"
            class="shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm text-white"
            @click="copySecret"
          >
            <Copy class="w-4 h-4" />
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <button type="button" class="mt-3 text-sm text-slate-400 hover:text-white" @click="newSecret = null">
          Entendido, ocultar
        </button>
      </section>

      <section class="rounded-xl bg-slate-900/50 border border-slate-800 p-5">
        <div class="flex items-center gap-2 mb-4">
          <KeyRound class="w-5 h-5 text-indigo-400" />
          <h2 class="font-semibold text-white">Tus claves</h2>
        </div>

        <form class="flex flex-col sm:flex-row gap-2 mb-6" @submit.prevent="createKey">
          <input
            v-model="newKeyName"
            type="text"
            placeholder="Nombre (ej. MatuDoctor prod)"
            class="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            :disabled="creating"
            class="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-4 py-2.5 text-white font-medium"
          >
            <Plus class="w-4 h-4" />
            Crear API Key
          </button>
        </form>

        <p v-if="error" class="text-sm text-red-400 mb-4">{{ error }}</p>
        <div v-if="loading" class="text-slate-500 text-sm">Cargando…</div>

        <ul v-else-if="keys.length" class="space-y-3">
          <li
            v-for="key in keys"
            :key="key.id"
            class="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-4 py-3"
          >
            <div>
              <p class="font-medium text-white">{{ key.name }}</p>
              <p class="text-sm text-slate-500 font-mono">{{ key.keyPrefix }}••••••••</p>
              <p v-if="key.lastUsedAt" class="text-xs text-slate-600 mt-0.5">
                Último uso: {{ new Date(key.lastUsedAt).toLocaleString('es') }}
              </p>
            </div>
            <button
              type="button"
              class="p-2 text-slate-500 hover:text-red-400 transition"
              title="Revocar"
              @click="revokeKey(key.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </li>
        </ul>

        <p v-else class="text-slate-500 text-sm">Aún no tienes API Keys. Crea una para empezar.</p>
      </section>

      <p class="text-sm text-slate-500">
        ¿Cómo integrar?
        <RouterLink to="/docs" class="text-indigo-400 hover:text-indigo-300">Ver documentación completa →</RouterLink>
      </p>
    </div>
  </AppLayout>
</template>
