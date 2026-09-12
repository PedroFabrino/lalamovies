<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <!-- Navbar -->
    <Navbar />

    <!-- Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Toast Alert -->
      <div
        v-if="waitlistStore.toast"
        data-testid="waitlist-toast"
        class="mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg"
        :class="waitlistStore.toast.type === 'error'
          ? 'bg-red-950/60 border-red-800 text-red-200'
          : waitlistStore.toast.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            : 'bg-indigo-950/60 border-indigo-800 text-indigo-200'"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm font-medium">{{ waitlistStore.toast.text }}</span>
        </div>
        <button
          type="button"
          class="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
          @click="waitlistStore.clearToast"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Waitlist</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
              {{ waitlistStore.entries.length }}
            </span>
          </h1>
          <p class="text-sm text-zinc-400 mt-1">
            Monitor unreleased or unavailable media. High-quality releases are automatically snatched when available.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Admin View Toggle (Ticket 10) -->
          <div
            v-if="authStore.isAdmin"
            class="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs"
            data-testid="admin-view-toggle"
          >
            <button
              type="button"
              data-testid="toggle-view-mine"
              class="px-3 py-1.5 rounded-md font-medium transition cursor-pointer"
              :class="activeView === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
              @click="setView('mine')"
            >
              My Entries
            </button>
            <button
              type="button"
              data-testid="toggle-view-all"
              class="px-3 py-1.5 rounded-md font-medium transition cursor-pointer"
              :class="activeView === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
              @click="setView('all')"
            >
              All Users
            </button>
          </div>

          <button
            type="button"
            class="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            :disabled="waitlistStore.loading"
            title="Refresh List"
            @click="loadEntries"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': waitlistStore.loading }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            type="button"
            data-testid="open-add-waitlist-modal"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
            @click="openSearchModal"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add to Waitlist</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="waitlistStore.loading && waitlistStore.entries.length === 0"
        class="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3"
      >
        <svg
          class="w-8 h-8 animate-spin text-indigo-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <p class="text-sm">Loading waitlist entries...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="waitlistStore.entries.length === 0"
        data-testid="waitlist-empty-state"
        class="border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-950/40 max-w-xl mx-auto my-8"
      >
        <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4 text-xl">
          ⏳
        </div>
        <h3 class="text-base font-semibold text-white">Your waitlist is empty</h3>
        <p class="text-sm text-zinc-400 mt-1 mb-6">
          Add unreleased movies, future TV seasons, or titles that don't have good releases yet. We'll monitor indexers and snatch them automatically.
        </p>
        <button
          type="button"
          data-testid="empty-add-waitlist-btn"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition inline-flex items-center gap-2 cursor-pointer shadow"
          @click="openSearchModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add your first title</span>
        </button>
      </div>

      <!-- Entries Grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="waitlist-grid"
      >
        <div
          v-for="entry in waitlistStore.entries"
          :key="entry.id"
          data-testid="waitlist-card"
          class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between gap-4 transition hover:border-zinc-700"
        >
          <div class="flex gap-4">
            <!-- Poster -->
            <div class="w-20 h-28 shrink-0 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/60 flex items-center justify-center relative">
              <img
                v-if="entry.posterUrl"
                :src="entry.posterUrl"
                :alt="entry.title"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="text-2xl text-zinc-600">
                {{ getMediaTypeIcon(entry.mediaType) }}
              </div>
            </div>

            <!-- Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3
                  class="text-sm font-semibold text-white truncate"
                  :title="entry.title"
                  data-testid="entry-title"
                >
                  {{ entry.title }}
                </h3>
              </div>

              <div class="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                <span v-if="entry.year">{{ entry.year }}</span>
                <span v-if="entry.year" class="text-zinc-600">•</span>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                  :class="getMediaTypeBadgeClasses(entry.mediaType)"
                  data-testid="entry-media-type"
                >
                  {{ formatMediaType(entry.mediaType) }}
                </span>
                <span
                  v-if="entry.seasonNumber"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                  data-testid="entry-season-badge"
                >S{{ entry.seasonNumber < 10 ? `0${entry.seasonNumber}` : entry.seasonNumber }}<template v-if="entry.targetEpisode">E{{ entry.targetEpisode < 10 ? `0${entry.targetEpisode}` : entry.targetEpisode }}</template></span>
                <span
                  v-if="entry.tmdbReleaseDate"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-amber-300 border border-amber-800/50 flex items-center gap-1"
                  data-testid="entry-release-date-badge"
                  :title="entry.status === 'pending_release' ? `Starts looking for torrents on ${formatDateOnly(entry.tmdbReleaseDate)}` : `Released on ${formatDateOnly(entry.tmdbReleaseDate)}`"
                >
                  <span>📅</span>
                  <span>{{ formatDateOnly(entry.tmdbReleaseDate) }}</span>
                </span>
                <span
                  v-if="entry.requesterUsername"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1"
                  data-testid="entry-requester"
                >
                  <span>👤</span>
                  <span>{{ entry.requesterUsername }}</span>
                </span>
              </div>

              <!-- Status badge -->
              <div class="mt-3">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="getStatusBadgeClasses(entry.status)"
                  data-testid="entry-status-badge"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="getStatusDotClasses(entry.status)"
                  />
                  <span>{{ formatStatusText(entry) }}</span>
                </span>
              </div>

              <!-- Extra Context Info -->
              <p class="text-[11px] text-zinc-400 mt-2 line-clamp-2">
                <template v-if="entry.status === 'pending_release'">
                  <span v-if="entry.tmdbReleaseDate" class="text-amber-300/90 font-medium">
                    ⏳ Unreleased • Starts searching trackers on {{ formatDateOnly(entry.tmdbReleaseDate) }}
                  </span>
                  <span v-else>Awaiting confirmed release date from TMDB</span>
                </template>
                <template v-else-if="entry.status === 'checking'">
                  <span v-if="entry.tmdbReleaseDate">Released {{ formatDateOnly(entry.tmdbReleaseDate) }} • Actively checking trackers</span>
                  <span v-else>Checking trackers for quality release</span>
                </template>
                <template v-else-if="entry.status === 'notified'">
                  <span v-if="entry.prowlarrReleaseTitle" class="text-indigo-300 font-mono text-[10px] block truncate">
                    {{ entry.prowlarrReleaseTitle }}
                  </span>
                  <span class="text-amber-300 font-medium">Auto-downloading in {{ getCountdownSeconds(entry) }}s</span>
                </template>
                <template v-else-if="entry.status === 'triggered'">
                  <span class="text-emerald-300">Submitted to download queue</span>
                </template>
                <template v-else-if="entry.status === 'completed'">
                  <span class="text-teal-300">All episodes/releases completed</span>
                </template>
                <template v-else-if="entry.status === 'cancelled'">
                  <span class="text-zinc-500">Monitoring stopped</span>
                </template>
                <template v-else-if="entry.status === 'error'">
                  <span class="text-red-400">Submission failed (exceeded retries)</span>
                </template>
              </p>
            </div>
          </div>

          <!-- Card footer / actions -->
          <div class="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
            <span class="text-zinc-500">
              Added {{ formatDateOnly(entry.createdAt) }}
            </span>

            <button
              v-if="entry.status !== 'cancelled' && entry.status !== 'completed'"
              type="button"
              data-testid="cancel-waitlist-btn"
              class="px-2.5 py-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900/50 transition cursor-pointer flex items-center gap-1"
              @click="handleCancel(entry)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add to Waitlist / Confirmation Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      data-testid="waitlist-modal"
    >
      <div
        class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-white">
              {{ modalStep === 'confirm' ? 'Confirm Waitlist Entry' : 'Add to Waitlist' }}
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              {{ modalStep === 'confirm'
                ? 'Review details before adding to your tracker monitor'
                : 'Search TMDB for movies or series to monitor' }}
            </p>
          </div>
          <button
            type="button"
            class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
            @click="closeModal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Step 1: Search TMDB -->
        <div v-if="modalStep === 'search'" class="space-y-4 flex-1 overflow-y-auto pr-1">
          <!-- Search Form -->
          <form @submit.prevent="handleSearch" class="space-y-3">
            <div class="flex gap-2">
              <input
                id="searchWaitlistQuery"
                v-model="searchQuery"
                type="text"
                placeholder="Search movie or TV show title..."
                data-testid="search-waitlist-input"
                class="flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                :disabled="isSearching || !searchQuery.trim()"
                data-testid="search-waitlist-submit"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <svg
                  v-if="isSearching"
                  class="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span v-else>Search</span>
              </button>
            </div>

            <!-- Media Type Selector -->
            <div class="flex gap-2">
              <label
                v-for="type in mediaTypeOptions"
                :key="type.value"
                class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition"
                :class="searchMediaType === type.value
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
              >
                <input
                  v-model="searchMediaType"
                  type="radio"
                  name="modalMediaType"
                  :value="type.value"
                  class="sr-only"
                />
                <span>{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </label>
            </div>
          </form>

          <!-- Candidate Results -->
          <div v-if="candidates.length > 0" class="space-y-2 mt-4" data-testid="search-candidates-list">
            <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Results</h4>
            <div
              v-for="candidate in candidates"
              :key="candidate.id"
              data-testid="search-candidate-item"
              class="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900/80 transition cursor-pointer flex gap-3 items-center group"
              @click="selectCandidate(candidate)"
            >
              <div class="w-10 h-14 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center">
                <img
                  v-if="candidate.posterUrl"
                  :src="candidate.posterUrl"
                  :alt="candidate.title"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <span v-else class="text-sm text-zinc-600">🎬</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h5 class="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition">
                    {{ candidate.title }}
                  </h5>
                  <span v-if="candidate.year" class="text-xs text-zinc-400 shrink-0">({{ candidate.year }})</span>
                </div>
                <p v-if="candidate.overview" class="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                  {{ candidate.overview }}
                </p>
              </div>
              <svg class="w-4 h-4 text-zinc-500 group-hover:text-white transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div
            v-else-if="hasSearched && !isSearching"
            class="py-8 text-center text-xs text-zinc-500"
          >
            No matches found on TMDB for "{{ searchQuery }}".
          </div>
        </div>

        <!-- Step 2: Confirm Selection -->
        <div v-else-if="modalStep === 'confirm' && selectedCandidate" class="space-y-4 flex-1">
          <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex gap-4 items-center">
            <div class="w-14 h-20 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center">
              <img
                v-if="selectedCandidate.posterUrl"
                :src="selectedCandidate.posterUrl"
                :alt="selectedCandidate.title"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-xl">🎬</span>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-base font-bold text-white truncate" data-testid="confirm-candidate-title">
                {{ selectedCandidate.title }}
              </h4>
              <div class="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                <span v-if="selectedCandidate.year">({{ selectedCandidate.year }})</span>
                <span>•</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-medium border" :class="getMediaTypeBadgeClasses(selectedMediaType)">
                  {{ formatMediaType(selectedMediaType) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Season & Episode Selectors for TV Show / Anime -->
          <div
            v-if="['tv_show', 'anime'].includes(selectedMediaType)"
            class="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-4"
          >
            <!-- Progress badge if series has existing downloads -->
            <div
              v-if="seriesProgress?.hasExisting"
              class="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-300 flex items-start gap-2.5"
              data-testid="series-progress-badge"
            >
              <span class="text-base leading-none">💡</span>
              <div class="space-y-1">
                <div class="font-medium">
                  In Library:
                  <span class="text-white">
                    Season {{ selectedSeasonNumber }}
                    <template v-if="seriesProgress.existingEpisodes.length > 0">
                      (Episode{{ seriesProgress.existingEpisodes.length > 1 ? 's ' : ' ' }}{{ seriesProgress.existingEpisodes.join(', ') }})
                    </template>
                    <template v-else>
                      (No episodes in this season yet)
                    </template>
                  </span>
                </div>
                <div class="text-[11px] text-zinc-400">
                  Auto-targeting next episode {{ selectedEpisodeNumber || 1 }}. You can adjust below if needed.
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="waitlistSeasonInput" class="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Season
                </label>
                <input
                  id="waitlistSeasonInput"
                  v-model.number="selectedSeasonNumber"
                  type="number"
                  min="1"
                  data-testid="waitlist-season-input"
                  @change="fetchSeriesProgress"
                  class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label for="waitlistEpisodeInput" class="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Episode
                </label>
                <input
                  id="waitlistEpisodeInput"
                  v-model.number="selectedEpisodeNumber"
                  type="number"
                  min="1"
                  data-testid="waitlist-episode-input"
                  @change="fetchSeriesProgress"
                  class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <p class="text-[11px] text-zinc-400">
              Monitors S{{ (selectedSeasonNumber || 1) < 10 ? '0' + (selectedSeasonNumber || 1) : selectedSeasonNumber }}E{{ (selectedEpisodeNumber || 1) < 10 ? '0' + (selectedEpisodeNumber || 1) : selectedEpisodeNumber }} releases once available on trackers.
            </p>
          </div>

          <!-- TMDB Air Date / Release Date Display -->
          <div
            v-if="targetAirDate"
            class="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs flex items-center justify-between"
            data-testid="confirm-air-date-info"
          >
            <span class="text-zinc-400">
              <template v-if="['tv_show', 'anime'].includes(selectedMediaType)">
                Episode Air Date:
              </template>
              <template v-else>
                TMDB Release Date:
              </template>
            </span>
            <span class="text-white font-medium flex items-center gap-1.5" data-testid="confirm-air-date-value">
              <span>📅</span>
              <span>{{ formatDateOnly(targetAirDate) }}</span>
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              v-if="!isPrefilled"
              type="button"
              class="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              @click="modalStep = 'search'"
            >
              ← Back to search
            </button>
            <button
              v-else
              type="button"
              class="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              @click="closeModal"
            >
              Cancel
            </button>

            <button
              type="button"
              data-testid="confirm-add-waitlist-btn"
              :disabled="isSubmitting"
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              @click="submitWaitlistEntry"
            >
              <svg
                v-if="isSubmitting"
                class="animate-spin h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Confirm & Add to Waitlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { useWaitlistStore, WaitlistEntry, WaitlistStatus } from '../stores/waitlist';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { formatMediaType } from '../lib/formatters';

const route = useRoute();
const router = useRouter();
const waitlistStore = useWaitlistStore();
const authStore = useAuthStore();

// Admin view toggle (Ticket 10)
const activeView = ref<'mine' | 'all'>(authStore.isAdmin ? 'all' : 'mine');

async function loadEntries() {
  if (authStore.isAdmin && activeView.value === 'mine') {
    await waitlistStore.fetchAll({ userId: authStore.user?.id });
  } else {
    await waitlistStore.fetchAll({ allUsers: true });
  }
}

async function setView(view: 'mine' | 'all') {
  activeView.value = view;
  await loadEntries();
}

// Live ticker for notification countdowns
const now = ref(Date.now());
let tickerInterval: any = null;

onMounted(async () => {
  tickerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  await loadEntries();

  // Check if routed with prefilled metadata from RequestView (Ticket 09)
  if (route.query.add === 'true' && route.query.title) {
    initPrefilledModal();
  }
});

onUnmounted(() => {
  if (tickerInterval) {
    clearInterval(tickerInterval);
  }
});

// Modal state
const isModalOpen = ref(false);
const modalStep = ref<'search' | 'confirm'>('search');
const isPrefilled = ref(false);
const isSearching = ref(false);
const hasSearched = ref(false);
const isSubmitting = ref(false);

const searchQuery = ref('');
const searchMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const candidates = ref<any[]>([]);

const selectedCandidate = ref<any | null>(null);
const selectedMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const selectedSeasonNumber = ref<number>(1);
const selectedEpisodeNumber = ref<number | null>(1);
const targetAirDate = ref<string | null>(null);
const seriesProgress = ref<{
  highestSeason: number | null;
  highestEpisode: number | null;
  existingEpisodes: number[];
  suggestedSeason: number;
  suggestedEpisode: number;
  existingTitle: string | null;
  hasExisting: boolean;
  airDate?: string | null;
} | null>(null);

const mediaTypeOptions = [
  { value: 'movie' as const, label: 'Movie', icon: '🎬' },
  { value: 'tv_show' as const, label: 'TV Show', icon: '📺' },
  { value: 'anime' as const, label: 'Anime', icon: '⛩️' },
];

async function fetchSeriesProgress() {
  if (!selectedCandidate.value || !['tv_show', 'anime'].includes(selectedMediaType.value)) {
    seriesProgress.value = null;
    return;
  }
  try {
    const params = new URLSearchParams();
    if (selectedCandidate.value.id) params.append('metadataId', String(selectedCandidate.value.id));
    if (selectedCandidate.value.title) params.append('title', selectedCandidate.value.title);
    if (selectedSeasonNumber.value) params.append('seasonNumber', String(selectedSeasonNumber.value));
    if (selectedEpisodeNumber.value) params.append('episodeNumber', String(selectedEpisodeNumber.value));

    const data = await api.get<any>(`/requests/series-progress?${params.toString()}`);
    seriesProgress.value = data;
    if (selectedEpisodeNumber.value === null) {
      selectedEpisodeNumber.value = data?.hasExisting ? (data.suggestedEpisode || 1) : 1;
    }
    if (data?.airDate) {
      targetAirDate.value = data.airDate;
    }
  } catch {
    seriesProgress.value = null;
  }
}

function openSearchModal() {
  isPrefilled.value = false;
  modalStep.value = 'search';
  searchQuery.value = '';
  candidates.value = [];
  hasSearched.value = false;
  selectedCandidate.value = null;
  seriesProgress.value = null;
  targetAirDate.value = null;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  seriesProgress.value = null;
  targetAirDate.value = null;
  if (route.query.add) {
    router.replace({ path: '/waitlist', query: {} });
  }
}

async function initPrefilledModal() {
  isPrefilled.value = true;
  modalStep.value = 'confirm';
  const query = route.query;
  const mType = (query.mediaType as any) || 'movie';
  selectedMediaType.value = ['movie', 'tv_show', 'anime'].includes(mType) ? mType : 'movie';
  selectedSeasonNumber.value = query.seasonNumber ? Number(query.seasonNumber) : 1;
  selectedEpisodeNumber.value = query.targetEpisode || query.episodeNumber ? Number(query.targetEpisode || query.episodeNumber) : 1;
  if (query.releaseDate) {
    targetAirDate.value = String(query.releaseDate);
  }
  selectedCandidate.value = {
    id: String(query.metadataId || ''),
    source: String(query.metadataSource || 'tmdb'),
    title: String(query.title || ''),
    year: query.year ? Number(query.year) : undefined,
    posterUrl: query.posterUrl ? String(query.posterUrl) : null,
  };
  isModalOpen.value = true;
  if (['tv_show', 'anime'].includes(selectedMediaType.value)) {
    await fetchSeriesProgress();
  }
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  isSearching.value = true;
  hasSearched.value = true;
  candidates.value = [];
  try {
    const data = await api.post<{ candidates: any[] }>('/requests/search-metadata', {
      query: searchQuery.value.trim(),
      mediaType: searchMediaType.value,
    });
    candidates.value = data.candidates || [];
  } catch (err: any) {
    waitlistStore.showToast(err.message || 'Failed to search metadata', 'error');
  } finally {
    isSearching.value = false;
  }
}

async function selectCandidate(candidate: any) {
  selectedCandidate.value = candidate;
  selectedMediaType.value = searchMediaType.value;
  selectedSeasonNumber.value = 1;
  selectedEpisodeNumber.value = null;
  targetAirDate.value = candidate.releaseDate || null;
  seriesProgress.value = null;
  modalStep.value = 'confirm';
  if (['tv_show', 'anime'].includes(selectedMediaType.value)) {
    await fetchSeriesProgress();
  }
}

async function submitWaitlistEntry() {
  if (!selectedCandidate.value) return;
  isSubmitting.value = true;
  try {
    await waitlistStore.addEntry({
      mediaType: selectedMediaType.value,
      metadataId: String(selectedCandidate.value.id),
      metadataSource: selectedCandidate.value.source || 'tmdb',
      title: selectedCandidate.value.title,
      year: selectedCandidate.value.year || undefined,
      seasonNumber: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedSeasonNumber.value || 1) : undefined,
      targetEpisode: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedEpisodeNumber.value || 1) : undefined,
      tmdbReleaseDate: targetAirDate.value || undefined,
      posterUrl: selectedCandidate.value.posterUrl || undefined,
    });
    closeModal();
  } catch {
    // Error is handled and toasted in store
  } finally {
    isSubmitting.value = false;
  }
}

async function handleCancel(entry: WaitlistEntry) {
  try {
    await waitlistStore.cancelEntry(entry.id);
  } catch {
    // Error is handled in store
  }
}

function getCountdownSeconds(entry: WaitlistEntry): number {
  if (!entry.notifyAt) return 60;
  const notifiedTime = new Date(entry.notifyAt).getTime();
  // 60-second default grace window
  const graceWindowMs = 60 * 1000;
  const remaining = Math.max(0, Math.ceil((notifiedTime + graceWindowMs - now.value) / 1000));
  return remaining;
}

function getMediaTypeIcon(type: string): string {
  switch (type) {
    case 'movie':
      return '🎬';
    case 'tv_show':
      return '📺';
    case 'anime':
      return '⛩️';
    default:
      return '📁';
  }
}

function getMediaTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'movie':
      return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
    case 'tv_show':
      return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
    case 'anime':
      return 'bg-pink-950/60 text-pink-300 border-pink-800/60';
    default:
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}

