import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TelegramAuthView from '../src/views/TelegramAuthView.vue';
import { useAuthStore } from '../src/stores/auth';
import { ApiError } from '../src/lib/api';

const mockPush = vi.fn();
let mockRouteQuery: Record<string, string> = {};
let mockRouteFullPath = '/telegram-auth';

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: (...args: any[]) => mockPush(...args),
  }),
  useRoute: () => ({
    query: mockRouteQuery,
    fullPath: mockRouteFullPath,
  }),
}));

const mockApiRequest = vi.fn();

vi.mock('../src/lib/api', () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
      this.name = 'ApiError';
    }
  },
}));

describe('TelegramAuthView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouteQuery = {};
    mockRouteFullPath = '/telegram-auth';
  });

  it('shows error state when token is missing from query params', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'alice', role: 'user' } as any;

    const wrapper = mount(TelegramAuthView);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha na Vinculação');
    expect(wrapper.text()).toContain('Token de vinculação ausente ou inválido na URL.');
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('redirects to login if user is not authenticated', async () => {
    mockRouteQuery = { token: 'valid-token-123' };
    mockRouteFullPath = '/telegram-auth?token=valid-token-123';

    const authStore = useAuthStore();
    authStore.user = null;

    mount(TelegramAuthView);
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/telegram-auth?token=valid-token-123' },
    });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('claims session successfully when authenticated and has token', async () => {
    mockRouteQuery = { token: 'valid-token-123' };
    mockRouteFullPath = '/telegram-auth?token=valid-token-123';

    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'alice', role: 'user' } as any;

    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      user: { id: 'u1', username: 'alice', role: 'user' },
      botUsername: 'test_download_bot',
    });

    const wrapper = mount(TelegramAuthView);
    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith('/auth/telegram-pairing/claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    expect(wrapper.text()).toContain('Conta Vinculada!');
    expect(wrapper.text()).toContain('alice');

    const returnBtn = wrapper.find('[data-testid="return-telegram-btn"]');
    expect(returnBtn.exists()).toBe(true);
    expect(returnBtn.attributes('href')).toBe('https://t.me/test_download_bot');
  });

  it('shows error state if claim request fails with ApiError', async () => {
    mockRouteQuery = { token: 'expired-token' };

    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'alice', role: 'user' } as any;

    mockApiRequest.mockRejectedValueOnce(
      new ApiError('Token de sessão expirado ou inválido.', 400)
    );

    const wrapper = mount(TelegramAuthView);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha na Vinculação');
    expect(wrapper.text()).toContain('Token de sessão expirado ou inválido.');
  });

  it('navigates to dashboard on clicking dashboard button in error state', async () => {
    mockRouteQuery = {};

    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'alice', role: 'user' } as any;

    const wrapper = mount(TelegramAuthView);
    await flushPromises();

    const dashboardBtn = wrapper.find('button');
    expect(dashboardBtn.exists()).toBe(true);
    await dashboardBtn.trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
