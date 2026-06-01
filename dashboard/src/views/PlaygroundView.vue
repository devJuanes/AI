<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { Send, KeyRound, AlertCircle, Loader2 } from '@lucide/vue'
import {
  getPlaygroundApiKey,
  setPlaygroundApiKey,
  streamPlaygroundChat,
  testApiKey,
  PLAYGROUND_MODEL,
  type PlaygroundMessage,
} from '../lib/playground'
import { API_BASE } from '../content/docs'

const apiKey = ref('')
const keyValid = ref<boolean | null>(null)
const keyChecking = ref(false)
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
    return
  }
  keyChecking.value = true
  error.value = ''
  try {
    const result = await testApiKey(key)
    keyValid.value = result.ok
    if (result.ok) setPlaygroundApiKey(key)
    else error.value = result.message
  } catch (e) {
    keyValid.value = false
    error.value = e instanceof Error ? e.message : 'Error al validar key'
  } finally {
    keyChecking.value = false
  }
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
    for await (const chunk of streamPlaygroundChat(history, apiKey.value.trim(), abortCtrl.signal)) {
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
    <div class="shrink-0 px-6 py-4 border-b border-matu-border flex items-center justify-between gap-4">
      <h1 class="text-xl font-semibold text-matu-text">Probar API</h1>
      <span class="text-xs text-matu-muted font-mono hidden sm:inline">{{ PLAYGROUND_MODEL }}</span>
    </div>

    <div class="shrink-0 px-6 py-4 border-b border-matu-border/60 bg-[#fafafa] space-y-3">
      <p class="text-xs text-matu-muted">
        Modelo fijo: <span class="font-mono text-matu-text">{{ PLAYGROUND_MODEL }}</span>
        · Endpoint:
        <code class="font-mono">{{ API_BASE }}/chat/completions</code>
      </p>

      <div class="flex flex-col sm:flex-row gap-2 max-w-2xl">
        <div class="relative flex-1">
          <KeyRound class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-matu-muted" />
          <input
            v-model="apiKey"
            type="password"
            placeholder="Pega tu API Key (mai_live_…)"
            class="w-full rounded-md bg-white border border-matu-border pl-10 pr-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-400"
            @blur="validateKey"
            @keydown.enter.prevent="validateKey"
          />
        </div>
        <button
          type="button"
          :disabled="keyChecking"
          class="shrink-0 rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 px-4 py-2 text-sm text-white font-medium"
          @click="validateKey"
        >
          {{ keyChecking ? 'Validando…' : 'Conectar' }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span v-if="keyValid === true" class="text-emerald-600 font-medium">
          ✓ Conectado — consumo en
          <RouterLink to="/dashboard/usage" class="underline">Uso</RouterLink>
        </span>
        <span v-else-if="keyValid === false" class="text-red-500 flex items-center gap-1">
          <AlertCircle class="w-3.5 h-3.5" />
          Key inválida
        </span>
        <button
          v-if="messages.length"
          type="button"
          class="ml-auto text-matu-muted hover:text-matu-text"
          @click="clearChat"
        >
          Limpiar
        </button>
      </div>
      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 chat-scroll">
      <div
        v-if="!messages.length && !streaming"
        class="h-full flex items-center justify-center text-center text-sm text-matu-muted"
      >
        Envía un mensaje de prueba con tu API Key.
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
          :class="
            msg.role === 'user'
              ? 'bg-neutral-900 text-white'
              : 'bg-[#f4f4f5] text-matu-text border border-matu-border/60'
          "
        >
          {{ msg.content }}
        </div>
      </div>

      <div v-if="streaming && streamDraft" class="flex justify-start">
        <div class="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-[#f4f4f5] border border-matu-border/60 whitespace-pre-wrap">
          {{ streamDraft }}
        </div>
      </div>
      <div v-else-if="streaming" class="flex justify-start">
        <Loader2 class="w-4 h-4 animate-spin text-matu-muted" />
      </div>
      <div ref="chatEnd" />
    </div>

    <form class="shrink-0 px-6 py-3 border-t border-matu-border bg-white" @submit.prevent="send">
      <div class="flex gap-2 max-w-2xl">
        <input
          v-model="input"
          type="text"
          placeholder="Mensaje de prueba…"
          :disabled="streaming || keyValid !== true"
          class="flex-1 rounded-md border border-matu-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:opacity-50"
        />
        <button
          type="submit"
          :disabled="streaming || !input.trim() || keyValid !== true"
          class="rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 p-2 text-white"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </form>
  </div>
</template>
