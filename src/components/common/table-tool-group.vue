<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { NaiveUI } from '@sa/hooks';

defineOptions({ name: 'TableToolGroup' });

withDefaults(
  defineProps<{
    loading?: boolean;
    size?: 'tiny' | 'small' | 'medium' | 'large';
  }>(),
  {
    loading: false,
    size: 'medium'
  }
);

const columns = defineModel<NaiveUI.TableColumnCheck[]>('columns', {
  required: true
});

defineEmits<{ refresh: [] }>();
</script>

<template>
  <NButtonGroup>
    <NButton :size="size" :loading="loading" @click="$emit('refresh')">
      <template #icon>
        <SvgIcon icon="mdi:refresh" />
      </template>
      刷新
    </NButton>
    <TableColumnSetting v-model:columns="columns" :size="size" />
  </NButtonGroup>
</template>
