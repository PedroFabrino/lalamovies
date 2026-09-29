import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WaitlistCard from '../src/components/waitlist/WaitlistCard.vue';
import type { WaitlistEntry } from '../src/stores/waitlist';

describe('WaitlistCard.vue (#188)', () => {
  const baseEntry: WaitlistEntry = {
    id: 'entry-1',
    userId: 'user-123',
    mediaType: 'anime',
    metadataId: '12345',
    metadataSource: 'tmdb',
    title: 'Trapped in a Dating Sim S02',
    year: 2026,
    seasonNumber: 2,
    targetEpisode: 2,
    status: 'checking',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
    posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
    requesterUsername: 'pedro',
    coRequesterCount: 2,
  };

  it('renders card title, poster, media type, and season/episode badges', () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    expect(wrapper.find('[data-testid="entry-title"]').text()).toBe('Trapped in a Dating Sim S02');
    expect(wrapper.find('img').attributes('src')).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    expect(wrapper.find('[data-testid="entry-media-type"]').text()).toBe('Anime');
    expect(wrapper.find('[data-testid="entry-season-badge"]').text()).toBe('S02E02');
    expect(wrapper.find('[data-testid="entry-requester"]').text()).toContain('pedro');
    expect(wrapper.find('[data-testid="entry-co-requester-count"]').text()).toContain('+2');
  });

  it('renders status badge and status text for checking', () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    expect(wrapper.find('[data-testid="entry-status-badge"]').text()).toContain('Checking Trackers');
    expect(wrapper.find('[data-testid="check-now-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="approve-waitlist-btn"]').exists()).toBe(false);
  });

  it('renders approve button for notified status and emits approve event', async () => {
    const notifiedEntry: WaitlistEntry = {
      ...baseEntry,
      status: 'notified',
      prowlarrReleaseTitle: 'Trapped.in.a.Dating.Sim.S02E02.1080p.CR.WEB-DL',
      notifyAt: new Date(Date.now() - 1000).toISOString(),
    };

    const wrapper = mount(WaitlistCard, {
      props: {
        entry: notifiedEntry,
      },
    });

    expect(wrapper.find('[data-testid="entry-status-badge"]').text()).toContain('Release Found');
    const approveBtn = wrapper.find('[data-testid="approve-waitlist-btn"]');
    expect(approveBtn.exists()).toBe(true);

    await approveBtn.trigger('click');
    expect(wrapper.emitted('approve')).toBeTruthy();
    expect(wrapper.emitted('approve')![0]).toEqual([notifiedEntry]);
  });

  it('emits check event when check now button clicked', async () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    const checkBtn = wrapper.find('[data-testid="check-now-btn"]');
    await checkBtn.trigger('click');
    expect(wrapper.emitted('check')).toBeTruthy();
    expect(wrapper.emitted('check')![0]).toEqual([baseEntry]);
  });

  it('emits cancel event when cancel button clicked', async () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    const cancelBtn = wrapper.find('[data-testid="cancel-waitlist-btn"]');
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('cancel')![0]).toEqual([baseEntry]);
  });

  it('disables check button and shows spin animation when isChecking is true', () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
        isChecking: true,
      },
    });

    const checkBtn = wrapper.find('[data-testid="check-now-btn"]');
    expect(checkBtn.attributes('disabled')).toBeDefined();
    expect(checkBtn.text()).toContain('Checking...');
  });
});
