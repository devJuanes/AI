<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw, CheckCircle2, XCircle } from '@lucide/vue'
import { api } from '../lib/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref(false)
const message = ref('')
const reference = ref('')

function formatUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

onMounted(async () => {
  const refParam = (route.query.reference as string) ?? ''
  const paid = route.query.paid === 'true'
  const status = (route.query.status as string) ?? ''

  reference.value = refParam

  if (!refParam) {
    loading.value = false
    message.value = 'Falta la referencia del pago. Vuelve a Facturación e intenta de nuevo.'
    return
  }

  if (!paid && status && status !== 'PAID') {
    loading.value = false
    message.value = `El pago no se completó (estado: ${status}).`
    return
  }

  try {
    const res = await api.confirmPaymentReturn(refParam)
    success.value = res.paid
    message.value = success.value
      ? `Recarga acreditada. Nuevo saldo: ${formatUsd(res.wallet.balanceUsd)}`
      : 'No se pudo acreditar el saldo.'
  } catch (e) {
    success.value = false
    message.value = e instanceof Error ? e.message : 'Error al confirmar el pago'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="px-6 py-10 max-w-lg mx-auto">
    <div v-if="loading" class="flex items-center gap-2 text-sm text-matu-muted py-8">
      <RefreshCw class="w-5 h-5 animate-spin" />
      Confirmando tu pago…
    </div>

    <template v-else>
      <div class="flex items-start gap-3 mb-4">
        <CheckCircle2 v-if="success" class="w-8 h-8 text-emerald-600 shrink-0" />
        <XCircle v-else class="w-8 h-8 text-red-500 shrink-0" />
        <div>
          <h1 class="text-xl font-semibold text-matu-text">
            {{ success ? 'Pago recibido' : 'Pago no acreditado' }}
          </h1>
          <p class="text-sm text-matu-muted mt-1">{{ message }}</p>
          <p v-if="reference" class="text-xs font-mono text-matu-muted mt-2">Ref: {{ reference }}</p>
        </div>
      </div>

      <button
        type="button"
        class="rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-5 py-2.5"
        @click="router.push('/dashboard/billing')"
      >
        Volver a facturación
      </button>
    </template>
  </div>
</template>
