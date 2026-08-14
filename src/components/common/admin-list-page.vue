<script setup lang="ts">
import { useSlots } from 'vue';

defineOptions({ name: 'AdminListPage' });

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Show primary accent bar before title */
    accent?: boolean;
  }>(),
  {
    description: '',
    accent: true
  }
);

const slots = useSlots();
</script>

<template>
  <div class="admin-list-page">
    <NCard
      :bordered="false"
      size="small"
      class="card-wrapper admin-list-page__card"
      content-class="admin-list-page__card-content"
      content-style="padding: 0;"
    >
      <header class="admin-list-page__header">
        <div class="admin-list-page__intro min-w-0">
          <h1 class="admin-list-page__title" :class="{ 'is-accent': accent }">{{ title }}</h1>
          <p v-if="description" class="admin-list-page__desc" :class="{ 'is-accent': accent }">
            {{ description }}
          </p>
        </div>
      </header>

      <div v-if="slots.filters || slots.toolbar || slots.actions" class="admin-list-page__controls">
        <div class="admin-list-page__filters min-w-0">
          <slot name="filters" />
        </div>
        <div class="admin-list-page__tools">
          <slot name="toolbar" />
          <slot name="actions" />
        </div>
      </div>

      <div class="admin-list-page__body">
        <slot />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
/*
  White card hugs content (height: auto). Do NOT stretch to fill the layout viewport —
  leftover area stays layout gray. Table/tree overflow uses AdminTableWrap maxHeight.
*/
.admin-list-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  max-height: 100%;
  min-height: 0;
}

.admin-list-page__card {
  flex: 0 1 auto;
  width: 100%;
  height: auto;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex !important;
  flex-direction: column;
}

.admin-list-page__card :deep(.admin-list-page__card-content),
.admin-list-page__card :deep(.n-card__content) {
  display: flex !important;
  flex-direction: column;
  flex: 0 1 auto;
  min-height: 0;
  height: auto;
  max-height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.admin-list-page__header {
  flex: 0 0 auto;
  padding: 20px 20px 16px;
}

.admin-list-page__intro {
  width: 100%;
  min-width: 0;
}

.admin-list-page__title {
  position: relative;
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: rgb(var(--base-text-color));
}

.admin-list-page__title.is-accent {
  padding-left: 14px;
}

.admin-list-page__title.is-accent::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.22em;
  bottom: 0.18em;
  width: 3px;
  border-radius: 2px;
  background: rgb(var(--primary-color));
}

.admin-list-page__desc {
  margin: 8px 0 0;
  max-width: none;
  width: 100%;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--base-text-color) / 0.52);
}

.admin-list-page__desc.is-accent {
  padding-left: 14px;
}

.admin-list-page__controls {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 20px;
  border-top: 1px solid rgb(var(--base-text-color) / 0.06);
  border-bottom: 1px solid rgb(var(--base-text-color) / 0.06);
}

.admin-list-page__filters {
  flex: 1 1 280px;
}

.admin-list-page__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 1 auto;
}

.admin-list-page__body {
  flex: 0 1 auto;
  height: auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 20px 16px;
  gap: 12px;
}

.admin-list-page__body > :deep(.admin-table-wrap),
.admin-list-page__body > :deep(.menu-tree-wrap) {
  flex: 0 1 auto;
  max-height: 100%;
  min-height: 0;
  height: auto;
}

.admin-list-page__body > :deep(:not(.admin-table-wrap):not(.menu-tree-wrap)) {
  flex-shrink: 0;
}
</style>
