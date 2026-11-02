<template>
  <div>
    <DeleteRequestModal
      :item="itemToDelete"
      :is-deleting="isDeleting"
      @close="$emit('close-delete')"
      @confirm="$emit('confirm-delete')"
    />

    <RedownloadModal
      :show="showRedownloadModal"
      :item="redownloadTarget"
      @close="$emit('close-redownload')"
      @redownloaded="$emit('redownloaded', $event)"
    />

    <StreamProgressModal
      :show="streamPlayback.showStreamModal.value"
      :stream-id="streamPlayback.streamModalId.value"
      :title="streamPlayback.streamModalTitle.value"
      :initial-status="streamPlayback.streamModalStatus.value"
      :error-message="streamPlayback.streamModalError.value"
      :can-add-to-waitlist="Boolean(streamPlayback.activeStreamingItem.value)"
      :is-adding-to-waitlist="streamPlayback.isAddingToWaitlistFromModal.value"
      :waitlist-added="streamPlayback.hasAddedToWaitlistFromModal.value"
      @close="$emit('close-stream')"
      @promote="streamPlayback.handleOpenPromotion"
      @error="streamPlayback.handleStreamPlaybackError"
      @add-to-waitlist="streamPlayback.handleConfirmAddToWaitlist"
    />

    <PromotionModal
      :show="streamPlayback.showPromotionModal.value"
      :stream="streamPlayback.promotionStream.value"
      @close="$emit('close-promotion')"
      @promoted="streamPlayback.handleStreamPromoted"
    />

    <SubtitlePickerModal
      :show="showSubtitleModal"
      :request-id="subtitleTarget?.id || ''"
      :title="subtitleTarget?.title"
      @close="$emit('close-subtitle')"
    />

    <TorrentReplacementModal
      :open="!!replaceTarget"
      :item="replaceTarget"
      @close="$emit('close-replace')"
      @replaced="$emit('replaced')"
    />
  </div>
</template>

<script setup lang="ts">
import DeleteRequestModal from '../requests/DeleteRequestModal.vue';
import RedownloadModal from '../requests/RedownloadModal.vue';
import StreamProgressModal from '../StreamProgressModal.vue';
import PromotionModal from '../PromotionModal.vue';
import SubtitlePickerModal from '../SubtitlePickerModal.vue';
import TorrentReplacementModal from '../TorrentReplacementModal.vue';
import type { DownloadRequest } from '../../stores/requests';
import type { useStreamPlayback } from '../../composables/useStreamPlayback';

defineProps<{
  itemToDelete: DownloadRequest | null;
  isDeleting: boolean;
  showRedownloadModal: boolean;
  redownloadTarget: DownloadRequest | null;
  streamPlayback: ReturnType<typeof useStreamPlayback>;
  showSubtitleModal: boolean;
  subtitleTarget: { id: string; title: string } | null;
  replaceTarget: DownloadRequest | null;
}>();

defineEmits<{
  (e: 'close-delete'): void;
  (e: 'confirm-delete'): void;
  (e: 'close-redownload'): void;
  (e: 'redownloaded', newReq: DownloadRequest): void;
  (e: 'close-stream'): void;
  (e: 'close-promotion'): void;
  (e: 'close-subtitle'): void;
  (e: 'close-replace'): void;
  (e: 'replaced'): void;
}>();
</script>
