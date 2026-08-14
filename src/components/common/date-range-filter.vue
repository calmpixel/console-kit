<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import type { PopoverPlacement } from 'naive-ui';

defineOptions({ name: 'DateRangeFilter' });

const value = defineModel<[number, number] | null>({ default: null });

const props = withDefaults(
  defineProps<{
    /** Naive date picker type */
    type?: 'datetimerange' | 'daterange';
    /** Tooltip when empty */
    placeholder?: string;
    /** Popover placement */
    placement?: PopoverPlacement;
    size?: 'tiny' | 'small' | 'medium' | 'large';
  }>(),
  {
    type: 'datetimerange',
    placeholder: '选择时间范围',
    placement: 'bottom-start',
    size: 'medium'
  }
);

const show = ref(false);
const hovering = ref(false);
/** Draft while panel is open — panel mode emits on every click, only commit on confirm */
const draft = ref<[number, number] | null>(null);

const hasValue = computed(() => Array.isArray(value.value) && value.value.length === 2);

const rangeLabel = computed(() => {
  if (!hasValue.value || !value.value) return '';
  const [start, end] = value.value;
  const fmt = props.type === 'daterange' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm';
  return `${dayjs(start).format(fmt)} ~ ${dayjs(end).format(fmt)}`;
});

const tooltipText = computed(() => (hasValue.value ? rangeLabel.value : props.placeholder));

const showClear = computed(() => hasValue.value && hovering.value && !show.value);

watch(show, open => {
  if (open) {
    draft.value = value.value ? ([value.value[0], value.value[1]] as [number, number]) : null;
  }
});

function clear(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  value.value = null;
  draft.value = null;
  show.value = false;
}

function onPanelUpdate(next: [number, number] | null) {
  draft.value = next;
}

function onConfirm() {
  value.value = draft.value;
  show.value = false;
}
</script>

<template>
  <NPopover v-model:show="show" trigger="click" :placement="placement" :show-arrow="false" display-directive="show" raw>
    <template #trigger>
      <NTooltip :disabled="show || showClear" placement="top">
        <template #trigger>
          <button
            type="button"
            class="date-range-filter"
            :class="{
              'is-active': hasValue,
              [`is-${size}`]: true
            }"
            :aria-label="tooltipText"
            @mouseenter="hovering = true"
            @mouseleave="hovering = false"
          >
            <SvgIcon icon="mdi:calendar-range" class="date-range-filter__icon" />
            <span
              v-show="showClear"
              class="date-range-filter__clear"
              role="button"
              tabindex="-1"
              title="清除时间范围"
              aria-label="清除时间范围"
              @click="clear"
            >
              <SvgIcon icon="mdi:close" class="text-12px" />
            </span>
          </button>
        </template>
        {{ tooltipText }}
      </NTooltip>
    </template>

    <div class="date-range-filter__panel">
      <NDatePicker :value="draft" :type="type" panel @update:value="onPanelUpdate" @confirm="onConfirm" />
    </div>
  </NPopover>
</template>

<style scoped>
.date-range-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 1px solid rgb(var(--base-text-color) / 0.16);
  border-radius: 6px;
  background: rgb(var(--container-bg-color));
  color: rgb(var(--base-text-color) / 0.62);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.date-range-filter.is-tiny {
  width: 28px;
  height: 28px;
}

.date-range-filter.is-small {
  width: 30px;
  height: 30px;
}

.date-range-filter.is-medium {
  width: 34px;
  height: 34px;
}

.date-range-filter.is-large {
  width: 38px;
  height: 38px;
}

.date-range-filter__icon {
  font-size: 18px;
  line-height: 1;
}

.date-range-filter:hover {
  color: rgb(var(--base-text-color) / 0.88);
  border-color: rgb(var(--base-text-color) / 0.28);
  background: rgb(var(--base-text-color) / 0.04);
}

.date-range-filter.is-active {
  color: rgb(var(--primary-color));
  background: rgb(var(--primary-color) / 0.12);
  border-color: rgb(var(--primary-color) / 0.45);
  box-shadow: 0 0 0 1px rgb(var(--primary-color) / 0.12);
}

.date-range-filter.is-active:hover {
  color: rgb(var(--primary-color));
  background: rgb(var(--primary-color) / 0.16);
  border-color: rgb(var(--primary-color) / 0.55);
}

.date-range-filter__clear {
  position: absolute;
  top: -5px;
  right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid rgb(var(--container-bg-color));
  border-radius: 999px;
  background: rgb(var(--error-color));
  color: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.16);
  cursor: pointer;
  z-index: 1;
}

.date-range-filter__clear:hover {
  filter: brightness(1.08);
}

.date-range-filter__panel {
  padding: 8px;
  border-radius: 10px;
  background: rgb(var(--container-bg-color));
  box-shadow:
    0 6px 16px -4px rgb(0 0 0 / 0.12),
    0 0 0 1px rgb(var(--base-text-color) / 0.06);
}

.date-range-filter__panel :deep(.n-date-panel) {
  box-shadow: none;
}
</style>
