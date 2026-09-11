import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, ApiError } from '../lib/api';

export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  createdAt?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(
    typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
      ? localStorage.getItem('token')
      : null
  );
  const loading = ref(false);
  const initialCheckDone = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function fetchMe(): Promise<User | null> {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get<{ user: User; token?: string }>('/auth/me');
      user.value = data.user;
      if (data.token) {
        token.value = data.token;
        localStorage.setItem('token', data.token);
      }
      return data.user;
    } catch {
      user.value = null;
      return null;
    } finally {
      loading.value = false;
      initialCheckDone.value = true;
    }
  }

  async function login(username: string, password: string): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post<{ user: User; token?: string }>('/auth/login', { username, password });
      user.value = data.user;
      if (data.token) {
        token.value = data.token;
        localStorage.setItem('token', data.token);
      }
      initialCheckDone.value = true;
      return data.user;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Failed to connect to server';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem('token');
      loading.value = false;
    }
  }

  async function acceptInvite(tokenParam: string, username: string, password: string): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.post<{ user: User; token?: string }>(`/invites/${tokenParam}/accept`, {
        username,
        password,
      });
      user.value = data.user;
      if (data.token) {
        token.value = data.token;
        localStorage.setItem('token', data.token);
      }
      initialCheckDone.value = true;
      return data.user;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Failed to accept invite';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    token,
    loading,
    initialCheckDone,
    error,
    isAuthenticated,
    isAdmin,
    fetchMe,
    login,
    logout,
    acceptInvite,
  };
});
