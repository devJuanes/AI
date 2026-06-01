<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    compact?: boolean
  }>(),
  { label: 'Escribiendo', compact: false },
)
</script>

<template>
  <div
    class="flex items-center gap-2 text-matu-muted select-none"
    :class="compact ? 'py-0.5' : 'py-1'"
    role="status"
    aria-live="polite"
    :aria-label="`${label}…`"
  >
    <span class="text-sm">{{ label }}<span class="typing-ellipsis" aria-hidden="true">…</span></span>
    <span class="inline-flex items-center gap-1" aria-hidden="true">
      <span class="typing-dot" />
      <span class="typing-dot [animation-delay:0.15s]" />
      <span class="typing-dot [animation-delay:0.3s]" />
    </span>
  </div>
</template>

<style scoped>
.typing-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--color-matu-blue, #2563eb);
  animation: typing-bounce 1.2s ease-in-out infinite;
}

.typing-ellipsis {
  animation: typing-fade 1.2s ease-in-out infinite;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@keyframes typing-fade {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}
</style>
