<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    confirmWord?: string
    confirmLabel?: string
    /** typed = escribir palabra; simple = solo botones */
    mode?: 'typed' | 'simple'
    loading?: boolean
  }>(),
  {
    title: 'Eliminar conversación',
    description: 'Esta acción no se puede deshacer. Se borrarán todos los mensajes de este chat.',
    confirmWord: 'eliminar',
    confirmLabel: 'Eliminar',
    mode: 'typed',
    loading: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const input = ref('')

const canConfirm = computed(() => {
  if (props.loading) return false
  if (props.mode === 'simple') return true
  return input.value.trim().toLowerCase() === props.confirmWord.toLowerCase()
})

watch(
  () => props.open,
  (open) => {
    if (!open) input.value = ''
  },
)

function onBackdrop(e: MouseEvent) {
  if ((e.target as HTMLElement).dataset.backdrop === 'true') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      data-backdrop="true"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/45"
      @click="onBackdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="w-full max-w-md rounded-2xl bg-white border border-matu-border shadow-xl p-5 sm:p-6"
        @click.stop
      >
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-matu-text">{{ title }}</h2>
            <p class="text-sm text-matu-muted mt-1">{{ description }}</p>
          </div>
        </div>

        <label v-if="mode === 'typed'" class="block text-sm text-matu-muted mb-2">
          Escribe <span class="font-mono font-medium text-matu-text">{{ confirmWord }}</span> para confirmar
        </label>
        <input
          v-if="mode === 'typed'"
          v-model="input"
          type="text"
          autocomplete="off"
          class="w-full rounded-xl border border-matu-border px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 mb-5"
          :placeholder="confirmWord"
          @keydown.enter="canConfirm && emit('confirm')"
        />

        <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end" :class="mode === 'simple' ? 'mt-2' : ''">
          <button
            type="button"
            class="rounded-xl border border-matu-border px-4 py-2.5 text-sm text-matu-muted hover:bg-matu-surface transition"
            :disabled="loading"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 px-4 py-2.5 text-sm text-white font-medium transition"
            :disabled="!canConfirm"
            @click="emit('confirm')"
          >
            {{ loading ? 'Procesando…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
