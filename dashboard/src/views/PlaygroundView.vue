<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { FlaskConical, Send, KeyRound, AlertCircle, Loader2 } from '@lucide/vue'
import {
  getPlaygroundApiKey,
  setPlaygroundApiKey,
  streamPlaygroundChat,
  testApiKey,
  type PlaygroundMessage,
} from '../lib/playground'
import { API_BASE } from '../content/docs'

const apiKey = ref('')
const keyValid = ref<boolean | null>(null)
const keyChecking = ref(false)
const model = ref('')
const models = ref<string[]>([])
const messages = ref<PlaygroundMessage[]>([])
const input = ref('')
const streaming = ref(false)
const streamDraft = ref('')
const error = ref('')
const chatEnd = ref<HTMLElement | null>(null)
let abortCtrl: AbortController | null = null

async function validateKey() {
  const key = apiKey.value.trim()
  if (!key) {
    keyValid.value = null
    models.value = []
    return
  }
  keyChecking.value = true
  error.value = ''
  try {
    const ok = await testApiKey(key)
    keyValid.value = ok
    if (ok) {
      setPlaygroundApiKey(key)
      await loadModels(key)
    } else {
      models.value = []
      error.value = 'API Key inválida o revocada'
    }
  } catch (e) {
    keyValid.value = false
    error.value = e instanceof Error ? e.message : 'Error al validar key'
  } finally {
    keyChecking.value = false
  }
}

async function loadModels(key: string) {
  const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')
  const res = await fetch(`${API_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) return
  const data = (await res.json()) as { data?: { id: string }[] }
  models.value = (data.data ?? []).map((m) => m.id)
  if (models.value.length && !model.value) model.value = models.value[0]
}

async function scrollToBottom() {
  await nextTick()
  chatEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value || !apiKey.value.trim() || keyValid.value !== true) return

  error.value = ''
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  streaming.value = true
  streamDraft.value = ''
  await scrollToBottom()

  abortCtrl = new AbortController()
  try {
    const history = [...messages.value]
    for await (const chunk of streamPlaygroundChat(history, model.value, apiKey.value.trim(), abortCtrl.signal)) {
      streamDraft.value += chunk
      await nextTick()
    }
    if (streamDraft.value) {
      messages.value.push({ role: 'assistant', content: streamDraft.value })
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      error.value = e instanceof Error ? e.message : 'Error en el chat'
    }
  } finally {
    streamDraft.value = ''
    streaming.value = false
    abortCtrl = null
    await scrollToBottom()
  }
}

function clearChat() {
  if (streaming.value) abortCtrl?.abort()
  messages.value = []
  streamDraft.value = ''
  error.value = ''
}

onMounted(() => {
  const saved = getPlaygroundApiKey()
  if (saved) {
    apiKey.value = saved
    validateKey()
  }
})
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Config API Key -->
    <div class="shrink-0 mx-5 sm:mx-8 lg:mx-10 mt-5 mb-4 rounded-2xl border border-matu-border/80 bg-white p-4 sm:p-5 shadow-sm space-y-3">
      <div class="flex items-center gap-2 text-sm text-matu-muted">
        <FlaskConical class="w-4 h-4 text-matu-blue" />
        <span>
          Endpoint:
          <code class="text-matu-blue font-mono text-xs">{{ API_BASE }}/v1/chat/completions</code>
        </span>
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <div class="relative flex-1">
          <KeyRound class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-matu-muted" />
          <input
            v-model="apiKey"
            type="password"
            placeholder="Pega tu API Key (mai_live_…)"
            class="w-full rounded-lg bg-white border border-matu-border pl-10 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-matu-blue/20 focus:border-matu-blue"
            @blur="validateKey"
            @keydown.enter.prevent="validateKey"
          />
        </div>
        <button
          type="button"
          :disabled="keyChecking"
          class="shrink-0 rounded-lg bg-matu-text hover:bg-matu-text/90 disabled:opacity-50 px-4 py-2.5 text-sm text-white font-medium"
          @click="validateKey"
        >
          {{ keyChecking ? 'Validando…' : 'Conectar' }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select
          v-if="models.length"
          v-model="model"
          class="rounded-lg border border-matu-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-matu-blue"
        >
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
        <span
          v-if="keyValid === true"
          class="text-xs text-emerald-600 font-medium"
        >
          ✓ Conectado — el consumo aparece en
          <RouterLink to="/dashboard/usage" class="underline">Uso</RouterLink>
        </span>
        <span v-else-if="keyValid === false" class="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle class="w-3.5 h-3.5" />
          Key inválida
        </span>
        <button
          v-if="messages.length"
          type="button"
          class="ml-auto text-xs text-matu-muted hover:text-matu-text"
          @click="clearChat"
        >
          Limpiar chat
        </button>
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
      <p v-else-if="!apiKey" class="text-xs text-matu-muted">
        Crea una key en
        <RouterLink to="/dashboard/keys" class="text-matu-blue hover:underline">API Keys</RouterLink>
        y pégala aquí. Solo se guarda en esta pestaña.
      </p>
    </div>

    <!-- Mensajes -->
    <div class="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 lg:px-10 py-4 space-y-4 chat-scroll">
      <div
        v-if="!messages.length && !streaming"
        class="h-full flex flex-col items-center justify-center text-center text-matu-muted text-sm px-4"
      >
        <FlaskConical class="w-10 h-10 text-matu-blue-muted mb-3" />
        <p>Envía un mensaje para probar tu integración con API Key.</p>
        <p class="text-xs mt-2">A diferencia del chat web, aquí el uso cuenta para métricas de la API.</p>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
          :class="
            msg.role === 'user'
              ? 'bg-matu-blue text-white rounded-br-md'
              : 'bg-matu-surface border border-matu-border text-matu-text rounded-bl-md'
          "
        >
          {{ msg.content }}
        </div>
      </div>

      <div v-if="streaming && streamDraft" class="flex justify-start">
        <div class="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm bg-matu-surface border border-matu-border whitespace-pre-wrap">
          {{ streamDraft }}
        </div>
      </div>
      <div v-else-if="streaming" class="flex justify-start">
        <div class="rounded-2xl px-4 py-2.5 bg-matu-surface border border-matu-border">
          <Loader2 class="w-4 h-4 animate-spin text-matu-muted" />
        </div>
      </div>

      <div ref="chatEnd" />
    </div>

    <!-- Input -->
    <form
      class="shrink-0 px-5 sm:px-8 lg:px-10 py-4 border-t border-matu-border bg-white"
      @submit.prevent="send"
    >
      <div class="flex gap-2 items-end max-w-3xl">
        <textarea
          v-model="input"
          rows="1"
          placeholder="Escribe un mensaje de prueba…"
          :disabled="streaming || keyValid !== true"
          class="flex-1 resize-none rounded-lg border border-matu-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-matu-blue/20 focus:border-matu-blue disabled:opacity-50 min-h-[44px] max-h-32 bg-white"
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          :disabled="streaming || !input.trim() || keyValid !== true"
          class="shrink-0 rounded-lg bg-matu-text hover:bg-matu-text/90 disabled:opacity-50 p-2.5 text-white"
        >
          <Send class="w-5 h-5" />
        </button>
      </div>
    </form>
  </div>
</template>
