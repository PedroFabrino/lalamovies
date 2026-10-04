import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminSessionCard from '../src/components/admin/AdminSessionCard.vue';
import type { PlaybackSession } from '../src/composables/useAdminActivity';

describe('AdminSessionCard.vue', () => {
  const transcodeSession: PlaybackSession = {
    id: 's-transcode',
    userName: 'Maria',
    client: 'Firefox',
    deviceName: 'Desktop PC',
    playMethod: 'Transcode',
    isHardwareAccelerated: true,
    bandwidthBps: 8000000,
    nowPlayingItem: {
      id: 'item-1',
      name: 'Episode 5',
      seriesName: 'Attack on Titan',
      seasonIndex: 4,
      episodeIndex: 5,
      type: 'Episode',
      runTimeTicks: 14000000000,
    },
    playState: {
      positionTicks: 7000000000,
      isPaused: false,
      playMethod: 'Transcode',
    },
    transcodingInfo: {
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'ts',
      isVideoDirect: false,
      isAudioDirect: true,
      bitrate: 8000000,
      framerate: 59.94,
      audioChannels: 6,
      hardwareAccelerationType: 'nvenc',
      transcodeReasons: ['ContainerBitrateExceedsLimit', 'VideoCodecNotSupported'],
    },
  };

  const directPlaySession: PlaybackSession = {
    id: 's-direct',
    userName: 'Alexandre',
    client: 'WebOS',
    deviceName: 'LG OLED',
    playMethod: 'DirectPlay',
    isHardwareAccelerated: false,
    nowPlayingItem: {
      id: 'item-2',
      name: 'Interstellar',
      productionYear: 2014,
      type: 'Movie',
      runTimeTicks: 100000000000,
    },
    playState: {
      positionTicks: 25000000000,
      isPaused: false,
      playMethod: 'DirectPlay',
    },
  };

  it('renders session header, user, device, and playback badges', () => {
    const wrapper = mount(AdminSessionCard, {
      props: { session: transcodeSession },
    });

    expect(wrapper.text()).toContain('Maria');
    expect(wrapper.text()).toContain('Desktop PC • Firefox');
    expect(wrapper.text()).toContain('NVENC Transcode');
    expect(wrapper.text()).toContain('Attack on Titan');
    expect(wrapper.text()).toContain('S04E05 - Episode 5');
    expect(wrapper.text()).toContain('60 FPS');
  });

  it('toggles transcode diagnostics drawer to reveal reasons and codec details', async () => {
    const wrapper = mount(AdminSessionCard, {
      props: { session: transcodeSession },
    });

    // Initially drawer content is hidden
    expect(wrapper.text()).not.toContain('ContainerBitrateExceedsLimit');

    // Click diagnostics toggle
    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Transcode Diagnostics'));
    expect(toggleBtn).toBeDefined();
    await toggleBtn!.trigger('click');

    // Now drawer is expanded
    expect(wrapper.text()).toContain('Hide Transcode Diagnostics');
    expect(wrapper.text()).toContain('Transcode Reasons:');
    expect(wrapper.text()).toContain('ContainerBitrateExceedsLimit');
    expect(wrapper.text()).toContain('VideoCodecNotSupported');
    expect(wrapper.text()).toContain('h264');
    expect(wrapper.text()).toContain('aac');
    expect(wrapper.text()).toContain('(nvenc)');
    expect(wrapper.text()).toContain('6 ch');

    // Click again to collapse
    await toggleBtn!.trigger('click');
    expect(wrapper.text()).not.toContain('ContainerBitrateExceedsLimit');
  });

  it('shows Direct Play diagnostic message when no transcode active', async () => {
    const wrapper = mount(AdminSessionCard, {
      props: { session: directPlaySession },
    });

    const toggleBtn = wrapper.findAll('button').find((b) => b.text().includes('Transcode Diagnostics'));
    await toggleBtn!.trigger('click');

    expect(wrapper.text()).toContain('Direct Play active');
  });

  it('emits stop event when Stop Stream button is clicked', async () => {
    const wrapper = mount(AdminSessionCard, {
      props: { session: transcodeSession },
    });

    const stopBtn = wrapper.findAll('button').find((b) => b.text().includes('Stop Stream'));
    expect(stopBtn).toBeDefined();
    await stopBtn!.trigger('click');

    expect(wrapper.emitted('stop')).toBeTruthy();
    expect(wrapper.emitted('stop')![0]).toEqual([transcodeSession]);
  });
});
