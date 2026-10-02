import { ref, watch } from 'vue';
import { api, ApiError } from '../lib/api';
import { useFeatureFlags } from './useFeatureFlags';
import type { WatchParty } from '../components/ActiveWatchPartiesShelf.vue';

export interface WatchPartyMediaItem {
  jellyfinItemId: string;
  title: string;
  mediaType: string;
  metadataId?: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  posterUrl?: string;
}

export interface GenericOption {
  label: string;
  jellyfinItemId: string;
  title: string;
  mediaType: string;
  posterUrl?: string;
}

export function useCreateWatchParty(
  props: { open: boolean; item: WatchPartyMediaItem | null },
  emit: {
    (e: 'close'): void;
    (e: 'created', party: WatchParty): void;
  },
) {
  const featureFlags = useFeatureFlags();

  const controlMode = ref<'everyone' | 'host_only'>('everyone');
  const submitting = ref(false);
  const errorMessage = ref<string | null>(null);

  const isManualEntry = ref(false);
  const selectedItemId = ref('');
  const manualTitle = ref('');
  const manualItemId = ref('');
  const manualMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
  const availableOptions = ref<GenericOption[]>([]);

  const needsReauth = ref(false);
  const reauthPassword = ref('');
  const reauthSubmitting = ref(false);

  async function loadGenericOptions() {
    if (props.item) return;
    try {
      const fetchStreams = featureFlags.isEnabled('streaming')
        ? api.get<{ streams?: Array<{ title: string; status: string; jellyfinItemId?: string }> }>('/streams').catch(() => ({ streams: [] }))
        : Promise.resolve({ streams: [] });

      const [streamsRes, requestsRes] = await Promise.all([
        fetchStreams,
        api.get<{ requests?: Array<{ id?: string; title: string; status: string; mediaType?: string; jellyfinItemId?: string; jellyfinPath?: string }> }>('/requests').catch(() => ({ requests: [] })),
      ]);

      const opts: GenericOption[] = [];
      if (featureFlags.isEnabled('streaming') && streamsRes?.streams) {
        for (const s of streamsRes.streams) {
          if (s.status === 'ready' && s.jellyfinItemId) {
            opts.push({
              label: `[Stream] ${s.title}`,
              jellyfinItemId: s.jellyfinItemId,
              title: s.title,
              mediaType: 'movie',
            });
          }
        }
      }
      if (requestsRes?.requests) {
        for (const r of requestsRes.requests) {
          if ((r.status === 'completed' || r.status === 'seeding') && r.title) {
            const fallbackId = r.jellyfinItemId || r.id;
            if (fallbackId) {
              opts.push({
                label: `[Library] ${r.title}`,
                jellyfinItemId: fallbackId,
                title: r.title,
                mediaType: r.mediaType || 'movie',
              });
            }
          }
        }
      }
      availableOptions.value = opts;
      if (opts.length > 0 && !selectedItemId.value) {
        selectedItemId.value = opts[0].jellyfinItemId;
      }
    } catch {
      availableOptions.value = [];
    }
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        errorMessage.value = null;
        needsReauth.value = false;
        reauthPassword.value = '';
        if (!props.item) {
          loadGenericOptions();
        }
      }
    },
    { immediate: true },
  );

  async function handleCreate() {
    submitting.value = true;
    errorMessage.value = null;

    let payload: WatchPartyMediaItem | null = null;
    if (props.item) {
      payload = { ...props.item };
    } else if (isManualEntry.value) {
      if (!manualTitle.value.trim() || !manualItemId.value.trim()) {
        errorMessage.value = 'Please provide both Title and Jellyfin Item ID.';
        submitting.value = false;
        return;
      }
      payload = {
        title: manualTitle.value.trim(),
        jellyfinItemId: manualItemId.value.trim(),
        mediaType: manualMediaType.value,
      };
    } else {
      const found = availableOptions.value.find((o) => o.jellyfinItemId === selectedItemId.value);
      if (!found) {
        errorMessage.value = 'Please select a media item or enter one manually.';
        submitting.value = false;
        return;
      }
      payload = {
        title: found.title,
        jellyfinItemId: found.jellyfinItemId,
        mediaType: found.mediaType,
        posterUrl: found.posterUrl,
      };
    }

    try {
      const res = await api.post<{ watchParty: WatchParty }>('/watch-parties', {
        jellyfinItemId: payload.jellyfinItemId,
        title: payload.title,
        mediaType: payload.mediaType,
        metadataId: payload.metadataId,
        year: payload.year,
        seasonNumber: payload.seasonNumber,
        episodeNumber: payload.episodeNumber,
        posterUrl: payload.posterUrl,
        controlMode: controlMode.value,
      });

      emit('created', res.watchParty);
      emit('close');
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.statusCode === 403 && ((err.data as { code?: string })?.code === 'JELLYFIN_TOKEN_REQUIRED' || err.message?.includes('Jellyfin user authentication is required')))
      ) {
        needsReauth.value = true;
        errorMessage.value = null;
        return;
      }
      errorMessage.value = err instanceof Error ? err.message : 'Failed to create watch party';
    } finally {
      submitting.value = false;
    }
  }

  async function handleReauth() {
    if (!reauthPassword.value) return;
    reauthSubmitting.value = true;
    errorMessage.value = null;

    try {
      await api.post('/auth/jellyfin-token', { password: reauthPassword.value });
      needsReauth.value = false;
      reauthPassword.value = '';
      await handleCreate();
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Failed to verify Jellyfin password';
    } finally {
      reauthSubmitting.value = false;
    }
  }

  return {
    controlMode,
    submitting,
    errorMessage,
    isManualEntry,
    selectedItemId,
    manualTitle,
    manualItemId,
    manualMediaType,
    availableOptions,
    needsReauth,
    reauthPassword,
    reauthSubmitting,
    handleCreate,
    handleReauth,
  };
}
