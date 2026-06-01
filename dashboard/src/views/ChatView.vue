<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeft,
  Send,
  LogOut,
  KeyRound,
  BookOpen,
} from '@lucide/vue'
import MatuLogo from '../components/MatuLogo.vue'
import { api, setToken, type User } from '../lib/api'
import {
  type ChatMessage,
  type ChatSession,
  listModels,
  loadSessions,
  newSessionId,
  saveSessions,
  streamChatCompletion,
  titleFromMessage,
} from '../lib/chat'

const router = useRouter()
const user = ref<User | null>(null)
const sessions = ref<ChatSession[]>([])
const activeId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const model = ref('llama3.2')
const models = ref<string[]>([])
const loading = ref(false)
const streaming = ref(false)
const error = ref('')
const sidebarOpen = ref(true)
const messagesEl = ref<HTMLElement | null>(null)
let abortCtrl: AbortController | null = null

const activeSession = computed(() => sessions.value.find((s) => s.id === activeId.value))

function persist() {
  if (!user.value) return
  saveSessions(user.value.id, sessions.value)
}

function startNewChat() {
  activeId.value = null
  messages.value = []
  error.value = ''
  input.value = ''
}

function openSession(id: string) {
  const session = sessions.value.find((s) => s.id === id)
  if (!session) return
  activeId.value = id
  messages.value = [...session.messages]
  error.value = ''
}

function groupSessions(list: ChatSession[]) {
  const now = Date.now()
  const day = 86400000
  const groups: { label: string; items: ChatSession[] }[] = [
    { label: 'Hoy', items: [] },
    { label: '7 días', items: [] },
    { label: 'Anteriores', items: [] },
  ]
  for (const s of list) {
    const age = now - s.updatedAt
    if (age < day) groups[0].items.push(s)
    else if (age < 7 * day) groups[1].items.push(s)
    else groups[2].items.push(s)
  }
  return groups.filter((g) => g.items.length)
}

const groupedSessions = computed(() => groupSessions(sessions.value))

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

watch(messages, scrollToBottom, { deep: true })

async function send() {
  const text = input.value.trim()
  if (!text || loading.value || streaming.value) return

  error.value = ''
  input.value = ''

  const userMsg: ChatMessage = { role: 'user', content: text }
  messages.value.push(userMsg)

  let sessionId = activeId.value
  if (!sessionId) {
    sessionId = newSessionId()
    activeId.value = sessionId
    sessions.value.unshift({
      id: sessionId,
      title: titleFromMessage(text),
      messages: [...messages.value],
      updatedAt: Date.now(),
    })
  } else {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.messages = [...messages.value]
      session.updatedAt = Date.now()
      if (session.title === 'Nueva conversación') session.title = titleFromMessage(text)
    }
  }
  persist()

  const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
  messages.value.push(assistantMsg)

  streaming.value = true
  abortCtrl = new AbortController()

  try {
    const stream = streamChatCompletion(
      messages.value.slice(0, -1),
      model.value,
      abortCtrl.signal,
    )
    for await (const chunk of stream) {
      assistantMsg.content += chunk
      messages.value = [...messages.value]
    }

    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.messages = [...messages.value]
      session.updatedAt = Date.now()
      sessions.value = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
      persist()
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return
    error.value = e instanceof Error ? e.message : 'Error al enviar mensaje'
    messages.value.pop()
    if (assistantMsg.content === '') messages.value.pop()
  } finally {
    streaming.value = false
    abortCtrl = null
  }
}

function logout() {
  setToken(null)
  router.push('/login')
}

onMounted(async () => {
  try {
    const me = await api.me()
    user.value = me.user
    sessions.value = loadSessions(me.user.id)
    models.value = await listModels()
    if (models.value.length && !models.value.includes(model.value)) {
      model.value = models.value[0]
    }
  } catch {
    router.push('/login')
  }
})
</script>

