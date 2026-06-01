<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Send,
  Square,
  LogOut,
  KeyRound,
  BookOpen,
  CreditCard,
  ChevronDown,
  Mic,
  Brain,
  Trash2,
} from '@lucide/vue'
import MatuLogo from '../components/MatuLogo.vue'
import TypingIndicator from '../components/TypingIndicator.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'
import { useChatAutoScroll } from '../composables/useChatAutoScroll'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { api, setToken, type User } from '../lib/api'
import {
  type ChatMessage,
  type ChatSession,
  createChatMessage,
  createThinkStreamParser,
  createChatSession,
  deleteChatSession,
  fetchChatSession,
  fetchChatSessions,
  fetchDefaultModel,
  filterChatModels,
  listModels,
  migrateLegacySessions,
  pickDefaultModel,
  syncChatSession,
  streamChatCompletion,
  titleFromMessage,
} from '../lib/chat'

const router = useRouter()
const user = ref<User | null>(null)
const sessions = ref<ChatSession[]>([])
const activeId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const model = ref('llama3.2:1b')
const models = ref<string[]>([])
const streaming = ref(false)
const awaitingFirstToken = ref(false)
const error = ref('')
const sidebarOpen = ref(true)
const isMobile = ref(false)
const loadingSessions = ref(false)
const loadingSession = ref(false)
const deleteModalOpen = ref(false)
const deleteTarget = ref<ChatSession | null>(null)
const deleting = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const bottomEl = ref<HTMLElement | null>(null)
const { onScroll, pinToBottom, scrollToBottom, scheduleScroll } = useChatAutoScroll(
  messagesEl,
  bottomEl,
)
let abortCtrl: AbortController | null = null
let activeAssistantIndex = -1
/** Texto en vivo durante el stream (no va a msg.content hasta commit) */
const streamDraft = ref('')
const streamReasoningDraft = ref('')

function liveDraft(index: number) {
  return streaming.value && index === activeAssistantIndex ? streamDraft.value : ''
}

function liveReasoningDraft(index: number) {
  return streaming.value && index === activeAssistantIndex ? streamReasoningDraft.value : ''
}

function resetStreamDraft(index: number) {
  activeAssistantIndex = index
  streamDraft.value = ''
  streamReasoningDraft.value = ''
}

async function appendStreamContent(text: string) {
  if (!text) return
  streamDraft.value += text
  awaitingFirstToken.value = false
  scheduleScroll(true)
  await nextTick()
}

async function appendStreamReasoning(text: string) {
  if (!text) return
  streamReasoningDraft.value += text
  awaitingFirstToken.value = false
  scheduleScroll(true)
  await nextTick()
}

function commitStreamDraft() {
  if (activeAssistantIndex < 0) return
  const live = messages.value[activeAssistantIndex]
  if (!live || live.role !== 'assistant') return

  const patch: Partial<ChatMessage> = {}
  if (streamDraft.value) patch.content = live.content + streamDraft.value
  if (streamReasoningDraft.value) {
    patch.reasoning = (live.reasoning ?? '') + streamReasoningDraft.value
    patch.reasoningOpen = live.reasoningOpen ?? true
  }
  if (Object.keys(patch).length > 0) patchAssistantMessage(activeAssistantIndex, patch)

  streamDraft.value = ''
  streamReasoningDraft.value = ''
}

function ensureMessageId(msg: ChatMessage): ChatMessage {
  return msg.id ? msg : { ...msg, id: crypto.randomUUID() }
}

function patchAssistantMessage(index: number, patch: Partial<ChatMessage>) {
  const current = messages.value[index]
  if (!current) return
  messages.value[index] = { ...current, ...patch }
  if (patch.content || patch.reasoning) awaitingFirstToken.value = false
}

watch(
  () => messages.value.length,
  () => scheduleScroll(true),
)

