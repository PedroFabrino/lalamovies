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
});
