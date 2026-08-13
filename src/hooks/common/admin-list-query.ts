import { computed, reactive, ref, watch, type Ref } from 'vue';
import type { DataTableSortState, PaginationProps } from 'naive-ui';
import { createTablePagination, resolveTablePagination } from '@/components/common/table-pagination';

export type AdminListSortOrder = 'ascend' | 'descend' | false;

export interface UseAdminListQueryOptions {
  /** API sort field when UI has no active sort highlight. Default `id`. */
  defaultApiSortBy?: string;
  /** API sort order when UI has no active sort. Default `desc`. */
  defaultApiSortOrder?: 'asc' | 'desc';
  keywordDebounceMs?: number;
}

/**
 * Shared list-query state for admin tables: keyword debounce, remote sorter,
 * client page slice of a server-filtered list, and empty-safe pagination.
 *
 * UI default: no sort highlight (`sortBy` empty / `sortOrder` false).
 * API still sends `defaultApiSortBy` + `defaultApiSortOrder` until the user sorts.
 */
export function useAdminListQuery(options: UseAdminListQueryOptions = {}) {
  const defaultApiSortBy = options.defaultApiSortBy ?? 'id';
  const defaultApiSortOrder = options.defaultApiSortOrder ?? 'desc';
  const debounceMs = options.keywordDebounceMs ?? 300;

  const keyword = ref('');
  const sortBy = ref('');
  const sortOrder = ref<AdminListSortOrder>(false);

  const pagination = reactive(
    createTablePagination({
      page: 1,
      onUpdatePage: (page: number) => {
        pagination.page = page;
      },
      onUpdatePageSize: (pageSize: number) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
      }
    })
  );

  function columnSortOrder(key: string): AdminListSortOrder {
    if (!sortBy.value || !sortOrder.value) return false;
    return sortBy.value === key ? sortOrder.value : false;
  }

  function apiSortBy() {
    return sortBy.value || defaultApiSortBy;
  }

  function apiSortOrder(): 'asc' | 'desc' {
    if (sortOrder.value === 'ascend') return 'asc';
    if (sortOrder.value === 'descend') return 'desc';
    return defaultApiSortOrder;
  }

  function applySorter(sorter: DataTableSortState | DataTableSortState[] | null) {
    const active = Array.isArray(sorter) ? sorter.find(item => item.order) || sorter[0] : sorter;
    if (!active?.order || !active.columnKey) {
      sortBy.value = '';
      sortOrder.value = false;
    } else {
      sortBy.value = String(active.columnKey);
      sortOrder.value = active.order;
    }
    pagination.page = 1;
  }

  function pageItems<T>(items: Ref<T[]>) {
    return computed(() => {
      const size = pagination.pageSize || 10;
      const page = pagination.page || 1;
      const start = (page - 1) * size;
      return items.value.slice(start, start + size);
    });
  }

  function tablePagination(itemCount: Ref<number> | (() => number)) {
    return computed((): PaginationProps | false => {
      const count = typeof itemCount === 'function' ? itemCount() : itemCount.value;
      return resolveTablePagination(count, {
        ...pagination,
        itemCount: count
      });
    });
  }

  /** Clamp page after list length changes (e.g. after filter). */
  function clampPage(itemCount: number) {
    const size = pagination.pageSize || 10;
    const maxPage = Math.max(1, Math.ceil(itemCount / size) || 1);
    if ((pagination.page || 1) > maxPage) pagination.page = maxPage;
  }

  function watchKeyword(onChange: () => void) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    watch(keyword, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pagination.page = 1;
        onChange();
      }, debounceMs);
    });
  }

  return {
    keyword,
    sortBy,
    sortOrder,
    pagination,
    columnSortOrder,
    apiSortBy,
    apiSortOrder,
    applySorter,
    pageItems,
    tablePagination,
    clampPage,
    watchKeyword
  };
}