watch([sidebarOpen, isMobile], ([open, mobile]) => {
  if (mobile && open) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

function stopGeneration() {
  abortCtrl?.abort()
}

const speech = useSpeechRecognition((text, isFinal) => {
  input.value = text
  if (isFinal) speech.stop()
})

const groupedSessions = computed(() => {
  const now = Date.now()
  const day = 86400000
  const groups: { label: string; items: ChatSession[] }[] = [
    { label: 'Hoy', items: [] },
    { label: '7 días', items: [] },
    { label: 'Anteriores', items: [] },
  ]
  for (const s of sessions.value) {
    const age = now - s.updatedAt
    if (age < day) groups[0].items.push(s)
    else if (age < 7 * day) groups[1].items.push(s)
    else groups[2].items.push(s)
  }
  return groups.filter((g) => g.items.length)
})

function syncViewport() {
  isMobile.value = window.matchMedia('(max-width: 1023px)').matches
}

function closeMobileSidebar() {
  if (isMobile.value) sidebarOpen.value = false
}

function openMobileSidebar() {
  sidebarOpen.value = true
}

async function loadSessionList() {
  loadingSessions.value = true
  try {
    sessions.value = await fetchChatSessions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar los chats'
  } finally {
    loadingSessions.value = false
  }
}

async function persistSession(sessionId: string) {
  if (!user.value) return
  const idx = sessions.value.findIndex((s) => s.id === sessionId)
  const existing = idx >= 0 ? sessions.value[idx] : null
  const payload: ChatSession = {
    id: sessionId,
    title: existing?.title ?? 'Nueva conversación',
    messages: messages.value.map(({ reasoningOpen: _o, ...m }) => m),
    updatedAt: Date.now(),
    model: model.value,
  }
  if (idx >= 0) sessions.value[idx] = payload
  else sessions.value.unshift(payload)

  try {
    await syncChatSession(payload, model.value)
    sessions.value = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    error.value = 'No se pudo guardar la conversación'
  }
}

function requestDeleteSession(session: ChatSession) {
  deleteTarget.value = session
  deleteModalOpen.value = true
}

async function confirmDeleteSession() {
  if (!deleteTarget.value) return
  deleting.value = true
  error.value = ''
  try {
    await deleteChatSession(deleteTarget.value.id)
    sessions.value = sessions.value.filter((s) => s.id !== deleteTarget.value!.id)
    if (activeId.value === deleteTarget.value.id) startNewChat()
    deleteModalOpen.value = false
    deleteTarget.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo eliminar el chat'
  } finally {
    deleting.value = false
  }
}

function startNewChat() {
  activeId.value = null
  messages.value = []
  error.value = ''
  input.value = ''
  closeMobileSidebar()
}

async function openSession(id: string) {
  if (streaming.value) return
  error.value = ''
  loadingSession.value = true
  try {
    const session = await fetchChatSession(id)
    activeId.value = id
    messages.value = session.messages.map((m) => ensureMessageId({ ...m }))
    const idx = sessions.value.findIndex((s) => s.id === id)
    const merged = { ...session, messages: [...messages.value] }
    if (idx >= 0) sessions.value[idx] = merged
    else sessions.value.unshift(merged)
    if (session.model) model.value = pickDefaultModel(models.value, session.model)
    closeMobileSidebar()
    pinToBottom()
    await scrollToBottom(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo abrir el chat'
  } finally {
    loadingSession.value = false
  }
}

function toggleReasoning(index: number) {
  const msg = messages.value[index]
  if (msg?.role === 'assistant') {
    msg.reasoningOpen = !msg.reasoningOpen
    messages.value = [...messages.value]
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  error.value = ''
  input.value = ''
  speech.stop()

  pinToBottom()

  const userMsg = createChatMessage('user', text)
  messages.value.push(userMsg)
  await scrollToBottom(true)

  let sessionId = activeId.value
  if (!sessionId) {
    try {
      const created = await createChatSession(titleFromMessage(text), model.value)
      sessionId = created.id
      activeId.value = sessionId
      sessions.value.unshift({
        ...created,
        title: titleFromMessage(text),
        messages: [...messages.value],
        updatedAt: Date.now(),
        model: model.value,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo crear la conversación'
      messages.value.pop()
      return
    }
  } else {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.messages = [...messages.value]
      session.updatedAt = Date.now()
      if (session.title === 'Nueva conversación') session.title = titleFromMessage(text)
    }
  }
  await persistSession(sessionId)

  const assistantMsg = createChatMessage('assistant')
  const assistantIndex = messages.value.length
  resetStreamDraft(assistantIndex)
  messages.value.push(assistantMsg)
  await scrollToBottom(true)

  streaming.value = true
  awaitingFirstToken.value = true
  abortCtrl = new AbortController()

  try {
    const stream = streamChatCompletion(
      messages.value.slice(0, -1).map(({ role, content }) => ({ role, content })),
      model.value,
      abortCtrl.signal,
    )

    const thinkParser = createThinkStreamParser()

    for await (const part of stream) {
      if (messages.value[assistantIndex]?.role !== 'assistant') break

      if (part.type === 'reasoning') {
        await appendStreamReasoning(part.text)
      } else {
        for (const piece of thinkParser.feed(part.text)) {
          if (messages.value[assistantIndex]?.role !== 'assistant') break
          if (piece.type === 'reasoning') await appendStreamReasoning(piece.text)
          else await appendStreamContent(piece.text)
        }
      }
    }

    for (const piece of thinkParser.flush()) {
      if (messages.value[assistantIndex]?.role !== 'assistant') break
      if (piece.type === 'reasoning') await appendStreamReasoning(piece.text)
      else await appendStreamContent(piece.text)
    }

    commitStreamDraft()

    const finalMsg = messages.value[assistantIndex]
    if (finalMsg?.role === 'assistant') {
      if (!finalMsg.reasoning) {
        patchAssistantMessage(assistantIndex, { reasoning: undefined, reasoningOpen: undefined })
      } else {
        patchAssistantMessage(assistantIndex, { reasoningOpen: false })
      }
    }

    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.messages = [...messages.value]
      session.updatedAt = Date.now()
      sessions.value = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
      await persistSession(sessionId)
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return
    error.value = e instanceof Error ? e.message : 'Error al enviar mensaje'
    messages.value.pop()
    const failed = messages.value[assistantIndex]
    if (failed?.role === 'assistant' && !failed.content && !failed.reasoning) messages.value.pop()
  } finally {
    commitStreamDraft()
    streaming.value = false
    awaitingFirstToken.value = false
    activeAssistantIndex = -1
    abortCtrl = null
    await scrollToBottom(true)
  }
}

function onEnter(e: KeyboardEvent) {
  if (!e.shiftKey && !streaming.value && input.value.trim()) {
    e.preventDefault()
    send()
  }
}

function logout() {
  setToken(null)
  router.push('/login')
}

onMounted(async () => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  if (window.matchMedia('(max-width: 1023px)').matches) sidebarOpen.value = false

  try {
    const me = await api.me()
    user.value = me.user
    await loadSessionList()
    if (!sessions.value.length) {
      await migrateLegacySessions(me.user.id)
      await loadSessionList()
    }
    const preferred = await fetchDefaultModel()
    const all = await listModels()
    models.value = filterChatModels(all)
    model.value = pickDefaultModel(models.value, preferred)
  } catch {
    router.push('/login')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="h-dvh flex bg-white text-matu-text overflow-hidden">
    <!-- Backdrop móvil (fuera del flex para evitar bleed) -->
    <Teleport to="body">
      <Transition name="chat-backdrop">
        <button
          v-if="isMobile && sidebarOpen"
          type="button"
          class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px] lg:hidden cursor-default"
          aria-label="Cerrar menú"
          @click="closeMobileSidebar"
        />
      </Transition>
    </Teleport>

    <!-- Sidebar: en body en móvil, en flujo en desktop -->
    <Teleport to="body" :disabled="!isMobile">
      <aside
        v-show="sidebarOpen || !isMobile"
        class="flex flex-col shrink-0 overflow-hidden"
        :class="
          isMobile
            ? 'fixed inset-y-0 left-0 z-[210] w-[min(20rem,88vw)] max-w-[320px] h-dvh max-h-dvh bg-white border-r border-matu-border shadow-2xl'
            : 'relative w-64 bg-matu-surface/80 border-r border-matu-border h-full'
        "
      >
        <div
          class="p-4 flex items-center justify-between gap-2 shrink-0"
          :class="isMobile ? 'border-b border-matu-border bg-white' : ''"
        >
          <RouterLink to="/" @click="closeMobileSidebar">
            <MatuLogo size="sm" />
          </RouterLink>
          <button
            v-if="isMobile"
            type="button"
            class="p-2 rounded-lg text-matu-muted hover:bg-matu-surface hover:text-matu-text transition"
            aria-label="Cerrar menú"
            @click="closeMobileSidebar"
          >
            <PanelLeftClose class="w-5 h-5" />
          </button>
        </div>

      <div class="px-3 pb-2">
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 rounded-xl border border-matu-border bg-white py-2.5 text-sm font-medium hover:border-matu-blue-muted hover:text-matu-blue transition"
          :disabled="streaming"
          @click="startNewChat"
        >
          <MessageSquarePlus class="w-4 h-4" />
          Nuevo chat
        </button>
      </div>

      <div class="flex-1 overflow-y-auto chat-scroll px-2 pb-2 min-h-0">
        <p v-if="loadingSessions" class="px-3 py-4 text-xs text-matu-muted">Cargando chats…</p>
        <p v-else-if="!groupedSessions.length" class="px-3 py-4 text-xs text-matu-muted">
          Sin conversaciones aún
        </p>
        <template v-for="group in groupedSessions" :key="group.label">
          <p class="px-2 py-2 text-xs text-matu-muted font-medium">{{ group.label }}</p>
          <div
            v-for="session in group.items"
            :key="session.id"
            class="group flex items-center gap-0.5 mb-0.5"
          >
            <button
              type="button"
              class="flex-1 min-w-0 text-left px-3 py-2 rounded-lg text-sm truncate transition"
              :class="
                activeId === session.id
                  ? 'bg-matu-blue-soft text-matu-blue font-medium'
                  : 'text-matu-muted hover:bg-matu-surface hover:text-matu-text'
              "
              :disabled="loadingSession"
              @click="openSession(session.id)"
            >
              {{ session.title }}
            </button>
            <button
              type="button"
              class="shrink-0 p-2 rounded-lg text-matu-muted hover:text-red-500 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
              title="Eliminar chat"
              @click="requestDeleteSession(session)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </div>

      <div class="border-t border-matu-border p-3 space-y-1 shrink-0 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <RouterLink
          to="/docs"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-matu-muted hover:bg-matu-surface hover:text-matu-text transition"
          @click="closeMobileSidebar"
        >
          <BookOpen class="w-4 h-4" />
          Documentación
        </RouterLink>
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-matu-muted hover:bg-matu-surface hover:text-matu-text transition"
          @click="closeMobileSidebar"
        >
          <KeyRound class="w-4 h-4" />
          API Keys
        </RouterLink>
        <RouterLink
          to="/billing"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-matu-muted hover:bg-matu-surface hover:text-matu-text transition"
          @click="closeMobileSidebar"
        >
          <CreditCard class="w-4 h-4" />
          Facturación
        </RouterLink>
        <div class="flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg bg-matu-surface/60">
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
    </Teleport>

    <div
      class="flex-1 flex flex-col min-w-0 min-h-0 relative z-0"
      :class="isMobile && sidebarOpen ? 'overflow-hidden' : ''"
    >
      <header class="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-matu-border shrink-0">
        <button
          v-if="isMobile && !sidebarOpen"
          type="button"
          class="p-2 rounded-lg text-matu-muted hover:bg-matu-surface transition shrink-0"
          title="Menú"
          @click="openMobileSidebar"
        >
          <Menu class="w-5 h-5" />
        </button>
        <button
          v-if="!isMobile && !sidebarOpen"
          type="button"
          class="p-2 rounded-lg text-matu-muted hover:bg-matu-surface transition hidden lg:flex"
          @click="sidebarOpen = true"
        >
          <PanelLeft class="w-4 h-4" />
        </button>
        <div class="flex-1 flex items-center justify-center gap-2 min-w-0">
          <MatuLogo size="sm" :show-text="false" />
          <span class="font-medium text-matu-text truncate">Matu AI</span>
        </div>
        <select
          v-if="models.length > 1"
          v-model="model"
          :disabled="streaming"
          class="text-xs sm:text-sm rounded-lg border border-matu-border bg-white px-2 py-1.5 text-matu-muted focus:outline-none focus:border-matu-blue max-w-[120px] sm:max-w-[160px] truncate shrink-0"
        >
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
        <span v-else-if="models.length === 1" class="text-xs text-matu-muted hidden sm:inline">
          {{ model }}
        </span>
      </header>

      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto chat-scroll px-4 sm:px-8 py-6"
        @scroll="onScroll"
      >
        <div v-if="!messages.length" class="h-full flex flex-col items-center justify-center text-center px-4 py-8">
          <MatuLogo size="lg" class="mb-4 opacity-90" />
          <h2 class="text-lg font-medium text-matu-text mb-2">¿En qué puedo ayudarte?</h2>
          <p class="text-sm text-matu-muted max-w-sm">
            Escribe un mensaje abajo para empezar.
          </p>
        </div>

        <div v-else class="max-w-3xl mx-auto space-y-6">
          <div
            v-for="(msg, i) in messages"
            :key="msg.id"
            class="flex gap-3"
            :class="msg.role === 'user' ? 'justify-end' : ''"
          >
            <div
              v-if="msg.role === 'assistant'"
              class="w-8 h-8 rounded-full bg-matu-blue-soft flex items-center justify-center shrink-0 mt-1"
            >
              <MatuLogo size="sm" :show-text="false" class="scale-75" />
            </div>

            <div class="max-w-[85%] sm:max-w-[85%] space-y-2">
              <!-- Razonamiento colapsable -->
              <div
                v-if="
                  msg.role === 'assistant' &&
                  (msg.reasoning || liveReasoningDraft(i))
                "
                class="rounded-xl border border-matu-border bg-matu-surface/80 overflow-hidden"
              >
                <button
                  type="button"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-matu-muted hover:bg-white transition"
                  @click="toggleReasoning(i)"
                >
                  <ChevronDown
                    class="w-4 h-4 shrink-0 transition-transform"
                    :class="msg.reasoningOpen !== false ? 'rotate-0' : '-rotate-90'"
                  />
                  <Brain class="w-3.5 h-3.5 text-matu-blue" />
                  <span>Razonamiento</span>
                </button>
                <div
                  v-show="msg.reasoningOpen !== false"
                  class="px-3 pb-3 text-xs text-matu-muted leading-relaxed whitespace-pre-wrap border-t border-matu-border/60 pt-2 max-h-64 overflow-y-auto chat-scroll"
                >
                  {{ msg.reasoning }}{{ liveReasoningDraft(i) }}
                </div>
              </div>

              <!-- Respuesta -->
              <div
                v-if="
                  msg.role === 'user' ||
                  msg.content ||
                  liveDraft(i) ||
                  (streaming && i === messages.length - 1 && msg.role === 'assistant' && awaitingFirstToken)
                "
                class="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                :class="
                  msg.role === 'user'
                    ? 'bg-matu-blue text-white'
                    : 'bg-matu-surface border border-matu-border text-matu-text'
                "
              >
                <template v-if="msg.content || liveDraft(i)">
                  {{ msg.content }}{{ liveDraft(i) }}
                </template>
                <TypingIndicator
                  v-else-if="
                    streaming &&
                    i === messages.length - 1 &&
                    msg.role === 'assistant' &&
                    awaitingFirstToken
                  "
                />
                <span
                  v-if="
                    streaming &&
                    i === messages.length - 1 &&
                    msg.role === 'assistant' &&
                    (msg.content || liveDraft(i))
                  "
                  class="inline-block w-0.5 h-4 ml-0.5 bg-matu-blue animate-pulse align-middle rounded-sm"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div ref="bottomEl" class="h-px shrink-0 scroll-mt-4" aria-hidden="true" />
        </div>
      </div>

      <div class="shrink-0 px-3 sm:px-8 pb-3 sm:pb-6 pt-1 sm:pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p v-if="error" class="text-sm text-red-500 text-center mb-2 px-1">{{ error }}</p>
        <form
          class="max-w-3xl mx-auto flex items-end gap-1.5 sm:gap-2 rounded-[1.75rem] border border-matu-border bg-white shadow-sm px-3 py-2 sm:px-4 sm:py-2.5 focus-within:border-matu-blue-muted focus-within:ring-2 focus-within:ring-matu-blue-soft transition"
          @submit.prevent="send"
        >
          <textarea
            v-model="input"
            rows="1"
            placeholder="Mensaje a Matu AI"
            class="chat-input flex-1 resize-none bg-transparent py-1.5 px-1 text-sm leading-6 focus:outline-none max-h-32 min-h-[1.5rem]"
            @keydown.enter="onEnter"
          />
          <div class="flex items-center gap-1 shrink-0 self-end mb-0.5">
            <button
              v-if="speech.supported"
              type="button"
              :title="speech.listening ? 'Detener grabación' : 'Dictar mensaje'"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition"
              :class="
                speech.listening
                  ? 'bg-matu-blue-soft text-matu-blue ring-2 ring-matu-blue/25'
                  : 'text-gray-400 hover:bg-matu-surface hover:text-gray-500'
              "
              @click="speech.toggle(input)"
            >
              <Mic class="w-4 h-4" :class="speech.listening ? 'text-matu-blue animate-pulse' : 'text-gray-400'" />
            </button>
            <button
              v-if="streaming"
              type="button"
              title="Detener"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-matu-surface border border-matu-border text-matu-muted hover:text-matu-text flex items-center justify-center transition"
              @click="stopGeneration"
            >
              <Square class="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              v-else
              type="submit"
              :disabled="!input.trim()"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-matu-blue hover:bg-matu-blue-hover disabled:opacity-35 text-white flex items-center justify-center transition shrink-0"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>
        </form>
        <p class="hidden sm:block text-xs text-matu-muted text-center mt-2">
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>

    <ConfirmDeleteModal
      :open="deleteModalOpen"
      title="Eliminar conversación"
      description="Se borrarán todos los mensajes de este chat de forma permanente."
      :loading="deleting"
      @close="deleteModalOpen = false"
      @confirm="confirmDeleteSession"
    />
  </div>
</template>

<style scoped>
.chat-backdrop-enter-active,
.chat-backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.chat-backdrop-enter-from,
.chat-backdrop-leave-to {
  opacity: 0;
}

.chat-input {
  field-sizing: content;
}
</style>
