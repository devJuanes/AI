<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CreditCard, KeyRound, Sparkles, Check } from '@lucide/vue'
import AppLayout from '../layouts/AppLayout.vue'
import { api, type User } from '../lib/api'

const router = useRouter()
const user = ref<User | null>(null)
const loading = ref(true)

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: '$0',
    period: '/ mes',
    description: 'Chat web con tu cuenta Matu AI.',
    features: ['Chat ilimitado en la web', 'Modelo llama3.2:1b', 'Historial en la nube'],
    current: true,
    badge: 'Plan actual',
  },
  {
    id: 'pro',
    name: 'Pro API',
    price: 'Próximamente',
    period: '',
    description: 'Para integraciones con mayor volumen.',
    features: ['API Keys dedicadas', 'Límites ampliados', 'Soporte prioritario', 'Facturación mensual'],
    current: false,
    badge: 'En definición',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'A medida',
    period: '',
    description: 'Despliegue y SLA para empresas.',
    features: ['Modelos dedicados', 'SLA y soporte', 'Facturación corporativa', 'Onboarding MatuByte'],
    current: false,
    badge: 'Contacto',
  },
]

onMounted(async () => {
  try {
    const me = await api.me()
    user.value = me.user
  } catch {
    router.push('/login')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout :user-name="user?.name">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10 space-y-8">
      <div>
        <div class="flex items-center gap-2 text-matu-blue mb-2">
          <CreditCard class="w-5 h-5" />
          <span class="text-sm font-medium">Facturación API</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-matu-text mb-2">Planes y facturación</h1>
        <p class="text-matu-muted text-sm max-w-2xl">
          Vista previa de la facturación para consumo de la API Matu AI. Los precios y límites finales se
          publicarán pronto. Mientras tanto, el chat web sigue disponible con tu cuenta.
        </p>
      </div>

      <div
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2"
      >
        <Sparkles class="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Próximamente:</strong> pagos, facturas PDF y métricas de uso por API Key. Esta pantalla es solo
          referencia de diseño.
        </span>
      </div>

      <div v-if="loading" class="text-matu-muted text-sm">Cargando…</div>

      <div v-else class="grid gap-4 md:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="rounded-2xl border p-5 flex flex-col"
          :class="
            plan.current
              ? 'border-matu-blue bg-matu-blue-soft/30 shadow-sm'
              : 'border-matu-border bg-white'
          "
        >
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="font-semibold text-matu-text">{{ plan.name }}</h2>
            <span
              class="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full"
              :class="plan.current ? 'bg-matu-blue text-white' : 'bg-matu-surface text-matu-muted'"
            >
              {{ plan.badge }}
            </span>
          </div>
          <p class="text-2xl font-bold text-matu-text mb-1">
            {{ plan.price }}
            <span v-if="plan.period" class="text-sm font-normal text-matu-muted">{{ plan.period }}</span>
          </p>
          <p class="text-sm text-matu-muted mb-4">{{ plan.description }}</p>
          <ul class="space-y-2 text-sm text-matu-text flex-1 mb-5">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
              <Check class="w-4 h-4 text-matu-blue shrink-0 mt-0.5" />
              {{ feature }}
            </li>
          </ul>
          <button
            type="button"
            disabled
            class="w-full rounded-xl py-2.5 text-sm font-medium transition"
            :class="
              plan.current
                ? 'bg-matu-blue text-white opacity-90 cursor-default'
                : 'border border-matu-border text-matu-muted cursor-not-allowed'
            "
          >
            {{ plan.current ? 'Plan activo' : 'Disponible pronto' }}
          </button>
        </article>
      </div>

      <section class="rounded-xl border border-matu-border bg-matu-surface/50 p-5">
        <h3 class="font-semibold text-matu-text mb-2 flex items-center gap-2">
          <KeyRound class="w-4 h-4 text-matu-blue" />
          ¿Necesitas la API hoy?
        </h3>
        <p class="text-sm text-matu-muted mb-3">
          Crea API Keys en el panel y consulta la documentación OpenAI-compatible.
        </p>
        <RouterLink
          to="/dashboard"
          class="inline-flex text-sm font-medium text-matu-blue hover:text-matu-blue-hover"
        >
          Ir a API Keys →
        </RouterLink>
      </section>
    </div>
  </AppLayout>
</template>
