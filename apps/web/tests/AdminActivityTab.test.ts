import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminActivityTab from '../src/components/admin/AdminActivityTab.vue';
import type { PlaybackSession } from '../src/composables/useAdminActivity';

describe('AdminActivityTab.vue', () => {
  const mockSessions: PlaybackSession[] = [
    {
      id: 'sess-1',
      userName: 'Alexandre',
      client: 'Jellyfin for WebOS',
      deviceName: 'LG Smart TV',
      playMethod: 'DirectPlay',
      isHardwareAccelerated: false,
      bandwidthBps: 15000000,
      nowPlayingItem: {
        id: 'item-1',
        name: 'The Hunger Games',
        productionYear: 2023,
        type: 'Movie',
        runTimeTicks: 72000000000,
      },
      playState: {
        positionTicks: 36000000000,
        isPaused: false,
        playMethod: 'DirectPlay',
      },
    },
    {
      id: 'sess-2',
      userName: 'Maria',
      client: 'Chrome',
      deviceName: 'MacBook Pro',
      playMethod: 'Transcode',
      isHardwareAccelerated: true,
      bandwidthBps: 8000000,
      nowPlayingItem: {
        id: 'item-2',
        name: 'The Journey Begins',
        seriesName: 'Frieren',
        seasonIndex: 1,
        episodeIndex: 1,
        type: 'Episode',
        runTimeTicks: 14000000000,
      },
      playState: {
        positionTicks: 7000000000,
        isPaused: true,
        playMethod: 'Transcode',
      },
    },
  ];

  it('renders empty state when there are no active sessions', () => {
    const wrapper = mount(AdminActivityTab, {
      props: {
        sessions: [],
        isLoading: false,
      },
    });

    expect(wrapper.text()).toContain('No active playback sessions');
    expect(wrapper.text()).toContain('Server is idle');
  });

  it('renders session cards with proper badges, titles, and devices', () => {
    const wrapper = mount(AdminActivityTab, {
      props: {
        sessions: mockSessions,
        isLoading: false,
      },
    });

    expect(wrapper.text()).toContain('Alexandre');
    expect(wrapper.text()).toContain('LG Smart TV');
    expect(wrapper.text()).toContain('Direct Play');
    expect(wrapper.text()).toContain('The Hunger Games (2023)');

    expect(wrapper.text()).toContain('Maria');
    expect(wrapper.text()).toContain('MacBook Pro');
    expect(wrapper.text()).toContain('NVENC Transcode');
    expect(wrapper.text()).toContain('Frieren');
    expect(wrapper.text()).toContain('S01E01 - The Journey Begins');
  });

  it('emits refresh event when refresh button is clicked', async () => {
    const wrapper = mount(AdminActivityTab, {
      props: {
        sessions: mockSessions,
        isLoading: false,
      },
    });

    const refreshBtn = wrapper.find('button');
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh')).toBeTruthy();
  });

  it('opens confirmation modal and emits stop-session on confirm', async () => {
    const wrapper = mount(AdminActivityTab, {
      props: {
        sessions: mockSessions,
        isLoading: false,
      },
    });

    // Find first Stop Stream button
    const stopButtons = wrapper.findAll('button').filter((b) => b.text().includes('Stop Stream'));
    expect(stopButtons.length).toBeGreaterThan(0);
    await stopButtons[0].trigger('click');

    expect(wrapper.text()).toContain('Stop Playback Session');
    expect(wrapper.text()).toContain('Are you sure you want to stop the stream for');

    // Fill optional message
    const input = wrapper.find('input[type="text"]');
    await input.setValue('Server restart coming up');

    const confirmBtn = wrapper.findAll('button').find((b) => b.text().includes('Confirm Stop'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');

    expect(wrapper.emitted('stop-session')).toBeTruthy();
    expect(wrapper.emitted('stop-session')![0]).toEqual([
      {
        sessionId: 'sess-1',
        message: 'Server restart coming up',
      },
    ]);
  });
});
