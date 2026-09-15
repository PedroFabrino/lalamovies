<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
            <span>Media Library</span>
            <span
              v-if="!loading"
              class="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
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
          class="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
          :disabled="loading"
          @click="fetchLibrary"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': loading }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <!-- Category Segmented Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-6">
        <div class="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            data-testid="tab-movies"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
            :class="activeCategory === 'movies' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            @click="switchCategory('movies')"
          >
            <span>Movies</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="activeCategory === 'movies' ? 'bg-indigo-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
            >
              {{ libraryData.movies.length }}
            </span>
          </button>

          <button
            type="button"
            data-testid="tab-shows"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
            :class="activeCategory === 'shows' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            @click="switchCategory('shows')"
          >
            <span>Series</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="activeCategory === 'shows' ? 'bg-indigo-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
            >
              {{ libraryData.shows.length }}
            </span>
          </button>

          <button
            type="button"
            data-testid="tab-anime"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
            :class="activeCategory === 'anime' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            @click="switchCategory('anime')"
          >
            <span>Anime</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="activeCategory === 'anime' ? 'bg-indigo-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
            >
              {{ libraryData.anime.length }}
            </span>
          </button>
        </div>

        <!-- Filter & Search Controls -->
        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <!-- Search Input -->
          <div class="relative flex-1 sm:w-64">
            <svg
              class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search library..."
              aria-label="Search library"
              class="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <!-- My Downloads Only Toggle -->
          <label class="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer bg-zinc-900/60 px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 transition select-none">
            <input
              v-model="myDownloadsOnly"
              type="checkbox"
              class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700 bg-zinc-800"
            />
            <span>My Downloads Only</span>
          </label>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <svg class="animate-spin w-8 h-8 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span class="text-sm text-zinc-400">Loading media library...</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="p-6 bg-red-950/40 border border-red-800/80 rounded-xl text-center max-w-lg mx-auto"
      >
        <p class="text-sm text-red-300 mb-4">{{ error }}</p>
        <button
          type="button"
          class="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
          @click="fetchLibrary"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredItems.length === 0"
        class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center max-w-md mx-auto my-8"
      >
        <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-white mb-1">
          No media found
        </h3>
        <p class="text-xs text-zinc-400">
          {{ searchQuery || myDownloadsOnly ? 'No titles match your current filter criteria.' : 'No completed downloads in this category yet.' }}
        </p>
      </div>

      <!-- Media Cards Grid -->
      <div
        v-else
        data-testid="media-grid"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden shadow-lg transition flex flex-col relative group"
          :class="{ 'ring-2 ring-indigo-500': isSelected(item.id) }"
        >
          <!-- Top Card Artwork & Checkbox Header -->
          <div class="relative aspect-[16/10] bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
            <!-- Background Image -->
            <img
              v-if="item.backdropUrl || item.posterUrl"
              :src="(item.backdropUrl || item.posterUrl) || ''"
              :alt="item.title"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
            />

            <!-- Gradient Overlay to ensure badges & controls remain legible -->
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/20 z-0 pointer-events-none" />

            <!-- Fallback Icon if no image -->
            <div
              v-if="!item.backdropUrl && !item.posterUrl"
              class="text-zinc-700 z-0 flex flex-col items-center gap-1"
            >
              <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- Selection Checkbox & Tooltip -->
            <div class="absolute top-3 left-3 z-10">
              <div
                class="relative inline-flex items-center"
                :title="!item.canManage ? 'Only the requester or an admin can manage this item' : undefined"
              >
                <input
                  type="checkbox"
                  data-testid="item-checkbox"
                  :checked="isSelected(item.id)"
                  :disabled="!item.canManage"
                  class="w-5 h-5 rounded border-zinc-700 bg-zinc-900/90 text-indigo-600 focus:ring-indigo-500 shadow-sm transition"
                  :class="!item.canManage ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'"
                  @change="toggleSelect(item.id)"
                />
              </div>
            </div>

            <!-- Requester Badge (Top-Right) -->
            <div class="absolute top-3 right-3 z-10">
              <span
                v-if="isOwnedByCurrentUser(item)"
                data-testid="badge-you"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 backdrop-blur"
              >
                You
              </span>
              <span
                v-else
                data-testid="badge-other"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 backdrop-blur"
              >
                @{{ item.requestedBy.username }}
              </span>
            </div>

            <!-- Media Size Badge (Bottom-Right) -->
            <div class="absolute bottom-2.5 right-3 z-10">
              <span class="text-[11px] font-mono text-zinc-300 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800 backdrop-blur">
                {{ formatBytes(item.sizeBytes) }}
              </span>
            </div>
          </div>

          <!-- Card Content -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="font-semibold text-white text-base leading-snug line-clamp-2" :title="item.title">
                  {{ item.title }}
                </h3>
              </div>

              <div class="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                <span v-if="item.year" class="font-medium text-zinc-300">{{ item.year }}</span>
                <span v-if="item.year">�</span>
                <span class="capitalize">{{ formatMediaType(item.mediaType) }}</span>
                <span v-if="item.coRequesters && item.coRequesters.length > 0" class="text-amber-400/90 text-[11px]" :title="formatCoRequestersTooltip(item)">
                  � +{{ item.coRequesters.length }} co-requester{{ item.coRequesters.length > 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <!-- Series / Anime Seasons Accordion -->
            <div v-if="item.seasons && item.seasons.length > 0" class="pt-2 border-t border-zinc-800/60 mt-2">
              <button
                type="button"
                data-testid="expand-seasons-btn"
                class="w-full flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 py-1 transition"
                @click="toggleExpand(item.id)"
              >
                <span class="font-medium">
                  {{ item.seasons.length }} Season{{ item.seasons.length > 1 ? 's' : '' }}
                  ({{ getTotalEpisodesCount(item) }} episodes)
                </span>
                <svg
                  class="w-3.5 h-3.5 transition-transform"
                  :class="{ 'rotate-180': isExpanded(item.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Expanded Seasons / Episodes List -->
              <div
                v-if="isExpanded(item.id)"
                data-testid="expanded-seasons-content"
                class="mt-2.5 space-y-2 text-xs text-zinc-300 max-h-48 overflow-y-auto pr-1"
              >
                <div
                  v-for="season in item.seasons"
                  :key="season.seasonNumber"
                  class="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/70"
                >
                  <div class="flex items-center justify-between font-semibold text-zinc-200 mb-1">
                    <span>Season {{ season.seasonNumber }}</span>
                    <span class="text-[11px] font-mono text-zinc-400">{{ formatBytes(season.sizeBytes) }}</span>
                  </div>
                  <div class="space-y-1 pl-1">
                    <div
                      v-for="ep in season.episodes"
                      :key="ep.id"
                      class="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      <span class="truncate pr-2">
                        {{ ep.episodeNumber ? `E${ep.episodeNumber}: ` : '' }}{{ ep.title }}
                      </span>
                      <span class="font-mono whitespace-nowrap">{{ formatBytes(ep.sizeBytes) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Bulk Action Bar -->
    <div
      v-if="selectedIds.length > 0"
      data-testid="bulk-action-bar"
      class="fixed bottom-6 inset-x-0 max-w-2xl mx-auto px-4 z-30 transition-all duration-200"
    >
      <div class="bg-zinc-900/95 border border-zinc-700 shadow-2xl rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 backdrop-blur">
        <div class="flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span class="text-sm font-semibold text-white">
            {{ selectedIds.length }} item{{ selectedIds.length > 1 ? 's' : '' }} selected
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            data-testid="bulk-move-btn"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
            @click="openMoveModal"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Move to...
          </button>

          <button
            type="button"
            data-testid="bulk-delete-btn"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow transition"
            @click="openDeleteModal"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          <button
            type="button"
            class="text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition"
            @click="clearSelection"
          >
            Deselect
          </button>
        </div>
      </div>
    </div>

    <!-- Move Confirmation Modal -->
    <div
      v-if="showMoveModal"
      data-testid="move-modal"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Move Media Library Folders
          </h2>
          <p class="text-xs text-zinc-400 mt-1">
            Relocate selected items to another Jellyfin library folder. Physical directories will be moved on disk and seeding hardlinks will remain intact.
          </p>
        </div>

        <!-- Selected Items Summary -->
        <div class="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 max-h-36 overflow-y-auto space-y-1">
          <div
            v-for="item in selectedItems"
            :key="item.id"
            class="text-xs text-zinc-300 truncate"
          >
            � {{ item.title }} <span v-if="item.year" class="text-zinc-500">({{ item.year }})</span>
          </div>
        </div>

        <!-- Target Destination Category Selector -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Target Destination Folder
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="px-3 py-2 text-xs font-medium rounded-lg border transition text-center"
              :class="targetMoveCategory === 'movie' ? 'bg-indigo-600 border-indigo-500 text-white shadow' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
              @click="targetMoveCategory = 'movie'"
            >
              Movies
            </button>
            <button
              type="button"
              class="px-3 py-2 text-xs font-medium rounded-lg border transition text-center"
              :class="targetMoveCategory === 'tv_show' ? 'bg-indigo-600 border-indigo-500 text-white shadow' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
              @click="targetMoveCategory = 'tv_show'"
            >
              TV Shows
            </button>
            <button
              type="button"
              class="px-3 py-2 text-xs font-medium rounded-lg border transition text-center"
              :class="targetMoveCategory === 'anime' ? 'bg-indigo-600 border-indigo-500 text-white shadow' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
              @click="targetMoveCategory = 'anime'"
            >
              Anime
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition"
            :disabled="isMoving"
            @click="showMoveModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-move-btn"
            class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition flex items-center gap-2"
            :disabled="isMoving"
            @click="executeMove"
          >
            <svg v-if="isMoving" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ isMoving ? 'Moving...' : 'Confirm Move' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      data-testid="delete-modal"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div>
          <h2 class="text-lg font-bold text-red-400 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Permanent Media Deletion
          </h2>
          <p class="text-xs text-zinc-400 mt-1">
            This will permanently delete files from disk, remove active torrents from qBittorrent, and trigger a Jellyfin library rescan. This action cannot be undone.
          </p>
        </div>

        <!-- Co-requester Warning Alert -->
        <div
          v-if="hasCoRequestersInSelection"
          data-testid="co-requester-warning"
          class="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 text-xs text-amber-300 space-y-1.5"
        >
          <div class="font-semibold flex items-center gap-1.5 text-amber-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Warning: Co-requesters attached!
          </div>
          <p class="text-amber-300/90 leading-relaxed">
            The following items were also requested by other users:
          </p>
          <ul class="list-disc list-inside space-y-0.5 text-amber-200">
            <li v-for="item in itemsWithCoRequesters" :key="item.id">
              <span class="font-medium">{{ item.title }}</span>: co-requested with
              {{ item.coRequesters.map((u) => `@${u.username}`).join(', ') }}
            </li>
          </ul>
        </div>

        <!-- Selected Items Summary -->
        <div class="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 max-h-36 overflow-y-auto space-y-1">
          <div
            v-for="item in selectedItems"
            :key="item.id"
            class="text-xs text-zinc-300 truncate"
          >
            � {{ item.title }} <span v-if="item.year" class="text-zinc-500">({{ item.year }})</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition"
            :disabled="isDeleting"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-delete-btn"
            class="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition flex items-center gap-2"
            :disabled="isDeleting"
            @click="executeDelete"
          >
            <svg v-if="isDeleting" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ isDeleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Navbar from '../components/Navbar.vue';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore } from '../stores/requests';
import { api } from '../lib/api';
import { formatBytes, formatMediaType } from '../lib/formatters';

export interface MediaRequester {
  id: string;
  username: string;
}

export interface EpisodeItem {
  id: string;
  episodeNumber: number | null;
  title: string;
  sizeBytes: number;
  jellyfinPath: string | null;
}

export interface SeasonItem {
  seasonNumber: number;
  episodeCount: number;
  sizeBytes: number;
  episodes: EpisodeItem[];
}

export interface LibraryMediaItem {
  id: string;
  requestIds: string[];
  title: string;
  year: number | null;
  mediaType: 'movie' | 'tv_show' | 'anime';
  sizeBytes: number;
  jellyfinPath: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  requestedBy: MediaRequester;
  coRequesters: MediaRequester[];
  canManage: boolean;
  seasons?: SeasonItem[];
}

const authStore = useAuthStore();
const requestsStore = useRequestsStore();

const loading = ref(false);
const error = ref<string | null>(null);
const activeCategory = ref<'movies' | 'shows' | 'anime'>('movies');
const searchQuery = ref('');
const myDownloadsOnly = ref(false);

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
const expandedCardIds = ref<string[]>([]);

const showMoveModal = ref(false);
const targetMoveCategory = ref<'movie' | 'tv_show' | 'anime'>('movie');
const isMoving = ref(false);

const showDeleteModal = ref(false);
const isDeleting = ref(false);

const totalCount = computed(() => {
  return (
    libraryData.value.movies.length +
    libraryData.value.shows.length +
    libraryData.value.anime.length
  );
});

const currentCategoryItems = computed(() => {
  return libraryData.value[activeCategory.value] || [];
});

const filteredItems = computed(() => {
  let list = currentCategoryItems.value;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((item) => item.title.toLowerCase().includes(q));
  }

  if (myDownloadsOnly.value) {
    list = list.filter((item) => item.requestedBy.id === authStore.user?.id);
  }

  return list;
});

const allLibraryItems = computed(() => {
  return [
    ...libraryData.value.movies,
    ...libraryData.value.shows,
    ...libraryData.value.anime,
  ];
});

const selectedItems = computed(() => {
  return allLibraryItems.value.filter((item) => selectedIds.value.includes(item.id));
});

const allSelectedRequestIds = computed(() => {
  return selectedItems.value.flatMap((item) => item.requestIds);
});

const itemsWithCoRequesters = computed(() => {
  return selectedItems.value.filter(
    (item) => item.coRequesters && item.coRequesters.length > 0
  );
});

const hasCoRequestersInSelection = computed(() => {
  return itemsWithCoRequesters.value.length > 0;
});

function isOwnedByCurrentUser(item: LibraryMediaItem): boolean {
  return item.requestedBy.id === authStore.user?.id;
}

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id);
}