function getStatusBadgeClasses(status: WaitlistStatus): string {
  switch (status) {
    case 'pending_release':
      return 'bg-amber-950/50 text-amber-300 border-amber-800/50';
    case 'checking':
      return 'bg-sky-950/50 text-sky-300 border-sky-800/50';
    case 'notified':
      return 'bg-indigo-950/50 text-indigo-300 border-indigo-700 animate-pulse';
    case 'triggered':
      return 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50';
    case 'completed':
      return 'bg-teal-950/50 text-teal-300 border-teal-800/50';
    case 'cancelled':
      return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    case 'error':
      return 'bg-rose-950/50 text-rose-300 border-rose-800/50';
    default:
      return 'bg-zinc-900 text-zinc-400 border-zinc-800';
  }
}

function getStatusDotClasses(status: WaitlistStatus): string {
  switch (status) {
    case 'pending_release':
      return 'bg-amber-400';
    case 'checking':
      return 'bg-sky-400';
    case 'notified':
      return 'bg-indigo-400';
    case 'triggered':
      return 'bg-emerald-400';
    case 'completed':
      return 'bg-teal-400';
    case 'cancelled':
      return 'bg-zinc-500';
    case 'error':
      return 'bg-rose-400';
    default:
      return 'bg-zinc-400';
  }
}

function formatStatusText(entry: WaitlistEntry): string {
  switch (entry.status) {
    case 'pending_release':
      return 'Pending Release';
    case 'checking':
      return 'Checking Trackers';
    case 'notified':
      return `Release Found (${getCountdownSeconds(entry)}s)`;
    case 'triggered':
      return 'Triggered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'error':
      return 'Error';
    default:
      return entry.status;
  }
}

function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}
</script>
