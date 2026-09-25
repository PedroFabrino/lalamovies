import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UserInviteModal from '../src/components/UserInviteModal.vue';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api', () => {
  class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    api: {
      get: (...args: any[]) => mockGet(...args),
      post: (...args: any[]) => mockPost(...args),
    },
    ApiError: MockApiError,
  };
});

describe('UserInviteModal (Spec #168)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active invite link and invited friends list', async () => {
    mockGet.mockResolvedValueOnce({
      invite: { id: 'inv-1', token: 'token-123', role: 'user', expiresAt: null },
      url: 'http://localhost:5173/invite/token-123',
      invitedUsers: ['friend_alice', 'friend_bob'],
    });

    const wrapper = mount(UserInviteModal);
    await flushPromises();

    expect(wrapper.text()).toContain('Your Personal Invite Link');
    expect(wrapper.find('input[type="text"]').element.getAttribute('value')).toBe('http://localhost:5173/invite/token-123');
    expect(wrapper.text()).toContain('@friend_alice');
    expect(wrapper.text()).toContain('@friend_bob');
    expect(wrapper.text()).toContain('Friends Joined (2)');
  });

  it('handles copy button click and writes to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    mockGet.mockResolvedValueOnce({
      invite: { id: 'inv-1', token: 'token-123', role: 'user', expiresAt: null },
      url: 'http://localhost:5173/invite/token-123',
      invitedUsers: [],
    });

    const wrapper = mount(UserInviteModal);
    await flushPromises();

    const copyBtn = wrapper.find('button.bg-indigo-600');
    expect(copyBtn.text()).toBe('Copy');
    await copyBtn.trigger('click');

    expect(writeTextMock).toHaveBeenCalledWith('http://localhost:5173/invite/token-123');
  });

  it('displays warning when invite generation is disabled for this user', async () => {
    const { ApiError } = await import('../src/lib/api');
    mockGet.mockRejectedValueOnce(new (ApiError as any)(403, 'Invite creation has been disabled for your account'));

    const wrapper = mount(UserInviteModal);
    await flushPromises();

    expect(wrapper.text()).toContain('Invite Generation Disabled');
    expect(wrapper.text()).toContain('Invite link generation has been disabled for your account');
  });

  it('allows regenerating / revoking link and creating new one', async () => {
    mockGet.mockResolvedValueOnce({
      invite: { id: 'inv-1', token: 'token-123', role: 'user', expiresAt: null },
      url: 'http://localhost:5173/invite/token-123',
      invitedUsers: [],
    });
    mockPost.mockResolvedValueOnce({
      invite: { id: 'inv-2', token: 'token-456', role: 'user' },
      url: 'http://localhost:5173/invite/token-456',
    });

    const wrapper = mount(UserInviteModal);
    await flushPromises();

    const revokeBtn = wrapper.find('button.text-red-400');
    expect(revokeBtn.exists()).toBe(true);
    await revokeBtn.trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/invites', {});
    expect(wrapper.find('input[type="text"]').element.getAttribute('value')).toBe('http://localhost:5173/invite/token-456');
  });

  it('emits close event when close button is clicked', async () => {
    mockGet.mockResolvedValueOnce({
      invite: null,
      url: null,
      invitedUsers: [],
    });

    const wrapper = mount(UserInviteModal);
    await flushPromises();

    const closeBtn = wrapper.find('button.text-zinc-500');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
