<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, RefreshCw } from '@lucide/vue'
import { api, type UsageResponse } from '../lib/api'

const loading = ref(true)
const error = ref('')
const usage = ref<UsageResponse | null>(null)
const selectedMonth = ref('')

const monthOptions = computed(() => {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    opts.push({ value, label })
  }
  return opts
})

const chartDays = computed(() => {
  if (!usage.value) return []
  const [y, m] = usage.value.period.month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const map = new Map(usage.value.daily.map((d) => [d.date, d]))
  const days: { date: string; tokens: number; requests: number; label: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const stats = map.get(date)
    days.push({
      date,
      tokens: stats?.tokens ?? 0,
      requests: stats?.requests ?? 0,
      label: `${m}-${d}`,
    })
  }
  return days
})

const maxDailyTokens = computed(() => {
  const max = Math.max(...chartDays.value.map((d) => d.tokens), 0)
  if (max === 0) return 1000
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / magnitude) * magnitude
})

const yTicks = computed(() => {
  const max = maxDailyTokens.value
  return [max, Math.round(max / 2), 0]
})

const modelScale = computed(() => {
  if (!usage.value?.byModel.length) return 500_000
  const max = Math.max(...usage.value.byModel.map((m) => m.tokens))
  if (max <= 1000) return 1000
  if (max <= 10_000) return 10_000
  if (max <= 100_000) return 100_000
  if (max <= 500_000) return 500_000
  return Math.ceil(max / 500_000) * 500_000
})

const requestScale = computed(() => {
  if (!usage.value?.byModel.length) return 1000
  const max = Math.max(...usage.value.byModel.map((m) => m.requests))
  if (max <= 100) return 100
  if (max <= 500) return 500
  return 1000
})

function formatNumber(n: number) {
  return n.toLocaleString('es-CO')
}

function formatUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

async function load(month?: string) {
  loading.value = true
  error.value = ''
  try {
    usage.value = await api.getUsage(month || selectedMonth.value || undefined)
    selectedMonth.value = usage.value.period.month
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar uso'
  } finally {
    loading.value = false
  }
}

function onMonthChange() {
  load(selectedMonth.value)
}

