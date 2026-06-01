<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Copy, Check } from '@lucide/vue'
import AppLayout from '../layouts/AppLayout.vue'
import { docSections, API_BASE, SITE_URL } from '../content/docs'
import { api, getToken } from '../lib/api'

const activeSection = ref('intro')
const userName = ref<string | null>(null)
const copiedId = ref<string | null>(null)
let observer: IntersectionObserver | null = null

onMounted(async () => {
  if (getToken()) {
    try {
      const { user } = await api.me()
      userName.value = user.name
    } catch {
      /* docs públicos */
    }
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) activeSection.value = e.target.id
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
  )

  for (const s of docSections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})

onUnmounted(() => observer?.disconnect())

async function copyCode(code: string, id: string) {
  await navigator.clipboard.writeText(code)
  copiedId.value = id
  setTimeout(() => (copiedId.value = null), 2000)
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <AppLayout :user-name="userName">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <!-- Hero -->
      <section class="mb-12 lg:mb-16">
        <p class="text-matu-blue text-sm font-medium mb-2">OpenAI-compatible API</p>
        <h1 class="text-3xl sm:text-4xl font-bold text-matu-text tracking-tight mb-4">
          Documentación Matu AI
        </h1>
        <p class="text-matu-muted text-lg max-w-2xl leading-relaxed">
          Integra IA local en todos tus productos MatuByte con una API estándar, API Keys y modelos Ollama.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <div class="rounded-xl bg-matu-surface border border-matu-border px-4 py-3 font-mono text-sm">
            <span class="text-matu-muted">Base URL </span>
            <span class="text-emerald-600">{{ API_BASE }}</span>
          </div>
          <div class="rounded-xl bg-matu-surface border border-matu-border px-4 py-3 font-mono text-sm">
            <span class="text-matu-muted">Site </span>
            <span class="text-matu-blue">{{ SITE_URL }}</span>
          </div>
        </div>
      </section>

      <div class="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        <!-- Sidebar TOC -->
        <aside class="hidden lg:block">
          <nav class="sticky top-24 space-y-1 text-sm">
            <p class="text-xs font-semibold text-matu-muted uppercase tracking-wider mb-3 px-3">Contenido</p>
            <button
              v-for="s in docSections"
              :key="s.id"
              type="button"
              class="block w-full text-left px-3 py-2 rounded-lg transition"
              :class="
                activeSection === s.id
                  ? 'bg-matu-blue-soft text-matu-blue font-medium'
                  : 'text-matu-muted hover:text-matu-text hover:bg-matu-surface'
              "
              @click="scrollTo(s.id)"
            >
              {{ s.title }}
            </button>
          </nav>
        </aside>

        <!-- Content -->
        <div class="space-y-14 min-w-0">
          <section
            v-for="section in docSections"
            :id="section.id"
            :key="section.id"
            class="scroll-mt-24"
          >
            <h2 class="text-xl font-semibold text-matu-text mb-5 pb-2 border-b border-matu-border">
              {{ section.title }}
            </h2>

            <div class="space-y-4">
              <template v-for="(block, i) in section.content" :key="i">
                <p v-if="block.type === 'p'" class="text-matu-muted leading-relaxed">{{ block.text }}</p>

                <ul v-else-if="block.type === 'ul'" class="list-disc list-inside text-matu-muted space-y-1.5 pl-1">
                  <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
                </ul>

                <div
                  v-else-if="block.type === 'callout'"
                  class="rounded-xl px-4 py-3 text-sm border"
                  :class="
                    block.variant === 'warn'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-matu-blue-soft border-matu-blue-muted/40 text-matu-text'
                  "
                >
                  {{ block.text }}
                </div>

                <div v-else-if="block.type === 'table'" class="overflow-x-auto rounded-xl border border-matu-border">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="bg-matu-surface text-left">
                        <th
                          v-for="h in block.headers"
                          :key="h"
                          class="px-4 py-2.5 text-matu-muted font-medium border-b border-matu-border"
                        >
                          {{ h }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in block.rows" :key="ri" class="border-b border-matu-border/60 last:border-0">
                        <td v-for="(cell, ci) in row" :key="ci" class="px-4 py-2.5 text-matu-text font-mono text-xs">
                          {{ cell }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else-if="block.type === 'code'" class="relative group rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-800/50">
                    <span class="text-xs text-gray-400 uppercase">{{ block.lang }}</span>
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                      @click="copyCode(block.code, `${section.id}-${i}`)"
                    >
                      <Check v-if="copiedId === `${section.id}-${i}`" class="w-3.5 h-3.5 text-emerald-400" />
                      <Copy v-else class="w-3.5 h-3.5" />
                      {{ copiedId === `${section.id}-${i}` ? 'Copiado' : 'Copiar' }}
                    </button>
                  </div>
                  <pre class="p-4 text-xs sm:text-sm text-gray-200 overflow-x-auto leading-relaxed"><code>{{ block.code }}</code></pre>
                </div>
              </template>
            </div>
          </section>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
