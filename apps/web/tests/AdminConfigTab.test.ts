import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminConfigTab from '../src/components/admin/AdminConfigTab.vue';

describe('AdminConfigTab', () => {
  const defaultProps = {
    configForm: {
      storage_quota_gb: 150,
      concurrent_limit: 2,
      disk_warn_threshold: 20,
      disk_reject_threshold: 15,
      media_consumption_threshold: 90,
      discord_webhook_url: 'https://discord.com/api/webhooks/123/xyz',
      tmdb_api_key: 'test_tmdb_key',
      anime_include_adult: false,
    },
    isSavingConfig: false,
    configSuccessMessage: null,
    configErrorMessage: null,
    jellyfinStatus: null,
    jellyfinLoading: false,
    isRescanningJellyfin: false,
    jellyfinMessage: null,
    jellyfinMessageType: 'success' as const,
    transcriptionForm: {
      transcription_window_start: '02:00',
      transcription_window_end: '07:00',
      transcription_timezone: 'UTC',
    },
    isSavingTranscription: false,
    transcriptionSuccessMessage: null,
    transcriptionErrorMessage: null,
    browserTimezone: 'UTC',
  };

  it('renders media_consumption_threshold input with configured value', () => {
    const wrapper = mount(AdminConfigTab, {
      props: defaultProps,
    });

    const thresholdInput = wrapper.find('#media_consumption_threshold');
    expect(thresholdInput.exists()).toBe(true);
    expect((thresholdInput.element as HTMLInputElement).value).toBe('90');
  });

  it('emits saveConfig when the system settings form is submitted', async () => {
    const wrapper = mount(AdminConfigTab, {
      props: defaultProps,
    });

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.emitted('saveConfig')).toBeTruthy();
    expect(wrapper.emitted('saveConfig')?.length).toBe(1);
  });
});
