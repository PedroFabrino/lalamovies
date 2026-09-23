import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore } from '../stores/requests';
import { useFeatureFlags } from '../composables/useFeatureFlags';

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
    path: '/library',
    name: 'library',
    component: () => import('../views/LibraryView.vue'),
    meta: { requiresAuth: true, requiresFeature: 'jellyfin_library_view' },
  },
  {
    path: '/request',
    name: 'request',
    component: () => import('../views/RequestView.vue'),
    meta: { requiresAuth: true, requiresFeature: 'manual_torrents' },
  },
  {
    path: '/waitlist',
    name: 'waitlist',
    component: () => import('../views/WaitlistView.vue'),
    meta: { requiresAuth: true, requiresFeature: 'waitlist' },
  },
  {
    path: '/anime',
    name: 'anime',
    component: () => import('../views/AnimeView.vue'),
    meta: { requiresAuth: true, requiresFeature: 'seasonal_anime' },
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

  if (to.meta.requiresFeature) {
    const featureFlags = useFeatureFlags();
    await featureFlags.ensureFlagsLoaded();
    const featureKey = to.meta.requiresFeature as string;
    if (!featureFlags.isEnabled(featureKey)) {
      const requestsStore = useRequestsStore();
      requestsStore.showToast('This feature is temporarily unavailable.', 'info');
      return next({ name: 'dashboard' });
    }
  }

  next();
});
