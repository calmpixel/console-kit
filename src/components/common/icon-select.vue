<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PopoverPlacement } from 'naive-ui';
import mdi from '@iconify/json/json/mdi.json';

defineOptions({ name: 'IconSelect' });

const value = defineModel<string>({ default: '' });

withDefaults(
  defineProps<{
    placeholder?: string;
    placement?: PopoverPlacement;
    disabled?: boolean;
  }>(),
  {
    placeholder: 'mdi:account',
    placement: 'bottom-start',
    disabled: false
  }
);

/** Common menu / admin icons shown when search is empty. */
const PRESET = [
  'mdi:view-dashboard-outline',
  'mdi:gauge',
  'mdi:layers-outline',
  'mdi:package-variant',
  'mdi:desktop-classic',
  'mdi:cellphone',
  'mdi:bridge',
  'mdi:key-variant',
  'mdi:domain',
  'mdi:office-building',
  'mdi:cog-outline',
  'mdi:account-group',
  'mdi:shield-account',
  'mdi:menu',
  'mdi:tune-variant',
  'mdi:script-text-outline',
  'mdi:database-arrow-down-outline',
  'mdi:database-eye-outline',
  'mdi:account',
  'mdi:account-circle',
  'mdi:account-cog',
  'mdi:home',
  'mdi:home-outline',
  'mdi:apps',
  'mdi:view-list',
  'mdi:view-grid',
  'mdi:folder',
  'mdi:folder-outline',
  'mdi:file-document-outline',
  'mdi:clipboard-list-outline',
  'mdi:chart-line',
  'mdi:chart-bar',
  'mdi:bell-outline',
  'mdi:email-outline',
  'mdi:calendar',
  'mdi:clock-outline',
  'mdi:history',
  'mdi:magnify',
  'mdi:filter-outline',
  'mdi:plus',
  'mdi:pencil-outline',
  'mdi:delete-outline',
  'mdi:content-save-outline',
  'mdi:refresh',
  'mdi:download',
  'mdi:upload',
  'mdi:cloud-outline',
  'mdi:server',
  'mdi:database',
  'mdi:api',
  'mdi:link-variant',
  'mdi:lock-outline',
  'mdi:shield-check',
  'mdi:alert-circle-outline',
  'mdi:information-outline',
  'mdi:help-circle-outline',
  'mdi:web',
  'mdi:earth',
  'mdi:cellphone-link',
  'mdi:monitor',
  'mdi:devices',
  'mdi:router-wireless',
  'mdi:lan',
  'mdi:puzzle-outline',
  'mdi:tools',
  'mdi:wrench-outline',
  'mdi:hammer-wrench',
  'mdi:rocket-launch-outline',
  'mdi:lightning-bolt',
  'mdi:star-outline',
  'mdi:heart-outline',
  'mdi:bookmark-outline',
  'mdi:tag-outline',
  'mdi:shape-outline',
  'mdi:palette-outline',
  'mdi:brush',
  'mdi:image-outline',
  'mdi:camera-outline',
  'mdi:video-outline',
  'mdi:music',
  'mdi:gamepad-variant-outline',
  'mdi:cart-outline',
  'mdi:cash',
  'mdi:receipt',
  'mdi:truck-outline',
  'mdi:map-marker-outline',
  'mdi:compass-outline',
  'mdi:school-outline',
  'mdi:book-open-outline',
  'mdi:notebook-outline',
  'mdi:forum-outline',
  'mdi:chat-outline',
  'mdi:phone-outline',
  'mdi:email-fast-outline',
  'mdi:cog',
  'mdi:settings-outline',
  'mdi:toggle-switch',
  'mdi:checkbox-marked-outline',
  'mdi:format-list-bulleted',
  'mdi:table',
  'mdi:code-tags',
  'mdi:console',
  'mdi:bug-outline',
  'mdi:test-tube',
  'mdi:timer-outline',
  'mdi:progress-clock'
];

const ALL_MDI = Object.keys((mdi as { icons: Record<string, unknown> }).icons).map(name => `mdi:${name}`);

const show = ref(false);
const keyword = ref('');

const GRID_LIMIT = 96;

