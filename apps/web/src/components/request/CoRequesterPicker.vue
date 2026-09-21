<template>
  <div
    v-if="availableUsers && availableUsers.length > 0"
    data-testid="co-requester-picker"
    class="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3"
  >
    <div class="flex items-center justify-between">
      <label class="text-xs font-semibold text-zinc-300">
        Co-Requesters (Optional)
      </label>
      <span class="text-[11px] text-zinc-500">
        {{ modelValue.length }} selected
      </span>
    </div>
    <p class="text-xs text-zinc-400">
      Select additional users who also requested this content.
    </p>

    <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
      <button
        v-for="user in availableUsers"
        :key="user.id"
        type="button"
        :data-testid="'co-requester-' + user.id"
        class="px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5"
        :class="modelValue.includes(user.id)
          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
          : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
        @click="toggleUser(user.id)"
      >
        <span>{{ modelValue.includes(user.id) ? '✓' : '+' }}</span>
        <span>@{{ user.username }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  availableUsers: Array<{ id: string; username: string }>;
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string[]): void;
}>();

function toggleUser(userId: string) {
  const next = props.modelValue.includes(userId)
    ? props.modelValue.filter((id) => id !== userId)
    : [...props.modelValue, userId];
  emit('update:modelValue', next);
}
</script>