function exportCsv() {
  if (!usage.value) return
  const rows = [
    ['fecha', 'tokens', 'requests'],
    ...usage.value.daily.map((d) => [d.date, d.tokens, d.requests]),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `matu-usage-${usage.value.period.month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => load())
</script>

<template>
  <div>
    <div class="px-6 py-4 border-b border-matu-border">
      <h1 class="text-xl font-semibold text-matu-text">Uso</h1>
      <p class="text-xs text-matu-muted mt-1">
        Fechas en UTC. Los datos pueden tardar unos minutos en actualizarse.
      </p>
    </div>

    <div class="px-6 py-5 space-y-6">
      <p v-if="error" class="text-sm text-red-600 rounded-lg bg-red-50 px-4 py-3 border border-red-100">
        {{ error }}
      </p>

      <div v-if="loading" class="flex items-center gap-2 text-matu-muted text-sm py-8">
        <RefreshCw class="w-4 h-4 animate-spin" />
        Cargando uso…
      </div>

      <template v-else-if="usage">
      <!-- Resumen saldo + consumo -->
      <section class="mb-6 rounded-lg border border-matu-border p-5 sm:p-6 bg-[#fafafa]">
        <div class="grid sm:grid-cols-2 gap-6 sm:gap-10">
          <div>
            <p class="text-sm text-matu-muted mb-1">Saldo actual</p>
            <p class="text-3xl font-bold text-matu-text tabular-nums">
              {{ formatUsd(usage.wallet.balanceUsd) }}
            </p>
            <p v-if="usage.wallet.balanceUsd <= 0" class="text-xs text-amber-700 mt-2">
              Sin saldo — recarga en
              <RouterLink to="/dashboard/billing" class="underline font-medium">Facturación</RouterLink>
              para usar la API.
            </p>
            <p v-else class="text-xs text-matu-muted mt-2">
              Crédito prepago · se descuenta por consumo de tokens.
            </p>
          </div>
          <div class="sm:border-l sm:border-matu-border sm:pl-10">
            <p class="text-sm text-matu-muted mb-1">Consumo del mes</p>
            <p class="text-3xl font-bold text-matu-text tabular-nums">
              {{ formatUsd(usage.summary.costUsd) }}
            </p>
            <p class="text-xs text-matu-muted mt-2">
              {{ formatNumber(usage.summary.totalTokens) }} tokens ·
              {{ formatNumber(usage.summary.requests) }} solicitudes
            </p>
            <p class="text-xs text-matu-muted mt-1">
              Prompt {{ formatNumber(usage.summary.promptTokens) }} · Completion
              {{ formatNumber(usage.summary.completionTokens) }}
            </p>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          <RouterLink
            to="/dashboard/billing"
            class="inline-flex items-center rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2"
          >
            Recargar saldo
          </RouterLink>
          <RouterLink
            to="/dashboard/playground"
            class="inline-flex items-center rounded-md border border-matu-border bg-white text-sm font-medium px-4 py-2 text-matu-text hover:bg-white/80"
          >
            Probar API
          </RouterLink>
        </div>
      </section>

      <!-- Gráfico mensual -->
      <section class="mb-6 rounded-2xl bg-white border border-matu-border/80 p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 class="text-lg font-semibold text-matu-text">Uso mensual</h2>
          <div class="flex items-center gap-2">
            <select
              v-model="selectedMonth"
              class="rounded-lg border border-matu-border bg-white px-3 py-2 text-sm text-matu-text focus:outline-none focus:ring-2 focus:ring-matu-blue/20 focus:border-matu-blue"
              @change="onMonthChange"
            >
              <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-matu-text hover:bg-matu-text/90 text-white text-sm font-medium px-3 py-2 transition disabled:opacity-40"
              :disabled="!usage.daily.length"
              @click="exportCsv"
            >
              <Download class="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        <p class="text-sm text-matu-muted mb-6">
          Costo del mes
          <span class="font-semibold text-matu-text ml-1">{{ formatUsd(usage.summary.costUsd) }}</span>
          <span class="text-matu-muted ml-2">· {{ formatNumber(usage.summary.totalTokens) }} tokens</span>
        </p>

        <div v-if="usage.summary.totalTokens > 0" class="relative">
          <!-- Eje Y -->
          <div class="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[11px] text-matu-muted tabular-nums text-right pr-2">
            <span>{{ formatCompact(yTicks[0]) }}</span>
            <span>{{ formatCompact(yTicks[1]) }}</span>
            <span>0</span>
          </div>

          <!-- Chart -->
          <div class="ml-10 pl-2">
            <div class="relative h-44 border-b border-matu-border">
              <div
                v-for="(tick, i) in yTicks.slice(0, 2)"
                :key="i"
                class="absolute left-0 right-0 border-t border-dashed border-matu-border/60"
                :style="{ bottom: `${(tick / maxDailyTokens) * 100}%` }"
              />
              <div class="absolute inset-0 flex items-end gap-px sm:gap-0.5 pb-0">
                <div
                  v-for="day in chartDays"
                  :key="day.date"
                  class="flex-1 min-w-0 flex flex-col items-center justify-end h-full group"
                >
                  <div
                    class="w-full max-w-[10px] sm:max-w-[14px] rounded-t-sm transition-all"
                    :class="day.tokens > 0 ? 'bg-[#f5c542] hover:bg-[#e6b73a]' : 'bg-transparent'"
                    :style="{
                      height: day.tokens > 0 ? `${Math.max(4, (day.tokens / maxDailyTokens) * 100)}%` : '0',
                    }"
                    :title="`${day.date}\n${formatNumber(day.tokens)} tokens\n${formatUsd(day.costUsd ?? 0)}\n${day.requests} solicitudes`"
                  />
                </div>
              </div>
            </div>
            <div class="flex gap-px sm:gap-0.5 mt-1 overflow-hidden">
              <span
                v-for="(day, i) in chartDays"
                :key="day.date"
                class="flex-1 min-w-0 text-center text-[9px] sm:text-[10px] text-matu-muted truncate"
                :class="{ 'opacity-0 sm:opacity-100': i % 3 !== 0 && chartDays.length > 20 }"
              >
                {{ day.label }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-matu-border bg-white py-16 text-center"
        >
          <p class="text-sm text-matu-muted mb-3">Sin consumo este mes</p>
          <RouterLink
            to="/dashboard/playground"
            class="text-sm font-medium text-matu-blue hover:text-matu-blue-hover"
          >
            Probar con tu API Key →
          </RouterLink>
        </div>
      </section>

      <!-- Por modelo -->
      <section v-if="usage.byModel.length" class="mb-6 rounded-2xl bg-white border border-matu-border/80 p-6 shadow-sm space-y-8">
        <article
          v-for="model in usage.byModel"
          :key="model.model"
          class="pb-6 border-b border-matu-border last:border-0 last:pb-0"
        >
          <h3 class="font-mono text-base font-semibold text-matu-text mb-6">{{ model.model }}</h3>

          <div class="space-y-6">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-matu-muted">Solicitudes API</span>
                <span class="font-semibold text-matu-text tabular-nums">{{ formatNumber(model.requests) }}</span>
              </div>
              <div class="relative h-8 flex items-center">
                <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-matu-border" />
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-matu-blue/80 transition-all"
                  :style="{ width: `${Math.min(100, (model.requests / requestScale) * 100)}%` }"
                />
                <div class="absolute inset-x-0 flex justify-between text-[10px] text-matu-muted mt-5">
                  <span>0</span>
                  <span>{{ formatCompact(requestScale / 2) }}</span>
                  <span>{{ formatCompact(requestScale) }}</span>
                </div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-matu-muted">Tokens</span>
                <span class="font-semibold text-matu-text tabular-nums">{{ formatNumber(model.tokens) }}</span>
              </div>
              <div class="relative h-8 flex items-center">
                <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-matu-border" />
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-[#f5c542] transition-all"
                  :style="{ width: `${Math.min(100, (model.tokens / modelScale) * 100)}%` }"
                />
                <div class="absolute inset-x-0 flex justify-between text-[10px] text-matu-muted mt-5">
                  <span>0</span>
                  <span>{{ formatCompact(modelScale / 2) }}</span>
                  <span>{{ formatCompact(modelScale) }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- Por API Key -->
      <section v-if="usage.byKey.length" class="rounded-2xl bg-white border border-matu-border/80 shadow-sm overflow-hidden">
        <h2 class="text-base font-semibold text-matu-text px-6 py-4 border-b border-matu-border">Por API Key</h2>
        <div class="divide-y divide-matu-border">
          <div
            v-for="key in usage.byKey"
            :key="key.keyId"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-5 py-4"
          >
            <span class="font-medium text-matu-text">{{ key.name }}</span>
            <span class="text-sm text-matu-muted tabular-nums">
              {{ formatNumber(key.tokens) }} tokens · {{ formatNumber(key.requests) }} req
            </span>
          </div>
        </div>
      </section>
      </template>
    </div>
  </div>
</template>
