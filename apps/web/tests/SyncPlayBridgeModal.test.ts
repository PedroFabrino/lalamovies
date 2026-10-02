import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SyncPlayBridgeModal from '../src/components/SyncPlayBridgeModal.vue';
import type { WatchParty } from '../src/components/ActiveWatchPartiesShelf.vue';

describe('SyncPlayBridgeModal.vue (#216)', () => {
  const mockParty: WatchParty = {
    id: 'party-123',
    hostUserId: 'host-1',
    hostUsername: 'alice',
    jellyfinGroupId: 'group-1',
    jellyfinGroupName: '🎉 Watch Party: Interstellar',
    mediaType: 'movie',
    jellyfinItemId: 'item-abc-123',
    title: 'Interstellar',
    controlMode: 'everyone',
    status: 'active',
    createdAt: new Date().toISOString(),
    jellyfinWebUrl: 'https://watch.lalamovies.stream/web/index.html#!/details?id=item-abc-123',
  };

  it('renders modal with target group and canonical launch link', () => {
    const wrapper = mount(SyncPlayBridgeModal, {
      props: {
        open: true,
        party: mockParty,
      },
    });

    expect(wrapper.find('[data-testid="syncplay-bridge-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('🎉 Watch Party: Interstellar');
    expect(wrapper.text()).toContain('Interstellar');

    const launchLink = wrapper.find('[data-testid="syncplay-launch-link"]');
    expect(launchLink.exists()).toBe(true);
    expect(launchLink.attributes('href')).toBe('https://watch.lalamovies.stream/web/index.html#!/details?id=item-abc-123');
  });

  it('renders TV AirPlay guidance section', () => {
    const wrapper = mount(SyncPlayBridgeModal, {
      props: {
        open: true,
        party: mockParty,
      },
    });

    const tvGuidance = wrapper.find('[data-testid="syncplay-tv-guidance"]');
    expect(tvGuidance.exists()).toBe(true);
    expect(tvGuidance.text()).toContain('Watching on Apple TV or Smart TV?');
    expect(tvGuidance.text()).toContain('Swiftfin');
  });

  it('emits close when Done button is clicked', async () => {
    const wrapper = mount(SyncPlayBridgeModal, {
      props: {
        open: true,
        party: mockParty,
      },
    });

    const doneBtn = wrapper.find('button[type="button"]:not(.text-zinc-400)');
    // Find the Done button
    const buttons = wrapper.findAll('button');
    const done = buttons.find((b) => b.text().includes('Done'));
    expect(done).toBeDefined();

    await done!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