function toggleSelect(id: string) {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((i) => i !== id);
  } else {
    selectedIds.value.push(id);
  }
}

function clearSelection() {
  selectedIds.value = [];
}

function switchCategory(cat: 'movies' | 'shows' | 'anime') {
  activeCategory.value = cat;
  clearSelection();
}

function isExpanded(id: string): boolean {
  return expandedCardIds.value.includes(id);
}

function toggleExpand(id: string) {
  if (isExpanded(id)) {
    expandedCardIds.value = expandedCardIds.value.filter((i) => i !== id);
  } else {
    expandedCardIds.value.push(id);
  }
}

function getTotalEpisodesCount(item: LibraryMediaItem): number {
  if (!item.seasons) return 0;
  return item.seasons.reduce((acc, s) => acc + s.episodeCount, 0);
}

function formatCoRequestersTooltip(item: LibraryMediaItem): string {
  if (!item.coRequesters || item.coRequesters.length === 0) return '';
  return `Co-requesters: ${item.coRequesters.map((u) => `@${u.username}`).join(', ')}`;
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
  } catch (err: any) {
    error.value = err.message || 'Failed to load library catalog';
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

async function executeMove() {
  if (allSelectedRequestIds.value.length === 0) return;
  isMoving.value = true;
  try {
    await api.post('/library/move', {
      requestIds: allSelectedRequestIds.value,
      targetMediaType: targetMoveCategory.value,
    });
    requestsStore.showToast('Media moved successfully!', 'success');
    showMoveModal.value = false;
    clearSelection();
    await fetchLibrary();
  } catch (err: any) {
    requestsStore.showToast(`Failed to move media: ${err.message || 'Unknown error'}`, 'error');
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
  } catch (err: any) {
    requestsStore.showToast(`Failed to delete media: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    isDeleting.value = false;
  }
}

onMounted(() => {
  fetchLibrary();
});
</script>
