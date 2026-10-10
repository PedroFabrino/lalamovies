import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import UserSettingsModal from '../src/components/UserSettingsModal.vue';
import { useAuthStore } from '../src/stores/auth';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../src/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

describe('UserSettingsModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders unpaired state and generates pairing code', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
      telegramChatId: null,
      hasPersonalGeminiKey: false,
    };

    const wrapper = mount(UserSettingsModal);
    expect(wrapper.text()).toContain('Não vinculado');
    expect(wrapper.text()).toContain('Gerar Código de Vinculação');

    mockPost.mockResolvedValueOnce({ code: 'XYZ789', expiresInSeconds: 600 });
    const generateBtn = wrapper.find('button.bg-indigo-600');
    expect(generateBtn.exists()).toBe(true);
    await generateBtn.trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/auth/telegram-pairing/code');
    expect(wrapper.text()).toContain('XYZ789');
    expect(wrapper.text()).toContain('10:00');
    expect(wrapper.text()).toContain('/link XYZ789');
  });

  it('renders paired state and unlinks telegram', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
      telegramChatId: '123456789',
      hasPersonalGeminiKey: false,
    };

    const wrapper = mount(UserSettingsModal);
    expect(wrapper.text()).toContain('Vinculado');
    expect(wrapper.text()).toContain('123456789');

    mockDelete.mockResolvedValueOnce({ ok: true });
    await wrapper.find('button.text-rose-400').trigger('click');
    await flushPromises();

    expect(mockDelete).toHaveBeenCalledWith('/auth/telegram-pairing');
    expect(authStore.user?.telegramChatId).toBeNull();
  });

  it('saves and clears personal Gemini API key', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
      telegramChatId: null,
      hasPersonalGeminiKey: false,
    };

    const wrapper = mount(UserSettingsModal);
    expect(wrapper.text()).toContain('Não configurada');

    mockPut.mockResolvedValueOnce({ ok: true, hasPersonalGeminiKey: true });
    const input = wrapper.find('input[placeholder*="Gemini API Key"]');
    await input.setValue('AIzaSyCustomKey123');
    await wrapper.find('button.bg-zinc-800').trigger('click');
    await flushPromises();

    expect(mockPut).toHaveBeenCalledWith('/users/me/gemini-api-key', { apiKey: 'AIzaSyCustomKey123' });
    expect(authStore.user?.hasPersonalGeminiKey).toBe(true);
    expect(wrapper.text()).toContain('Chave Gemini salva com sucesso!');

    // Clear key
    mockPut.mockResolvedValueOnce({ ok: true, hasPersonalGeminiKey: false });
    await wrapper.find('button.text-rose-400').trigger('click');
    await flushPromises();

    expect(mockPut).toHaveBeenCalledWith('/users/me/gemini-api-key', { apiKey: null });
    expect(authStore.user?.hasPersonalGeminiKey).toBe(false);
  });
});
