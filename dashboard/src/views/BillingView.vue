<script setup lang="ts">
const tabs = ['Overview', 'Payment methods', 'Billing history', 'Preferences']
const activeTab = 'Overview'
</script>

<template>
  <div>
    <div class="px-6 py-4 border-b border-matu-border">
      <h1 class="text-xl font-semibold text-matu-text">Facturación</h1>
    </div>

    <div class="px-6 border-b border-matu-border flex gap-6 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        disabled
        class="shrink-0 py-3 text-sm border-b-2 -mb-px transition-colors"
        :class="
          tab === activeTab
            ? 'border-neutral-900 text-matu-text font-medium'
            : 'border-transparent text-matu-muted cursor-default opacity-60'
        "
      >
        {{ tab }}
      </button>
    </div>

    <div class="px-6 py-6 space-y-6 max-w-3xl">
      <section>
        <p class="text-xs font-medium text-matu-muted uppercase tracking-wide mb-3">Pay as you go</p>
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-sm text-matu-muted mb-1">Saldo de crédito</p>
            <p class="text-3xl font-semibold text-matu-text tabular-nums">$0.00 USD</p>
          </div>
          <button
            type="button"
            disabled
            class="rounded-md border border-matu-border bg-white px-4 py-2 text-sm font-medium text-matu-muted cursor-not-allowed"
          >
            Recargar crédito
          </button>
        </div>
        <p class="text-xs text-matu-muted mt-3">
          Próximamente: recarga mínima $5 USD. Referencia de mercado: ~1M tokens de entrada por cada $5
          (similar a proveedores económicos como DeepSeek/Groq en modelos pequeños).
        </p>
      </section>

      <div class="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        <strong>Próximamente:</strong> pagos, facturas y recarga automática. El chat web sigue gratis con tu cuenta.
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <div class="rounded-lg border border-matu-border p-4 hover:bg-[#fafafa] transition-colors">
          <p class="font-medium text-sm text-matu-text mb-1">API Keys</p>
          <p class="text-xs text-matu-muted mb-2">Crea claves para integraciones.</p>
          <RouterLink to="/dashboard/keys" class="text-xs font-medium text-matu-blue hover:underline">Ir →</RouterLink>
        </div>
        <div class="rounded-lg border border-matu-border p-4 hover:bg-[#fafafa] transition-colors">
          <p class="font-medium text-sm text-matu-text mb-1">Uso</p>
          <p class="text-xs text-matu-muted mb-2">Tokens y solicitudes por mes.</p>
          <RouterLink to="/dashboard/usage" class="text-xs font-medium text-matu-blue hover:underline">Ver →</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
