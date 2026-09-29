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

  it('renders lastCheckResult diagnostic text in checking status subtext when available (#189)', () => {
    const diagnosticEntry: WaitlistEntry = {
      ...baseEntry,
      lastCheckResult: 'Found 52 releases (20 matched S02E02), 0 met seed/quality criteria',
    };

    const wrapper = mount(WaitlistCard, {
      props: {
        entry: diagnosticEntry,
      },
    });

    const diag = wrapper.find('[data-testid="entry-diagnostic"]');
    expect(diag.exists()).toBe(true);
    expect(diag.text()).toBe('Found 52 releases (20 matched S02E02), 0 met seed/quality criteria');
  });

  it('emits manual-pick when clicking card container (#190)', async () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('manual-pick')).toBeTruthy();
    expect(wrapper.emitted('manual-pick')![0]).toEqual([baseEntry]);
  });

  it('emits manual-pick when clicking manual pick button in footer (#190)', async () => {
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: baseEntry,
      },
    });

    const manualBtn = wrapper.find('[data-testid="manual-pick-btn"]');
    expect(manualBtn.exists()).toBe(true);
    await manualBtn.trigger('click');

    expect(wrapper.emitted('manual-pick')).toBeTruthy();
    expect(wrapper.emitted('manual-pick')![0]).toEqual([baseEntry]);
  });

  it('does not emit manual-pick when clicking card container if status is completed or cancelled', async () => {
    const completedEntry: WaitlistEntry = {
      ...baseEntry,
      status: 'completed',
    };
    const wrapper = mount(WaitlistCard, {
      props: {
        entry: completedEntry,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('manual-pick')).toBeFalsy();
    expect(wrapper.find('[data-testid="manual-pick-btn"]').exists()).toBe(false);
  });

  it('renders lastCheckResult diagnostic text in pending_release status subtext when available', () => {
    const pendingEntry: WaitlistEntry = {
      ...baseEntry,
      status: 'pending_release',
      airDate: '2026-10-01',
      lastCheckResult: 'Target air date 2026-10-01 is in the future. Polling starts on release day.',
    };

    const wrapper = mount(WaitlistCard, {
      props: {
        entry: pendingEntry,
      },
    });

    const diag = wrapper.find('[data-testid="entry-diagnostic"]');
    expect(diag.exists()).toBe(true);
    expect(diag.text()).toBe('Target air date 2026-10-01 is in the future. Polling starts on release day.');
  });

  it('renders lastCheckResult diagnostic text in notified status subtext when available', () => {
    const notifiedEntry: WaitlistEntry = {
      ...baseEntry,
      status: 'notified',
      lastCheckResult: 'Found 12 qualifying releases; selecting top scored',
      prowlarrReleaseTitle: 'Trapped.in.a.Dating.Sim.S02E02.1080p.CR.WEB-DL',
      notifyAt: new Date(Date.now() - 1000).toISOString(),
    };

    const wrapper = mount(WaitlistCard, {
      props: {
        entry: notifiedEntry,
      },
    });

    const diag = wrapper.find('[data-testid="entry-diagnostic"]');
    expect(diag.exists()).toBe(true);
    expect(diag.text()).toBe('Found 12 qualifying releases; selecting top scored');
  });
});