<template>
  <div class="h-dvh flex bg-white text-matu-text overflow-hidden">
    <!-- Sidebar -->
    <aside
      v-show="sidebarOpen"
      class="w-64 shrink-0 border-r border-matu-border flex flex-col bg-matu-surface/50"
    >
      <div class="p-4 flex items-center justify-between gap-2">
        <RouterLink to="/">
          <MatuLogo size="sm" />
        </RouterLink>
        <button
          type="button"
          class="p-1.5 rounded-lg text-matu-muted hover:bg-white hover:text-matu-text transition lg:hidden"
          @click="sidebarOpen = false"
        >
          <PanelLeftClose class="w-4 h-4" />
        </button>
      </div>

      <div class="px-3 pb-2">
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 rounded-xl border border-matu-border bg-white py-2.5 text-sm font-medium hover:border-matu-blue-muted hover:text-matu-blue transition"
          @click="startNewChat"
        >
          <MessageSquarePlus class="w-4 h-4" />
          Nuevo chat
        </button>
      </div>

      <div class="flex-1 overflow-y-auto chat-scroll px-2 pb-2">
        <template v-for="group in groupedSessions" :key="group.label">
          <p class="px-2 py-2 text-xs text-matu-muted font-medium">{{ group.label }}</p>
          <button
            v-for="session in group.items"
            :key="session.id"
            type="button"
            class="w-full text-left px-3 py-2 rounded-lg text-sm truncate transition mb-0.5"
            :class="
              activeId === session.id
                ? 'bg-matu-blue-soft text-matu-blue font-medium'
                : 'text-matu-muted hover:bg-white hover:text-matu-text'
            "
            @click="openSession(session.id)"
          >
            {{ session.title }}
          </button>
        </template>
      </div>

      <div class="border-t border-matu-border p-3 space-y-1">
        <RouterLink
          to="/docs"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-matu-muted hover:bg-white hover:text-matu-text transition"
        >
          <BookOpen class="w-4 h-4" />
          Documentación
        </RouterLink>
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-matu-muted hover:bg-white hover:text-matu-text transition"
        >
          <KeyRound class="w-4 h-4" />
          API Keys
        </RouterLink>
        <div class="flex items-center gap-2 px-3 py-2 mt-1">
          <div
            class="w-8 h-8 rounded-full bg-matu-blue text-white flex items-center justify-center text-xs font-semibold shrink-0"
          >
            {{ user?.name?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ user?.name }}</p>
            <p class="text-xs text-matu-muted truncate">{{ user?.email }}</p>
          </div>
          <button
            type="button"
            class="p-1.5 text-matu-muted hover:text-red-500 transition"
            title="Salir"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-matu-border shrink-0">
        <button
          v-if="!sidebarOpen"
          type="button"
          class="p-2 rounded-lg text-matu-muted hover:bg-matu-surface transition"
          @click="sidebarOpen = true"
        >
          <PanelLeft class="w-4 h-4" />
        </button>
        <div class="flex-1 flex items-center justify-center gap-2">
          <MatuLogo size="sm" :show-text="false" />
          <span class="font-medium text-matu-text">Matu AI</span>
        </div>
        <select
          v-model="model"
          class="text-xs sm:text-sm rounded-lg border border-matu-border bg-white px-2 py-1.5 text-matu-muted focus:outline-none focus:border-matu-blue max-w-[140px] truncate"
        >
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
      </header>

      <div ref="messagesEl" class="flex-1 overflow-y-auto chat-scroll px-4 sm:px-8 py-6">
        <div v-if="!messages.length" class="h-full flex flex-col items-center justify-center text-center px-4">
          <MatuLogo size="lg" class="mb-4 opacity-90" />
          <h2 class="text-lg font-medium text-matu-text mb-2">¿En qué puedo ayudarte?</h2>
          <p class="text-sm text-matu-muted max-w-sm">
            Escribe un mensaje abajo. Usa el chat web sin API Key — tu sesión ya está autenticada.
          </p>
        </div>

        <div v-else class="max-w-3xl mx-auto space-y-6">
          <div v-for="(msg, i) in messages" :key="i" class="flex gap-3" :class="msg.role === 'user' ? 'justify-end' : ''">
            <div
              v-if="msg.role === 'assistant'"
              class="w-8 h-8 rounded-full bg-matu-blue-soft flex items-center justify-center shrink-0"
            >
              <MatuLogo size="sm" :show-text="false" class="scale-75" />
            </div>
            <div
              class="rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap"
              :class="
                msg.role === 'user'
                  ? 'bg-matu-blue text-white'
                  : 'bg-matu-surface border border-matu-border text-matu-text'
              "
            >
              {{ msg.content }}
              <span
                v-if="streaming && i === messages.length - 1 && msg.role === 'assistant'"
                class="inline-block w-1.5 h-4 ml-0.5 bg-matu-blue animate-pulse align-middle"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="shrink-0 px-4 sm:px-8 pb-6 pt-2">
        <p v-if="error" class="text-sm text-red-500 text-center mb-2">{{ error }}</p>
        <form
          class="max-w-3xl mx-auto rounded-2xl border border-matu-border bg-white shadow-sm focus-within:border-matu-blue-muted focus-within:shadow-md transition"
          @submit.prevent="send"
        >
          <textarea
            v-model="input"
            rows="1"
            placeholder="Mensaje a Matu AI"
            class="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm focus:outline-none min-h-[52px] max-h-40"
            :disabled="streaming"
            @keydown.enter.exact.prevent="send"
          />
          <div class="flex items-center justify-between px-3 pb-3">
            <span class="text-xs text-matu-muted hidden sm:inline">Enter para enviar</span>
            <button
              type="submit"
              :disabled="!input.trim() || streaming"
              class="ml-auto w-9 h-9 rounded-full bg-matu-blue hover:bg-matu-blue-hover disabled:opacity-40 text-white flex items-center justify-center transition"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
