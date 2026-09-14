import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StreamProgressModal from '../src/components/StreamProgressModal.vue';

describe('StreamProgressModal.vue', () => {
  it('renders pending state spinner and title', () => {
    const wrapper = mount(StreamProgressModal, {
      props: {
        show: true,
        streamId: 'test-stream-1',
        title: 'Dune: Part Two',
        initialStatus: 'pending',
      },
    });

    expect(wrapper.text()).toContain('Mounting Instant Stream');
    expect(wrapper.text()).toContain('Dune: Part Two');
    expect(wrapper.find('[data-testid="stream-ready-card"]').exists()).toBe(false);
  });

  it('renders ready state with Open in Jellyfin button', () => {
    const wrapper = mount(StreamProgressModal, {
      props: {
        show: true,
        streamId: 'test-stream-1',
        title: 'Dune: Part Two',
        initialStatus: 'ready',
        jellyfinUrl: '/web/index.html#!/item?id=item-dune-123',
      },
    });

    expect(wrapper.find('[data-testid="stream-ready-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ready to Watch!');
    expect(wrapper.text()).toContain('Ephemeral Stream (24h)');

    const openBtn = wrapper.find('[data-testid="button-open-jellyfin"]');
    expect(openBtn.exists()).toBe(true);
    expect(openBtn.attributes('href')).toBe('/web/index.html#!/item?id=item-dune-123');
  });

  it('transitions to ready state on stream_ready message event', async () => {
    const wrapper = mount(StreamProgressModal, {
      props: {
        show: true,
        streamId: 'test-stream-1',
        title: 'Dune: Part Two',
        initialStatus: 'pending',
      },
    });

    expect(wrapper.find('[data-testid="stream-ready-card"]').exists()).toBe(false);

    // Dispatch simulated message event
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'stream_ready',
          streamId: 'test-stream-1',
          jellyfinUrl: '/web/index.html#!/item?id=resolved-123',
        }),
      })
    );

    // Wait for Vue reactivity
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="stream-ready-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ready to Watch!');
    expect(wrapper.emitted('ready')).toHaveLength(1);
    expect(wrapper.emitted('ready')![0]).toEqual([
      {
        streamId: 'test-stream-1',
        jellyfinUrl: '/web/index.html#!/item?id=resolved-123',
      },
    ]);
  });

  it('transitions to error state and emits error event on stream_error message event', async () => {
    const wrapper = mount(StreamProgressModal, {
      props: {
        show: true,
        streamId: 'test-stream-1',
        title: 'Incredibles 2',
        initialStatus: 'pending',
      },
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'stream_error',
          streamId: 'test-stream-1',
          error: 'Real-Debrid error (451): infringing_file',
          isInfringing: true,
          infoHash: '2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
        }),
      })
    );

    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('error')).toHaveLength(1);
    expect(wrapper.emitted('error')![0][0]).toEqual({
      streamId: 'test-stream-1',
      error: 'Real-Debrid error (451): infringing_file',
      isInfringing: true,
      infoHash: '2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
    });
  });

  it('renders Add to Waitlist button in error state when canAddToWaitlist is true and emits add-to-waitlist on click', async () => {
    const wrapper = mount(StreamProgressModal, {
      props: {
        show: true,
        streamId: 'test-stream-1',
        title: 'Incredibles 2',
        initialStatus: 'error',
        errorMessage: 'This release is blocked by Real-Debrid due to a copyright takedown',
        canAddToWaitlist: true,
      },
    });

    const waitlistBtn = wrapper.find('[data-testid="button-error-add-waitlist"]');
    expect(waitlistBtn.exists()).toBe(true);
    expect(waitlistBtn.text()).toContain('Add to Waitlist');

    await waitlistBtn.trigger('click');
    expect(wrapper.emitted('add-to-waitlist')).toHaveLength(1);
  });
});
