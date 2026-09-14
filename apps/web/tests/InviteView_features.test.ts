import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import InviteView from '../src/views/InviteView.vue';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  ApiError: class ApiError extends Error {},
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { token: 'valid-token-123' },
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('InviteView with user_invites Flag (Subtask #92)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    const ff = useFeatureFlags();
    ff.reset();
  });

  it('renders disabled banner and disables submit button when user_invites is false', async () => {
    mockGet.mockResolvedValueOnce({
      valid: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const ff = useFeatureFlags();
    ff.setFlags({
      user_invites: false,
    });

    const wrapper = mount(InviteView, {
      global: {
        stubs: ['router-link'],
      },
    });
    await flushPromises();

    // Banner should be visible
    const banner = wrapper.find('[data-testid="invites-disabled-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('Registration Temporarily Paused');

    // Submit button should be disabled
    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('does not render banner and allows submission when user_invites is true', async () => {
    mockGet.mockResolvedValueOnce({
      valid: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const ff = useFeatureFlags();
    ff.setFlags({
      user_invites: true,
    });

    const wrapper = mount(InviteView, {
      global: {
        stubs: ['router-link'],
      },
    });
    await flushPromises();

    // Banner should NOT be visible
    const banner = wrapper.find('[data-testid="invites-disabled-banner"]');
    expect(banner.exists()).toBe(false);

    // Inputs filled
    await wrapper.find('input#username').setValue('newuser');
    await wrapper.find('input#password').setValue('secret123');
    await wrapper.find('input#confirmPassword').setValue('secret123');

    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });
});
