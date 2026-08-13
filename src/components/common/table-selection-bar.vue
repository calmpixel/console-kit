<script setup lang="ts">
defineOptions({ name: 'TableSelectionBar' });

defineProps<{
  /** Selected row count; bar hidden when 0 */
  count: number;
}>();

defineEmits<{ clear: [] }>();
</script>

<template>
  <div v-if="count > 0" class="table-selection-bar">
    <NText class="table-selection-bar__count">已选 {{ count }} 项</NText>
    <slot />
    <NButton text class="table-selection-bar__clear" @click="$emit('clear')">取消选择</NButton>
  </div>
</template>

<style scoped>
.table-selection-bar {
  display: flex;
  align-items: center;
  gap: 8px 16px;
  min-height: 40px;
  margin-bottom: 8px;
  padding: 0 12px;
  border: 1px solid rgb(var(--primary-color) / 0.28);
  border-radius: 4px;
  background: rgb(var(--primary-color) / 0.08);
}

.table-selection-bar__count {
  font-weight: 500;
  color: rgb(var(--primary-color));
}

.table-selection-bar__clear {
  margin-left: auto;
}
</style>
