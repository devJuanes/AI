<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { RouterView } from 'vue-router'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { api, type User } from '../lib/api'

const router = useRouter()
const user = ref<User | null>(null)
const loading = ref(true)

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
  <div v-if="loading" class="min-h-dvh flex items-center justify-center text-matu-muted text-sm">
    Cargando…
  </div>
  <DashboardLayout v-else :user-name="user?.name">
    <RouterView />
  </DashboardLayout>
</template>
