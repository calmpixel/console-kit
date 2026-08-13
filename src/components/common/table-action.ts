import { h, type VNode, type VNodeChild } from 'vue';
import { NSpace } from 'naive-ui';
import TableActionLink from './table-action-link.vue';

export type TableActionType = 'primary' | 'error' | 'default';

export type TableActionOptions = {
  label: string;
  icon: string;
  type?: TableActionType;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
};

/** Gap between row actions — keep tight to avoid action-column whitespace. */
export const TABLE_ACTION_GAP = 6;

/** Render a text+icon row action for NDataTable columns. */
export function renderTableAction(opts: TableActionOptions): VNode {
  return h(TableActionLink, {
    label: opts.label,
    icon: opts.icon,
    type: opts.type ?? 'primary',
    disabled: opts.disabled,
    onClick: opts.onClick
  });
}

/** Wrap row actions with compact spacing (prefer over raw NSpace size 12). */
export function renderTableActions(nodes: VNodeChild[]) {
  return h(
    NSpace,
    { size: TABLE_ACTION_GAP, wrap: false },
    { default: () => nodes }
  );
}