const filterQuery = computed(() => {
  const fromPanel = keyword.value.trim().toLowerCase().replace(/^mdi:/, '');
  if (fromPanel) return fromPanel;
  const typed = value.value.trim().toLowerCase().replace(/^mdi:/, '');
  if (!typed) return '';
  if (ALL_MDI.includes(`mdi:${typed}`) || PRESET.includes(value.value.trim())) return '';
  return typed;
});

const icons = computed(() => {
  const q = filterQuery.value;
  if (!q) return PRESET;
  const hits: string[] = [];
  for (const name of ALL_MDI) {
    if (name.includes(q)) {
      hits.push(name);
      if (hits.length >= GRID_LIMIT) break;
    }
  }
  return hits;
});

watch(show, open => {
  if (!open) keyword.value = '';
});

function openPanel() {
  if (!show.value) show.value = true;
}

function pick(icon: string) {
  value.value = icon;
  show.value = false;
}
</script>

<template>
  <NPopover
    v-model:show="show"
    trigger="manual"
    :placement="placement"
    :show-arrow="false"
    :disabled="disabled"
    display-directive="show"
    raw
    @clickoutside="show = false"
  >
    <template #trigger>
      <NInput
        v-model:value="value"
        class="icon-select__input"
        :placeholder="placeholder"
        :disabled="disabled"
        clearable
        @click="openPanel"
        @focus="openPanel"
      >
        <template #prefix>
          <span class="icon-select__preview">
            <SvgIcon v-if="value" :icon="value" class="icon-select__preview-icon" />
            <SvgIcon v-else icon="mdi:emoticon-outline" class="icon-select__preview-icon is-empty" />
          </span>
        </template>
        <template #suffix>
          <SvgIcon icon="mdi:chevron-down" class="icon-select__caret" />
        </template>
      </NInput>
    </template>

    <div class="icon-select__panel">
      <NInput v-model:value="keyword" size="small" clearable placeholder="搜索图标，如 account / menu">
        <template #prefix>
          <SvgIcon icon="mdi:magnify" class="text-icon" />
        </template>
      </NInput>
      <p class="icon-select__hint">
        {{
          filterQuery
            ? `匹配 ${icons.length}${icons.length >= GRID_LIMIT ? '+' : ''} 个`
            : '常用图标 · 点选或直接输入名称'
        }}
      </p>
      <div v-if="icons.length" class="icon-select__grid">
        <button
          v-for="icon in icons"
          :key="icon"
          type="button"
          class="icon-select__item"
          :class="{ 'is-active': value === icon }"
          :title="icon"
          @click="pick(icon)"
        >
          <SvgIcon :icon="icon" class="icon-select__item-icon" />
        </button>
      </div>
      <div v-else class="icon-select__empty">无匹配图标</div>
    </div>
  </NPopover>
</template>

<style scoped>
.icon-select__preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.icon-select__preview-icon {
  font-size: 18px;
  color: rgb(var(--base-text-color) / 0.78);
}

.icon-select__preview-icon.is-empty {
  color: rgb(var(--base-text-color) / 0.35);
}

.icon-select__caret {
  font-size: 16px;
  color: rgb(var(--base-text-color) / 0.4);
}

.icon-select__panel {
  width: 320px;
  padding: 12px;
  border-radius: 10px;
  background: rgb(var(--container-bg-color));
  box-shadow:
    0 6px 16px -4px rgb(15 23 42 / 12%),
    0 2px 8px -2px rgb(15 23 42 / 8%);
  border: 1px solid rgb(var(--base-text-color) / 0.08);
}

.icon-select__hint {
  margin: 8px 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(var(--base-text-color) / 0.45);
}

.icon-select__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
  max-height: 240px;
  overflow: auto;
}

.icon-select__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--base-text-color) / 0.78);
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}

.icon-select__item:hover {
  background: rgb(var(--primary-color) / 0.08);
  color: rgb(var(--primary-color));
}

.icon-select__item.is-active {
  background: rgb(var(--primary-color) / 0.12);
  border-color: rgb(var(--primary-color) / 0.35);
  color: rgb(var(--primary-color));
}

.icon-select__item-icon {
  font-size: 20px;
}

.icon-select__empty {
  padding: 24px 8px;
  text-align: center;
  font-size: 13px;
  color: rgb(var(--base-text-color) / 0.45);
}
</style>
