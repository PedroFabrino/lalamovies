<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
            <span>Media Library</span>
            <span
              v-if="!loading"
              class="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800/80 text-violet-300 border border-violet-500/30"
            >
              {{ totalCount }} items
            </span>
          </h1>
          <p class="text-sm text-zinc-400 mt-1">
            Browse downloaded movies, series, and anime. Move folders or clean up media across Jellyfin.
          </p>
        </div>

        <button
          type="button"
          class="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded-xl transition cursor-pointer"
          :disabled="loading"
          @click="fetchLibrary"
        >
          <RefreshCw
            class="w-3.5 h-3.5 text-violet-400"
            :class="{ 'animate-spin': loading }"
          />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Category Segmented Tabs & Filters -->
      <LibraryFilterHeader
        :active-category="activeCategory"
        :movies-count="libraryData.movies.length"
        :shows-count="libraryData.shows.length"
        :anime-count="libraryData.anime.length"
        :search-query="searchQuery"
        :my-downloads-only="myDownloadsOnly"
        :selected-genre="selectedGenre"
        :genre-chips="genreChips"
        @update:active-category="switchCategory"
        @update:search-query="searchQuery = $event"
        @update:my-downloads-only="myDownloadsOnly = $event"
        @update:selected-genre="selectedGenre = $event"
      />

      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-20"
      >
        <Loader2 class="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <span class="text-sm text-zinc-400">Loading media library...</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="p-6 bg-red-950/40 border border-red-800/80 rounded-2xl text-center max-w-lg mx-auto"
      >
        <p class="text-sm text-red-300 mb-4">
          {{ error }}
        </p>
        <button
          type="button"
          class="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition cursor-pointer"
          @click="fetchLibrary"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredItems.length === 0"
        class="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center max-w-md mx-auto my-8"
      >
        <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
          <Film class="w-6 h-6 text-zinc-400" />
        </div>
        <h3 class="text-base font-semibold text-white mb-1">
          No media found
        </h3>
        <p class="text-xs text-zinc-400">
          {{ searchQuery || myDownloadsOnly || selectedGenre !== 'All' ? 'No titles match your current filter criteria.' : 'No completed downloads in this category yet.' }}
        </p>
      </div>

      <!-- Media Cards Grid -->
      <div
        v-else
        data-testid="media-grid"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <LibraryMediaCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          :selected="isSelected(item.id)"
          :is-owned="isOwnedByCurrentUser(item)"
          @toggle-select="toggleSelect"
          @open-details="openDetailsModal"
          @open-subtitles="openSubtitlePicker"
          @open-episodes="openEpisodesModal"
        />
      </div>
    </main>

    <!-- Floating Bulk Action Bar -->
    <LibraryBulkActionBar
      :selected-count="selectedIds.length"
      @open-move="openMoveModal"
      @open-delete="openDeleteModal"
      @clear-selection="clearSelection"
    />

    <!-- Media Details Modal -->
    <LibraryMediaDetailsModal
      v-if="selectedDetailItem"
      :item="selectedDetailItem"
      @close="selectedDetailItem = null"
      @open-subtitles="openSubtitlePicker"
      @open-episodes="openEpisodesModal"
    />

    <!-- Move Confirmation Modal -->
    <LibraryMoveModal
      :show="showMoveModal"
      :selected-items="selectedItems"
      :default-category="targetMoveCategory"
      :is-moving="isMoving"
      @close="showMoveModal = false"
      @confirm="executeMove"
    />

    <!-- Delete Confirmation Modal -->
    <LibraryDeleteModal
      :show="showDeleteModal"
      :selected-items="selectedItems"
      :is-deleting="isDeleting"
      @close="showDeleteModal = false"
      @confirm="executeDelete"
    />

    <!-- Subtitle Picker Modal -->
    <SubtitlePickerModal
      :show="showSubtitleModal"
      :request-id="subtitleTarget?.id || ''"
      :title="subtitleTarget?.title"
      @close="showSubtitleModal = false"
    />

    <!-- Season Pack Episodes Modal -->
    <SeasonPackEpisodesModal
      :show="!!activeEpisodeRequestId"
      :request-id="activeEpisodeRequestId || ''"
      :title="activeEpisodeTitle"
      :is-admin="authStore.isAdmin"
      :can-manage="activeEpisodeCanManage"
      @close="activeEpisodeRequestId = null"
      @episode-pruned="handleLibraryEpisodePruned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RefreshCw, Loader2, Film } from 'lucide-vue-next';
import SubtitlePickerModal from '../components/SubtitlePickerModal.vue';
import SeasonPackEpisodesModal from '../components/requests/SeasonPackEpisodesModal.vue';
import LibraryFilterHeader from '../components/library/LibraryFilterHeader.vue';
import LibraryMediaCard from '../components/library/LibraryMediaCard.vue';
import LibraryMediaDetailsModal from '../components/library/LibraryMediaDetailsModal.vue';
import LibraryBulkActionBar from '../components/library/LibraryBulkActionBar.vue';
import LibraryMoveModal from '../components/library/LibraryMoveModal.vue';
import LibraryDeleteModal from '../components/library/LibraryDeleteModal.vue';
import type { LibraryMediaItem, MediaRequester, EpisodeItem, SeasonItem } from '../components/library/types';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore } from '../stores/requests';
import { api } from '../lib/api';

export type { LibraryMediaItem, MediaRequester, EpisodeItem, SeasonItem };

const authStore = useAuthStore();
const requestsStore = useRequestsStore();

