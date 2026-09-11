import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/invite/:token',
    name: 'invite',
    component: () => import('../views/InviteView.vue'),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/request',
    name: 'request',
    component: () => import('../views/RequestView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/waitlist',
    name: 'waitlist',
    component: () => import('../views/WaitlistView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('../views/ForbiddenView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.initialCheckDone) {
    await authStore.fetchMe();
  }

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' });
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'forbidden' });
  }

  next();
});
