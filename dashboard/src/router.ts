import { createRouter, createWebHistory } from 'vue-router'

export function getToken(): string | null {
  return localStorage.getItem('matu_ai_token')
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/HomeView.vue'),
    },
    {
      path: '/chat',
      component: () => import('./views/ChatView.vue'),
      meta: { auth: true },
    },
    {
      path: '/docs',
      component: () => import('./views/DocsView.vue'),
    },
    {
      path: '/login',
      component: () => import('./views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      component: () => import('./views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      component: () => import('./views/DashboardView.vue'),
      meta: { auth: true },
    },
    {
      path: '/billing',
      component: () => import('./views/BillingView.vue'),
      meta: { auth: true },
    },
  ],
})

router.beforeEach((to) => {
  const token = getToken()
  if (to.meta.auth && !token) return '/login'
  if (to.meta.guest && token) return '/chat'
})

export default router