const loading = ref(false);
const error = ref<string | null>(null);
const activeCategory = ref<'movies' | 'shows' | 'anime'>('movies');
const searchQuery = ref('');
const myDownloadsOnly = ref(false);
const selectedGenre = ref('All');

const genreChips = ['All', 'Action', 'Sci-Fi', 'Drama', 'Comedy', 'Animation', '4K HDR'];

const libraryData = ref<{
  movies: LibraryMediaItem[];
  shows: LibraryMediaItem[];
  anime: LibraryMediaItem[];
}>({
  movies: [],
  shows: [],
  anime: [],
});

const selectedIds = ref<string[]>([]);
const selectedDetailItem = ref<LibraryMediaItem | null>(null);

const showMoveModal = ref(false);
const targetMoveCategory = ref<'movie' | 'tv_show' | 'anime'>('movie');
const isMoving = ref(false);

const showDeleteModal = ref(false);
const isDeleting = ref(false);

const showSubtitleModal = ref(false);
const subtitleTarget = ref<{ id: string; title: string } | null>(null);

function openSubtitlePicker(id: string, title: string): void {
  subtitleTarget.value = { id, title };
  showSubtitleModal.value = true;
}

const activeEpisodeRequestId = ref<string | null>(null);
const activeEpisodeTitle = ref('');
const activeEpisodeCanManage = ref(false);

function openEpisodesModal(item: LibraryMediaItem, reqId?: string): void {
  activeEpisodeRequestId.value = reqId || item.requestIds[0] || item.id;
  activeEpisodeTitle.value = item.title;
  activeEpisodeCanManage.value = item.canManage;
}

function handleLibraryEpisodePruned(payload: { episodeId: string; wholeRequestDeleted: boolean }): void {
  if (payload.wholeRequestDeleted) {
    activeEpisodeRequestId.value = null;
    fetchLibrary();
  }
}

function openDetailsModal(item: LibraryMediaItem): void {
  selectedDetailItem.value = item;
}

const totalCount = computed(() => (
  libraryData.value.movies.length + libraryData.value.shows.length + libraryData.value.anime.length
));

const currentCategoryItems = computed(() => libraryData.value[activeCategory.value] || []);

const filteredItems = computed(() => {
  let list = currentCategoryItems.value;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((item) => item.title.toLowerCase().includes(q));
  }
  if (myDownloadsOnly.value) {
    list = list.filter((item) => item.requestedBy.id === authStore.user?.id);
  }
  if (selectedGenre.value !== 'All') {
    const g = selectedGenre.value.toLowerCase();
    list = list.filter((item) => {
      if (item.genres && item.genres.some((x) => x.toLowerCase().includes(g))) return true;
      if (g === '4k hdr' && item.resolution && item.resolution.includes('4k')) return true;
      return false;
    });
  }
  return list;
});

const allLibraryItems = computed(() => [
  ...libraryData.value.movies,
  ...libraryData.value.shows,
  ...libraryData.value.anime,
]);

const selectedItems = computed(() => allLibraryItems.value.filter((item) => selectedIds.value.includes(item.id)));
const allSelectedRequestIds = computed(() => selectedItems.value.flatMap((item) => item.requestIds));

function isOwnedByCurrentUser(item: LibraryMediaItem): boolean {
  return item.requestedBy.id === authStore.user?.id;
}

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id);
}

function toggleSelect(id: string) {
  selectedIds.value = isSelected(id) ? selectedIds.value.filter((i) => i !== id) : [...selectedIds.value, id];
}

function clearSelection() {
  selectedIds.value = [];
}

function switchCategory(cat: 'movies' | 'shows' | 'anime') {
  activeCategory.value = cat;
  clearSelection();
}

async function fetchLibrary() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get<{
      movies: LibraryMediaItem[];
      shows: LibraryMediaItem[];
      anime: LibraryMediaItem[];
    }>('/library');
    libraryData.value = {
      movies: res.movies || [],
      shows: res.shows || [],
      anime: res.anime || [],
    };
  } catch (err: unknown) {
    error.value = (err as Error).message || 'Failed to load library catalog';
  } finally {
    loading.value = false;
  }
}

function openMoveModal() {
  if (activeCategory.value === 'movies') {
    targetMoveCategory.value = 'tv_show';
  } else {
    targetMoveCategory.value = 'movie';
  }
  showMoveModal.value = true;
}

async function executeMove(targetCat: 'movie' | 'tv_show' | 'anime') {
  if (allSelectedRequestIds.value.length === 0) return;
  isMoving.value = true;
  try {
    await api.post('/library/move', {
      requestIds: allSelectedRequestIds.value,
      targetMediaType: targetCat,
    });
    requestsStore.showToast('Media moved successfully!', 'success');
    showMoveModal.value = false;
    clearSelection();
    await fetchLibrary();
  } catch (err: unknown) {
    requestsStore.showToast(`Failed to move media: ${(err as Error).message || 'Unknown error'}`, 'error');
  } finally {
    isMoving.value = false;
  }
}

function openDeleteModal() {
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (allSelectedRequestIds.value.length === 0) return;
  isDeleting.value = true;
  try {
    await api.post('/library/delete', {
      requestIds: allSelectedRequestIds.value,
    });
    requestsStore.showToast('Media deleted successfully!', 'success');
    showDeleteModal.value = false;
    clearSelection();
    await fetchLibrary();
  } catch (err: unknown) {
    requestsStore.showToast(`Failed to delete media: ${(err as Error).message || 'Unknown error'}`, 'error');
  } finally {
    isDeleting.value = false;
  }
}

onMounted(() => {
  fetchLibrary();
});
</script>
