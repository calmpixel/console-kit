<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { LAYOUT_SCROLL_EL_ID } from '@sa/materials';

defineOptions({ name: 'AdminTableWrap' });

const props = withDefaults(
  defineProps<{
    /**
     * Reserve below the scroll body for pagination (≈52).
     * Pass 0 for menu tree / no pagination.
     * Thead (~40) is reserved automatically when this is > 0.
     */
    bottomReserve?: number;
  }>(),
  { bottomReserve: 52 }
);

/**
 * Cap for the scrollable region (NDataTable body / NScrollbar).
 * Budget = visible layout content bottom − wrap top (card stays content-sized).
 *
 * Naive `max-height` applies to tbody only — thead sits outside it. Paginated
 * lists must subtract both thead and pagination, otherwise the last row is clipped.
 */
const budgetPx = ref(480);
const abovePx = ref(0);

/** Approx n-data-table thead height; only applied when pagination is reserved. */
const THEAD_RESERVE = 40;

const rootRef = useTemplateRef<HTMLElement>('root');

const maxHeight = computed(() => {
  const thead = props.bottomReserve > 0 ? THEAD_RESERVE : 0;
  return Math.max(120, Math.floor(budgetPx.value - abovePx.value - props.bottomReserve - thead));
});

function marginsY(el: HTMLElement) {
  const style = getComputedStyle(el);
  return (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0);
}

function measureAbove() {
  const root = rootRef.value;
  if (!root) {
    abovePx.value = 0;
    return;
  }

  let sum = 0;
  root.querySelectorAll<HTMLElement>('.table-selection-bar, .menu-tree__head').forEach(el => {
    if (!el.offsetHeight) return;
    sum += el.offsetHeight + marginsY(el);
  });
  abovePx.value = sum;
}

function layoutViewBottom(): number {
  const scrollEl = document.querySelector(`#${LAYOUT_SCROLL_EL_ID}`) as HTMLElement | null;
  if (scrollEl) {
    const rect = scrollEl.getBoundingClientRect();
    return rect.top + scrollEl.clientHeight;
  }
  return window.innerHeight;
}

/** Space from wrap top down to the visible layout content bottom. */
function measureBudget() {
  const root = rootRef.value;
  if (!root) return;

  const top = root.getBoundingClientRect().top;
  // Card body bottom padding (16) + small gap so the card does not glue to the scrollport.
  const BOTTOM_GAP = 24;
  budgetPx.value = Math.max(160, Math.floor(layoutViewBottom() - top - BOTTOM_GAP));
}

function measureAll() {
  measureBudget();
  measureAbove();
}

let observer: ResizeObserver | null = null;

function bindObserver() {
  observer?.disconnect();
  const root = rootRef.value;
  if (!root || typeof ResizeObserver === 'undefined') return;

  const scrollEl = document.querySelector(`#${LAYOUT_SCROLL_EL_ID}`);

  observer = new ResizeObserver(() => {
    measureAll();
  });
  observer.observe(root);
  if (scrollEl) observer.observe(scrollEl);
  for (const child of Array.from(root.children)) {
    observer.observe(child);
  }
}

function onWinResize() {
  measureAll();
}

onMounted(async () => {
  await nextTick();
  measureAll();
  bindObserver();
  window.addEventListener('resize', onWinResize);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  window.removeEventListener('resize', onWinResize);
});

watch(
  () => props.bottomReserve,
  async () => {
    await nextTick();
    measureAll();
  }
);
</script>

<template>
  <div ref="root" class="admin-table-wrap">
    <slot :max-height="maxHeight" />
  </div>
</template>
