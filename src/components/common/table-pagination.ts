import type { PaginationProps } from 'naive-ui';

/**
 * Client-side pagination config for admin list tables.
 * Pair with `resolveTablePagination(itemCount, pagination)` so empty tables hide the pager.
 */
export function createTablePagination(overrides: PaginationProps = {}): PaginationProps {
  return {
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    showQuickJumper: true,
    prefix: ({ itemCount }) => `共 ${itemCount ?? 0} 条`,
    ...overrides
  };
}

/** Hide pager when there is no data; keep header via TABLE_SCROLL_X. */
export function resolveTablePagination(
  itemCount: number,
  pagination: PaginationProps
): PaginationProps | false {
  return itemCount > 0 ? pagination : false;
}

/**
 * Pass to NDataTable `:scroll-x` (+ prefer `flex-height` on list pages).
 * Naive UI 在空数据且未开启横向滚动/固定高度时，会用单独 Empty 节点替换整张表（含表头）。
 * 设置 scroll-x 后空态仍保留 thead + 表体「暂无数据」。
 *
 * List pages: use table-owned scroll (`flex-height` + scroll-x), not layout page scroll.
 *
 * Prefer `resolveTableScrollX(columns)` over a hard-coded large number, otherwise
 * hidden/unfixed columns leave a huge blank + unnecessary scrollbar.
 */
export const TABLE_SCROLL_X = 1200;

/** Sum visible column widths for `:scroll-x` (avoids empty flex gaps). */
export function resolveTableScrollX(
  columns: Array<{ width?: number | string; minWidth?: number | string; type?: string }>
): number {
  let sum = 0;
  for (const col of columns) {
    if (typeof col.width === 'number') {
      sum += col.width;
      continue;
    }
    if (typeof col.minWidth === 'number') {
      sum += col.minWidth;
      continue;
    }
    if (col.type === 'selection') {
      sum += 48;
      continue;
    }
    sum += 120;
  }
  return Math.max(sum, 600);
}
