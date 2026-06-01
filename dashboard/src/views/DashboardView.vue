<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Trash2, Copy, FlaskConical } from '@lucide/vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'
import { api, type ApiKeyRecord } from '../lib/api'
import { setPlaygroundApiKey } from '../lib/playground'

const router = useRouter()
const keys = ref<ApiKeyRecord[]>([])
const newKeyName = ref('')
const newSecret = ref<string | null>(null)
const loading = ref(true)
const creating = ref(false)
const error = ref('')
const copied = ref(false)
const showCreate = ref(false)
const revokeModalOpen = ref(false)
const revoking = ref(false)
const keyToRevoke = ref<ApiKeyRecord | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const keyList = await api.listKeys()
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
    showCreate.value = false
    keys.value = [res.key, ...keys.value]
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear key'
  } finally {
    creating.value = false
  }
}

function openRevokeModal(key: ApiKeyRecord) {
  keyToRevoke.value = key
  revokeModalOpen.value = true
}

function closeRevokeModal() {
  if (revoking.value) return
  revokeModalOpen.value = false
  keyToRevoke.value = null
}

async function confirmRevokeKey() {
  if (!keyToRevoke.value) return
  revoking.value = true
  error.value = ''
  try {
    await api.revokeKey(keyToRevoke.value.id)
    keys.value = keys.value.filter((k) => k.id !== keyToRevoke.value!.id)
    revokeModalOpen.value = false
    keyToRevoke.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al revocar'
  } finally {
    revoking.value = false
  }
}

async function copySecret() {
  if (!newSecret.value) return
  await navigator.clipboard.writeText(newSecret.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function tryInPlayground() {
  if (!newSecret.value) return
  setPlaygroundApiKey(newSecret.value)
  router.push('/dashboard/playground')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="px-6 py-4 border-b border-matu-border flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-matu-text">API Keys</h1>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-3 py-1.5"
        @click="showCreate = !showCreate"
      >
        <Plus class="w-4 h-4" />
        Crear API Key
      </button>
    </div>

    <div class="px-6 py-5 space-y-5">
      <p class="text-sm text-matu-muted">
        Las claves permiten acceder a la API. El chat web no requiere API Key —
        <RouterLink to="/chat" class="text-matu-blue hover:underline">usa el chat</RouterLink>.
      </p>

      <section v-if="newSecret" class="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
        <p class="text-sm text-emerald-800 font-medium mb-2">Copia la clave ahora — no se volverá a mostrar.</p>
        <div class="flex gap-2 items-center">
          <code class="flex-1 bg-white rounded-md px-3 py-2 text-xs font-mono break-all border border-emerald-100">{{ newSecret }}</code>
          <button type="button" class="shrink-0 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm text-white" @click="copySecret">
            <Copy class="w-4 h-4 inline" />
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <div class="flex gap-2 mt-3">
          <button type="button" class="text-sm text-emerald-800 font-medium hover:underline flex items-center gap-1" @click="tryInPlayground">
            <FlaskConical class="w-4 h-4" />
            Probar en playground
          </button>
          <button type="button" class="text-sm text-matu-muted hover:text-matu-text" @click="newSecret = null">Ocultar</button>
        </div>
      </section>

      <form
        v-if="showCreate && !newSecret"
        class="flex flex-col sm:flex-row gap-2 max-w-lg p-4 rounded-lg border border-matu-border bg-[#fafafa]"
        @submit.prevent="createKey"
      >
        <input
          v-model="newKeyName"
          type="text"
          placeholder="Nombre (ej. Mi app prod)"
          class="flex-1 rounded-md border border-matu-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
        <button
          type="submit"
          :disabled="creating"
          class="rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 px-4 py-2 text-sm text-white font-medium"
        >
          {{ creating ? 'Creando…' : 'Crear' }}
        </button>
      </form>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div v-if="loading" class="text-sm text-matu-muted py-8">Cargando…</div>

      <div v-else-if="keys.length" class="border border-matu-border rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-[#fafafa] border-b border-matu-border text-left text-xs text-matu-muted">
            <tr>
              <th class="px-4 py-2.5 font-medium">Nombre</th>
              <th class="px-4 py-2.5 font-medium hidden sm:table-cell">Secret key</th>
              <th class="px-4 py-2.5 font-medium hidden md:table-cell">Creada</th>
              <th class="px-4 py-2.5 font-medium hidden lg:table-cell">Último uso</th>
              <th class="px-4 py-2.5 font-medium w-12" />
            </tr>
          </thead>
          <tbody class="divide-y divide-matu-border">
            <tr v-for="key in keys" :key="key.id" class="hover:bg-[#fafafa]/80">
              <td class="px-4 py-3 font-medium text-matu-text">{{ key.name }}</td>
              <td class="px-4 py-3 font-mono text-xs text-matu-muted hidden sm:table-cell">{{ key.keyPrefix }}••••••••</td>
              <td class="px-4 py-3 text-matu-muted hidden md:table-cell">{{ formatDate(key.createdAt) }}</td>
              <td class="px-4 py-3 text-matu-muted hidden lg:table-cell">
                {{ key.lastUsedAt ? formatDate(key.lastUsedAt) : '—' }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="p-1.5 text-matu-muted hover:text-red-600 rounded-md hover:bg-red-50"
                  title="Revocar"
                  @click="openRevokeModal(key)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="text-sm text-matu-muted py-8 text-center border border-dashed border-matu-border rounded-lg">
        Aún no tienes API Keys.
      </p>
    </div>

    <ConfirmDeleteModal
      :open="revokeModalOpen"
      mode="simple"
      title="Revocar API Key"
      :description="
        keyToRevoke
          ? `Se revocará «${keyToRevoke.name}». Las integraciones que usen esta clave dejarán de funcionar.`
          : ''
      "
      confirm-label="Revocar"
      :loading="revoking"
      @close="closeRevokeModal"
      @confirm="confirmRevokeKey"
    />
  </div>
</template>
