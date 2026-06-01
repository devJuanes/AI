<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'hero'
  showText?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2.5" :class="size === 'hero' ? 'justify-center' : ''">
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :class="{
        'w-7 h-7': size === 'sm',
        'w-8 h-8': !size || size === 'md',
        'w-10 h-10': size === 'lg',
        'w-14 h-14': size === 'hero',
      }"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#4d6bff" />
      <path
        d="M8 20c2-6 4-8 8-8s6 2 8 8"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <circle cx="12" cy="13" r="1.5" fill="white" />
      <circle cx="20" cy="13" r="1.5" fill="white" />
    </svg>
    <span
      v-if="showText !== false"
      class="font-semibold text-[#4d6bff] tracking-tight"
      :class="{
        'text-base': size === 'sm',
        'text-lg': !size || size === 'md',
        'text-xl': size === 'lg',
        'text-5xl sm:text-6xl font-bold': size === 'hero',
      }"
    >
      Matu AI
    </span>
  </div>
</template>
