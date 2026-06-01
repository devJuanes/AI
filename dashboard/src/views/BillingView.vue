<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RefreshCw, CreditCard, History } from '@lucide/vue'
import { api, type BillingResponse } from '../lib/api'

type TabId = 'recharge' | 'history'
type Currency = 'USD' | 'COP'

const tabs: { id: TabId; label: string; icon: typeof CreditCard }[] = [
  { id: 'recharge', label: 'Recargar', icon: CreditCard },
  { id: 'history', label: 'Historial de pagos', icon: History },
]

const activeTab = ref<TabId>('recharge')
const loading = ref(true)
const error = ref('')
const billing = ref<BillingResponse | null>(null)
const currency = ref<Currency>('USD')
const selectedPreset = ref<number | null>(5)
const customAmount = ref('')
const paying = ref(false)
const pendingTx = ref<{ id: string; paymentRef: string; amountUsd: number; tokensIncluded: number } | null>(null)
const payMessage = ref('')

const presets = computed(() => billing.value?.pricing.presetAmountsUsd ?? [5, 10, 50, 100])

const amountUsd = computed(() => {
  if (customAmount.value.trim()) {
    const n = Number(customAmount.value.replace(',', '.'))
    if (Number.isNaN(n) || n <= 0) return 0
    if (currency.value === 'COP') {
      const rate = billing.value?.pricing.usdCopRate ?? 4200
      return Math.round((n / rate) * 10000) / 10000
    }
    return n
  }
  return selectedPreset.value ?? 0
})

const amountLocal = computed(() => {
  const usd = amountUsd.value
  const rate = billing.value?.pricing.usdCopRate ?? 4200
  if (currency.value === 'COP') return Math.round(usd * rate)
  return usd
})

const tokensPreview = computed(() => {
  const tpu = billing.value?.pricing.tokensPerUsd ?? 200_000
  return Math.floor(amountUsd.value * tpu)
})

const minUsd = computed(() => billing.value?.pricing.minRechargeUsd ?? 5)
const canPay = computed(() => amountUsd.value >= minUsd.value && !paying.value)

const rechargeHistory = computed(() =>
  (billing.value?.transactions ?? []).filter((t) => t.type === 'recharge'),
)

function formatUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatCop(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formatTokens(n: number) {
  return n.toLocaleString('es-CO')
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Completado'
  if (status === 'pending') return 'Pendiente'
  if (status === 'failed') return 'Fallido'
  return status
}

function selectPreset(usd: number) {
  selectedPreset.value = usd
  customAmount.value = ''
}

watch(currency, () => {
  customAmount.value = ''
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    billing.value = await api.getBilling()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar facturación'
  } finally {
    loading.value = false
  }
}

async function startRecharge() {
  if (!canPay.value) return
  paying.value = true
  error.value = ''
  payMessage.value = ''
  pendingTx.value = null
  try {
    const res = await api.createRecharge({
      amountUsd: amountUsd.value,
      currency: currency.value,
      amountLocal: currency.value === 'COP' ? amountLocal.value : undefined,
    })

    pendingTx.value = res.transaction
    payMessage.value = res.message

    if (res.mockCheckout && res.transaction.id) {
      await api.completeRechargeDemo(res.transaction.id)
      payMessage.value = 'Recarga acreditada (demo). Cuando integremos la pasarela, aquí irás a pagar.'
      pendingTx.value = null
      await load()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al iniciar recarga'
  } finally {
    paying.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="px-6 py-4 border-b border-matu-border flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-matu-text">Facturación</h1>
        <p class="text-xs text-matu-muted mt-0.5">Pay as you go · modelo {{ billing?.pricing.model ?? 'llama3.2:1b' }}</p>
      </div>
      <div v-if="billing" class="text-right">
        <p class="text-xs text-matu-muted">Saldo actual</p>
        <p class="text-lg font-semibold tabular-nums">{{ formatUsd(billing.wallet.balanceUsd) }}</p>
      </div>
    </div>

    <div class="px-6 border-b border-matu-border flex gap-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex items-center gap-1.5 shrink-0 py-3 text-sm border-b-2 -mb-px transition-colors"
        :class="
          activeTab === tab.id
            ? 'border-neutral-900 text-matu-text font-medium'
            : 'border-transparent text-matu-muted hover:text-matu-text'
        "
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <div class="px-6 py-6 max-w-2xl">
      <p v-if="error" class="mb-4 text-sm text-red-600 rounded-lg bg-red-50 px-4 py-3 border border-red-100">{{ error }}</p>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-matu-muted py-8">
        <RefreshCw class="w-4 h-4 animate-spin" />
        Cargando…
      </div>

      <template v-else-if="billing">
        <!-- Recargar -->
        <div v-show="activeTab === 'recharge'" class="space-y-6">
          <section class="rounded-lg border border-matu-border p-5 bg-[#fafafa]">
            <p class="text-xs font-medium text-matu-muted uppercase tracking-wide mb-2">Tarifa API</p>
            <p class="text-sm text-matu-text">
              <strong>{{ formatTokens(billing.pricing.tokensPerUsd) }}</strong> tokens por cada
              <strong>$1 USD</strong>
              (~{{ formatTokens(billing.pricing.examples.per5Usd) }} tokens por $5).
            </p>
            <p class="text-xs text-matu-muted mt-2">
              Precio orientado a modelo básico {{ billing.pricing.model }}. Recarga mínima
              {{ formatUsd(billing.pricing.minRechargeUsd) }}.
            </p>
          </section>

          <div>
            <p class="text-sm font-medium text-matu-text mb-2">Moneda</p>
            <div class="inline-flex rounded-md border border-matu-border p-0.5 bg-white">
              <button
                type="button"
                class="px-3 py-1.5 text-sm rounded"
                :class="currency === 'USD' ? 'bg-neutral-900 text-white' : 'text-matu-muted'"
                @click="currency = 'USD'"
              >
                USD
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm rounded"
                :class="currency === 'COP' ? 'bg-neutral-900 text-white' : 'text-matu-muted'"
                @click="currency = 'COP'"
              >
                COP
              </button>
            </div>
            <p v-if="currency === 'COP'" class="text-xs text-matu-muted mt-1">
              Tasa referencial: 1 USD ≈ {{ billing.pricing.usdCopRate.toLocaleString('es-CO') }} COP
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-matu-text mb-2">Monto rápido</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="p in presets"
                :key="p"
                type="button"
                class="rounded-md border px-4 py-2 text-sm font-medium transition"
                :class="
                  selectedPreset === p && !customAmount
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-matu-border bg-white hover:bg-[#fafafa]'
                "
                @click="selectPreset(p)"
              >
                {{ currency === 'USD' ? formatUsd(p) : formatCop(p * billing.pricing.usdCopRate) }}
              </button>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-matu-text block mb-2">Otro monto</label>
            <input
              v-model="customAmount"
              type="number"
              min="0"
              step="any"
              :placeholder="currency === 'USD' ? 'Ej. 25' : 'Ej. 21000'"
              class="w-full max-w-xs rounded-md border border-matu-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
              @input="selectedPreset = null"
            />
          </div>

          <div v-if="amountUsd > 0" class="rounded-lg border border-matu-border p-4 bg-white">
            <p class="text-sm text-matu-muted">Recibirás aproximadamente</p>
            <p class="text-2xl font-semibold text-matu-text tabular-nums">{{ formatTokens(tokensPreview) }} tokens</p>
            <p class="text-xs text-matu-muted mt-1">
              ≈ {{ formatUsd(amountUsd) }}
              <span v-if="currency === 'COP'"> ({{ formatCop(amountLocal) }})</span>
            </p>
          </div>

          <button
            type="button"
            :disabled="!canPay"
            class="rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5"
            @click="startRecharge"
          >
            {{ paying ? 'Procesando…' : billing.mockCheckout ? 'Recargar (demo)' : 'Ir a pagar' }}
          </button>

          <p v-if="payMessage" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
            {{ payMessage }}
          </p>

          <p v-if="pendingTx && !billing.mockCheckout" class="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            Referencia {{ pendingTx.paymentRef }} — pendiente de pasarela de pago.
          </p>

          <p class="text-xs text-matu-muted">
            El chat web sigue gratis. Sin saldo, la API Key deja de responder hasta que recargues.
          </p>
        </div>

        <!-- Historial -->
        <div v-show="activeTab === 'history'">
          <div v-if="rechargeHistory.length" class="border border-matu-border rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-[#fafafa] border-b border-matu-border text-left text-xs text-matu-muted">
                <tr>
                  <th class="px-4 py-2.5 font-medium">Fecha</th>
                  <th class="px-4 py-2.5 font-medium">Referencia</th>
                  <th class="px-4 py-2.5 font-medium">Monto</th>
                  <th class="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-matu-border">
                <tr v-for="tx in rechargeHistory" :key="tx.id" class="hover:bg-[#fafafa]/80">
                  <td class="px-4 py-3 text-matu-muted">
                    {{ new Date(tx.createdAt).toLocaleString('es') }}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs">{{ tx.paymentRef ?? '—' }}</td>
                  <td class="px-4 py-3 tabular-nums">
                    {{ formatUsd(tx.amountUsd) }}
                    <span v-if="tx.currency === 'COP' && tx.amountLocal" class="text-xs text-matu-muted block">
                      {{ formatCop(tx.amountLocal) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="text-xs font-medium px-2 py-0.5 rounded-full"
                      :class="
                        tx.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-red-50 text-red-600'
                      "
                    >
                      {{ statusLabel(tx.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-matu-muted py-12 text-center border border-dashed border-matu-border rounded-lg">
            Aún no hay recargas registradas.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
