import { computed, ref, watch, type Ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { TableColumnCheck } from '@sa/hooks';
import { $t } from '@/locales';
import { isTableColumnHasKey } from '@/hooks/common/table';
import { useAuthStore } from '@/store/modules/auth';
import { useAppStore } from '@/store/modules/app';
import { localStg } from '@/utils/storage';

const SELECTION_KEY = '__selection__';
const EXPAND_KEY = '__expand__';

export type UseColumnSettingOptions = {
  /**
   * Stable id per page/table (e.g. `system.user`).
   * When set, column checks (order / visibility / fixed) persist per user in localStorage.
   */
  tableId?: string;
};

type PersistedColumnCheck = {
  key: string;
  checked: boolean;
  fixed: TableColumnCheck['fixed'];
};

function storageSlot(userId: string, tableId: string) {
  return `${userId}::${tableId}`;
}

function loadPersisted(userId: string, tableId: string): PersistedColumnCheck[] | null {
  const all = localStg.get('tableColumnSetting');
  if (!all) return null;
  const saved = all[storageSlot(userId, tableId)];
  return Array.isArray(saved) ? saved : null;
}

function savePersisted(userId: string, tableId: string, checks: TableColumnCheck[]) {
  const all = { ...(localStg.get('tableColumnSetting') || {}) };
  all[storageSlot(userId, tableId)] = checks.map(item => ({
    key: item.key,
    checked: !!item.checked,
    fixed: item.fixed || 'unFixed'
  }));
  localStg.set('tableColumnSetting', all);
}

function clearPersisted(userId: string, tableId: string) {
  const all = localStg.get('tableColumnSetting');
  if (!all) return;
  const next = { ...all };
  delete next[storageSlot(userId, tableId)];
  localStg.set('tableColumnSetting', next);
}

/** Merge saved order/visibility/fixed onto current defaults; drop unknown keys; append new columns. */
export function mergeColumnChecks(
  defaults: TableColumnCheck[],
  saved: PersistedColumnCheck[] | null | undefined
): TableColumnCheck[] {
  if (!saved?.length) return defaults.map(item => ({ ...item }));

  const defaultMap = new Map(defaults.map(item => [item.key, item]));
  const merged: TableColumnCheck[] = [];
  const used = new Set<string>();

  for (const item of saved) {
    const base = defaultMap.get(item.key);
    if (!base) continue;
    merged.push({
      ...base,
      checked: item.checked,
      fixed: item.fixed || base.fixed || 'unFixed'
    });
    used.add(item.key);
  }

  for (const item of defaults) {
    if (used.has(item.key)) continue;
    merged.push({ ...item });
  }

  return merged;
}

/** Build column-setting state from NDataTable columns (selection/expand hidden in popover). */
export function createColumnChecks<T>(cols: DataTableColumns<T>): TableColumnCheck[] {
  const checks: TableColumnCheck[] = [];

  cols.forEach(column => {
    if (isTableColumnHasKey(column)) {
      checks.push({
        key: String(column.key),
        title: (column.title as TableColumnCheck['title']) ?? String(column.key),
        checked: true,
        fixed: (column.fixed as TableColumnCheck['fixed']) ?? 'unFixed',
        visible: true
      });
      return;
    }
    if (column.type === 'selection') {
      checks.push({
        key: SELECTION_KEY,
        title: $t('common.check'),
        checked: true,
        fixed: (column.fixed as TableColumnCheck['fixed']) ?? 'unFixed',
        visible: false
      });
      return;
    }
    if (column.type === 'expand') {
      checks.push({
        key: EXPAND_KEY,
        title: $t('common.expandColumn'),
        checked: true,
        fixed: (column.fixed as TableColumnCheck['fixed']) ?? 'unFixed',
        visible: false
      });
    }
  });

  return checks;
}

/** Apply order / visibility / fixed from column setting onto base columns. */
export function applyColumnChecks<T>(
  cols: DataTableColumns<T>,
  checks: TableColumnCheck[]
): DataTableColumns<T> {
  const columnMap = new Map<string, (typeof cols)[number]>();

  cols.forEach(column => {
    if (isTableColumnHasKey(column)) {
      columnMap.set(String(column.key), column);
    } else if (column.type === 'selection') {
      columnMap.set(SELECTION_KEY, column);
    } else if (column.type === 'expand') {
      columnMap.set(EXPAND_KEY, column);
    }
  });

  return checks
    .filter(item => item.checked)
    .map(check => {
      const col = columnMap.get(check.key);
      if (!col) return null;
      const fixed = check.fixed === 'unFixed' ? undefined : check.fixed;
      return { ...col, fixed } as (typeof cols)[number];
    })
    .filter(Boolean) as DataTableColumns<T>;
}

/**
 * Local table column setting: drag order, show/hide, pin left/right.
 * Pass `tableId` to persist per login user in localStorage (pages isolated).
 * Pair with `<TableColumnSetting v-model:columns="columnChecks" />`.
 */
export function useColumnSetting<T>(
  createColumns: () => DataTableColumns<T>,
  options: UseColumnSettingOptions = {}
) {
  const { tableId } = options;
  const authStore = useAuthStore();
  const appStore = useAppStore();

  function buildDefaults() {
    return createColumnChecks(createColumns());
  }

  function currentUserId() {
    return String(authStore.userInfo.userId || '').trim();
  }

  function initChecks() {
    const defaults = buildDefaults();
    const userId = currentUserId();
    if (!tableId || !userId) return defaults;
    return mergeColumnChecks(defaults, loadPersisted(userId, tableId));
  }

  const columnChecks = ref(initChecks()) as Ref<TableColumnCheck[]>;

  const columns = computed(() => {
    void appStore.locale;
    return applyColumnChecks(createColumns(), columnChecks.value);
  });

  watch(
    () => authStore.userInfo.userId,
    (userId, prev) => {
      if (!tableId || !userId || userId === prev) return;
      columnChecks.value = mergeColumnChecks(buildDefaults(), loadPersisted(String(userId), tableId));
    }
  );

  watch(
    () => appStore.locale,
    () => {
      const defaults = buildDefaults();
      columnChecks.value = mergeColumnChecks(
        defaults,
        columnChecks.value.map(item => ({
          key: item.key,
          checked: !!item.checked,
          fixed: item.fixed || 'unFixed'
        }))
      );
    }
  );

  watch(
    columnChecks,
    value => {
      const userId = currentUserId();
      if (!tableId || !userId) return;
      savePersisted(userId, tableId, value);
    },
    { deep: true }
  );

  function resetColumnSetting() {
    const userId = currentUserId();
    if (tableId && userId) clearPersisted(userId, tableId);
    columnChecks.value = buildDefaults();
  }

  return {
    columnChecks,
    columns,
    resetColumnSetting
  };
}
