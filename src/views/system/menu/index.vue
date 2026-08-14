<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NScrollbar,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  type DataTableColumns,
  type FormRules,
  type SelectOption
} from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { views } from '@/router/elegant/imports';
import {
  createMenu,
  deleteMenu,
  fetchMenus,
  patchMenu,
  reorderMenus,
  type AdminMenu,
  type MenuOrderItem
} from '@/service/api';
import { useColumnSetting } from '@/hooks/common/column-setting';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import IconSelect from '@/components/common/icon-select.vue';
import MenuTreeNodes, { type MenuTreeNode } from './menu-tree-nodes.vue';

defineOptions({ name: 'SystemMenu' });

const loading = ref(false);
const saving = ref(false);
const reordering = ref(false);
const items = ref<AdminMenu[]>([]);
const tree = ref<MenuTreeNode[]>([]);
const expanded = ref<Set<number>>(new Set());
const keyword = ref('');
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all');

type MenuColKey = 'title' | 'route_name' | 'status' | 'created_at' | 'updated_at' | 'actions';

const MENU_COL_GRID: Record<MenuColKey, string> = {
  title: 'minmax(120px, 2fr)',
  route_name: 'minmax(100px, 1.2fr)',
  status: 'minmax(72px, 0.5fr)',
  created_at: '158px',
  updated_at: '158px',
  actions: '168px'
};

function createBaseColumns(): DataTableColumns<AdminMenu> {
  return [
    { title: $t('field.title'), key: 'title' },
    { title: $t('field.routeName'), key: 'route_name' },
    { title: $t('field.status'), key: 'status' },
    { title: $t('field.createdAt'), key: 'created_at' },
    { title: $t('field.updatedAt'), key: 'updated_at' },
    { title: $t('common.action'), key: 'actions' }
  ];
}

const { columnChecks, columns: visibleMenuColumns } = useColumnSetting<AdminMenu>(createBaseColumns, {
  tableId: 'system.menu'
});

const visibleColKeys = computed(() => {
  const keys = new Set<MenuColKey>();
  for (const col of visibleMenuColumns.value) {
    if ('key' in col && col.key) keys.add(String(col.key) as MenuColKey);
  }
  return keys;
});

function colVisible(key: MenuColKey) {
  return visibleColKeys.value.has(key);
}

const menuTreeCols = computed(() => {
  const parts = ['36px'];
  (Object.keys(MENU_COL_GRID) as MenuColKey[]).forEach(key => {
    if (colVisible(key)) parts.push(MENU_COL_GRID[key]);
  });
  return parts.join(' ');
});

const menuTreeMinWidth = computed(() => {
  let w = 36 + 8 * 6;
  if (colVisible('title')) w += 120;
  if (colVisible('route_name')) w += 100;
  if (colVisible('status')) w += 72;
  if (colVisible('created_at')) w += 158;
  if (colVisible('updated_at')) w += 158;
  if (colVisible('actions')) w += 168;
  return Math.max(w, 480);
});

const statusFilterOptions: SelectOption[] = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
];

const isFiltering = computed(() => Boolean(keyword.value.trim()) || statusFilter.value !== 'all');

const modalShow = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const editing = ref<AdminMenu | null>(null);

const form = reactive({
  parent_id: null as number | null,
  route_name: '',
  path: '',
  component: 'view.iframe-page',
  icon: '',
  order_no: 0,
  hide_in_menu: false,
  permission_code: '',
  status: 'enabled',
  title: ''
});

const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
];

/** Common components: layout shell + generated views; tag select allows custom input. */
const componentOptions = computed<SelectOption[]>(() => {
  const opts: SelectOption[] = [
    { label: 'layout.base（顶层目录壳）', value: 'layout.base' },
    { label: 'layout.blank', value: 'layout.blank' }
  ];
  const skip = new Set(['403', '404', '500', 'login']);
  for (const key of Object.keys(views).sort()) {
    if (skip.has(key)) continue;
    opts.push({ label: `view.${key}`, value: `view.${key}` });
  }
  // Keep current form value visible even if custom / not in catalog
  const cur = form.component?.trim();
  if (cur && !opts.some(o => o.value === cur)) {
    opts.unshift({ label: cur, value: cur });
  }
  return opts;
});

const modalTitle = computed(() =>
  modalMode.value === 'create' ? '新建菜单' : `编辑菜单 · ${editing.value?.route_name || ''}`
);

const formRules: FormRules = {
  route_name: [{ required: true, message: '请输入路由名', trigger: ['blur', 'input'] }],
  title: [{ required: true, message: '请输入标题', trigger: ['blur', 'input'] }]
};

function buildTree(list: AdminMenu[]): MenuTreeNode[] {
  const map = new Map<number, MenuTreeNode>();
  for (const m of list) {
    map.set(m.id, { ...m, children: [] });
  }
  const roots: MenuTreeNode[] = [];
  for (const m of list) {
    const node = map.get(m.id)!;
    if (m.parent_id != null && map.has(m.parent_id)) {
      map.get(m.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: MenuTreeNode[]) => {
    nodes.sort((a, b) => a.order_no - b.order_no || a.id - b.id);
    nodes.forEach(n => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function nodeTextMatch(n: MenuTreeNode, needle: string) {
  if (!needle) return true;
  const hay = [n.title, n.route_name, n.path, n.permission_code, n.component]
    .map(s => String(s || '').toLowerCase())
    .join('\n');
  return hay.includes(needle);
}

/** Keep ancestors of hits; filter on full ListAll tree (not fake data). */
function filterTree(nodes: MenuTreeNode[], needle: string, status: string): MenuTreeNode[] {
  const out: MenuTreeNode[] = [];
  for (const n of nodes) {
    const children = filterTree(n.children, needle, status);
    const statusHit = status === 'all' || n.status === status;
    const selfHit = nodeTextMatch(n, needle) && statusHit;
    if (selfHit || children.length) {
      out.push({ ...n, children });
    }
  }
  return out;
}

const displayTree = computed(() => {
  if (!isFiltering.value) return tree.value;
  const needle = keyword.value.trim().toLowerCase();
  return filterTree(tree.value, needle, statusFilter.value);
});

function collectExpandIds(nodes: MenuTreeNode[], out: Set<number>) {
  for (const n of nodes) {
    if (n.children.length) {
      out.add(n.id);
      collectExpandIds(n.children, out);
    }
  }
}

function resetFilters() {
  keyword.value = '';
  statusFilter.value = 'all';
}

watch([keyword, statusFilter, tree], () => {
  if (!isFiltering.value) return;
  const ids = new Set<number>();
  collectExpandIds(displayTree.value, ids);
  expanded.value = ids;
});

function onDisplayTreeUpdate(value: MenuTreeNode[]) {
  if (isFiltering.value) return;
  tree.value = value;
}

function collectOrders(nodes: MenuTreeNode[], parentId: number | null, out: MenuOrderItem[]) {
  nodes.forEach((n, idx) => {
    out.push({ id: n.id, parent_id: parentId, order_no: idx + 1 });
    if (n.children.length) collectOrders(n.children, n.id, out);
  });
}

function descendantIds(node: MenuTreeNode, out: Set<number>) {
  out.add(node.id);
  node.children.forEach(c => descendantIds(c, out));
}

function findNode(nodes: MenuTreeNode[], id: number): MenuTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

const parentOptions = computed<SelectOption[]>(() => {
  const blocked = new Set<number>();
  if (editing.value) {
    const node = findNode(tree.value, editing.value.id);
    if (node) descendantIds(node, blocked);
  }
  // Flat list (no indent / tree-select): icon + title, route_name for search.
  return items.value
    .filter(m => !blocked.has(m.id))
    .map(m => ({
      label: m.title || m.route_name,
      value: m.id,
      route_name: m.route_name,
      icon: m.icon
    }));
});

function renderParentLabel(option: SelectOption) {
  const icon = String(option.icon || '');
  const label = String(option.label || '');
  const routeName = String(option.route_name || '');
  return h('span', { class: 'menu-parent-opt' }, [
    icon ? h(SvgIcon, { icon, class: 'menu-parent-opt__icon' }) : h('span', { class: 'menu-parent-opt__icon' }),
    h('span', { class: 'menu-parent-opt__text' }, [
      h('span', label),
      routeName && routeName !== label ? h('span', { class: 'menu-parent-opt__route' }, routeName) : null
    ])
  ]);
}
function toggleExpand(id: number) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function resetForm() {
  form.parent_id = null;
  form.route_name = '';
  form.path = '';
  form.component = 'view.iframe-page';
  form.icon = '';
  form.order_no = 0;
  form.hide_in_menu = false;
  form.permission_code = '';
  form.status = 'enabled';
  form.title = '';
}

function openCreate(parentId: number | null = null) {
  editing.value = null;
  modalMode.value = 'create';
  resetForm();
  form.parent_id = parentId;
  modalShow.value = true;
}

function openEdit(row: AdminMenu) {
  editing.value = row;
  modalMode.value = 'edit';
  form.parent_id = row.parent_id ?? null;
  form.route_name = row.route_name;
  form.path = row.path || '';
  form.component = row.component || '';
  form.icon = row.icon || '';
  form.order_no = row.order_no ?? 0;
  form.hide_in_menu = !!row.hide_in_menu;
  form.permission_code = row.permission_code || '';
  form.status = row.status || 'enabled';
  form.title = row.title || '';
  modalShow.value = true;
}

function bodyFromForm() {
  return {
    parent_id: form.parent_id,
    route_name: form.route_name.trim(),
    path: form.path.trim(),
    component: form.component.trim(),
    icon: form.icon.trim(),
    order_no: Number(form.order_no) || 0,
    hide_in_menu: form.hide_in_menu,
    permission_code: form.permission_code.trim(),
    status: form.status,
    title: form.title.trim()
  };
}

async function load() {
  loading.value = true;
  const { data, error } = await fetchMenus();
  loading.value = false;
  if (error) return;
  items.value = data?.items || [];
  tree.value = buildTree(items.value);
  expanded.value = new Set();
}

async function persistOrder() {
  if (isFiltering.value) return;
  const payload: MenuOrderItem[] = [];
  collectOrders(tree.value, null, payload);
  reordering.value = true;
  const { error } = await reorderMenus(payload);
  reordering.value = false;
  if (error) {
    await load();
    return;
  }
  window.$message?.success('排序已保存');
  const byId = new Map(payload.map(p => [p.id, p]));
  items.value = items.value.map(m => {
    const p = byId.get(m.id);
    return p ? { ...m, parent_id: p.parent_id, order_no: p.order_no } : m;
  });
  tree.value = buildTree(items.value);
}

async function remove(row: AdminMenu) {
  const { error } = await deleteMenu(row.id);
  if (error) return;
  window.$message?.success(`已删除菜单 ${row.route_name}`);
  await load();
}

const { formRef, validate } = useNaiveForm();

async function submit() {
  try {
    await validate();
  } catch {
    return;
  }

  saving.value = true;
  let error: Error | null = null;
  let successMsg = '';
  const body = bodyFromForm();

  if (modalMode.value === 'create') {
    ({ error } = await createMenu(body));
    if (!error) successMsg = '菜单已创建';
  } else if (editing.value) {
    ({ error } = await patchMenu(editing.value.id, body));
    if (!error) successMsg = '菜单已更新';
  }

  saving.value = false;
  if (error) return;
  if (successMsg) window.$message?.success(successMsg);
  modalShow.value = false;
  await load();
}

onMounted(load);
</script>

<template>
  <div class="h-full min-h-0 flex-col-stretch overflow-hidden">
    <AdminListPage
      title="菜单管理"
      description="维护控制台侧栏与动态路由。侧栏文案取自「标题」（不用 i18n）；路由名仅作程序标识，顶层填 view.xxx 会自动挂到基础布局。改树或标题后需重新登录才会生效。"
    >
      <template #filters>
        <NSpace :size="12" align="center" wrap>
          <NInput v-model:value="keyword" clearable class="w-280px" placeholder="搜索标题 / 路由名 / 路径">
            <template #prefix>
              <SvgIcon icon="mdi:magnify" class="text-icon" />
            </template>
          </NInput>
          <NSelect
            v-model:value="statusFilter"
            class="w-132px"
            :options="statusFilterOptions"
            :consistent-menu-width="false"
          />
          <NButton @click="resetFilters">重置</NButton>
        </NSpace>
      </template>

      <template #actions>
        <NButton v-auth="'platform.menu.manage'" type="primary" @click="openCreate(null)">
          <template #icon>
            <SvgIcon icon="mdi:plus" />
          </template>
          新建菜单
        </NButton>
        <TableToolGroup v-model:columns="columnChecks" :loading="loading || reordering" @refresh="load" />
      </template>

      <AdminTableWrap v-slot="{ maxHeight }" :bottom-reserve="0">
        <NSpin :show="loading || reordering" class="menu-tree-spin">
          <div
            class="menu-tree"
            :style="{
              '--menu-tree-cols': menuTreeCols,
              minWidth: `${menuTreeMinWidth}px`
            }"
          >
            <div class="menu-tree__head">
              <span class="menu-tree__col menu-tree__col--handle" />
              <span v-if="colVisible('title')" class="menu-tree__col menu-tree__col--title">
                <span class="menu-tree__expand-spacer" />
                {{ $t('field.title') }}
              </span>
              <span v-if="colVisible('route_name')" class="menu-tree__col menu-tree__col--route">
                {{ $t('field.routeName') }}
              </span>
              <span v-if="colVisible('status')" class="menu-tree__col menu-tree__col--status">
                {{ $t('field.status') }}
              </span>
              <span v-if="colVisible('created_at')" class="menu-tree__col menu-tree__col--time">
                {{ $t('field.createdAt') }}
              </span>
              <span v-if="colVisible('updated_at')" class="menu-tree__col menu-tree__col--time">
                {{ $t('field.updatedAt') }}
              </span>
              <span v-if="colVisible('actions')" class="menu-tree__col menu-tree__col--actions">
                {{ $t('common.action') }}
              </span>
            </div>

            <NScrollbar class="menu-tree__scroll" :style="{ maxHeight: `${maxHeight}px` }">
              <MenuTreeNodes
                v-if="displayTree.length"
                :model-value="displayTree"
                :depth="0"
                :expanded="expanded"
                :disabled="isFiltering"
                :visible-cols="visibleColKeys"
                @update:model-value="onDisplayTreeUpdate"
                @drag-end="persistOrder"
                @toggle="toggleExpand"
                @create-child="openCreate"
                @edit="openEdit"
                @remove="remove"
              />
              <div
                v-else-if="!loading"
                class="menu-tree__empty"
                role="status"
                :style="{ minWidth: `${menuTreeMinWidth}px` }"
              >
                {{ isFiltering ? '无匹配菜单' : '暂无菜单' }}
              </div>
            </NScrollbar>
          </div>
        </NSpin>
      </AdminTableWrap>
    </AdminListPage>

    <NModal
      v-model:show="modalShow"
      preset="card"
      :title="modalTitle"
      class="w-560px"
      :mask-closable="!saving"
      @after-leave="resetForm"
    >
      <NForm ref="formRef" label-placement="left" label-width="100" :model="form" :rules="formRules">
        <NFormItem :label="$t('field.parentMenu')">
          <NSelect
            v-model:value="form.parent_id"
            clearable
            filterable
            :options="parentOptions"
            :render-label="renderParentLabel"
            placeholder="空=根菜单"
          />
        </NFormItem>
        <NFormItem path="route_name" :label="$t('field.routeName')">
          <NInput v-model:value="form.route_name" placeholder="唯一 route name" />
        </NFormItem>
        <NFormItem path="title" :label="$t('field.title')">
          <NInput v-model:value="form.title" placeholder="侧栏/页签实际显示的名字" />
        </NFormItem>
        <NFormItem :label="$t('field.path')">
          <NInput v-model:value="form.path" placeholder="/system/user" />
        </NFormItem>
        <NFormItem :label="$t('field.component')">
          <NSelect
            v-model:value="form.component"
            filterable
            tag
            clearable
            :options="componentOptions"
            placeholder="下拉选择或直接输入，如 view.overview"
          />
        </NFormItem>
        <NFormItem :label="$t('field.icon')">
          <IconSelect v-model="form.icon" placeholder="点击选择或输入，如 mdi:account" />
        </NFormItem>
        <NFormItem :label="$t('field.permissionCode')">
          <NInput v-model:value="form.permission_code" placeholder="platform.user.manage" />
        </NFormItem>
        <NFormItem :label="$t('field.orderNo')">
          <NInputNumber v-model:value="form.order_no" class="w-full" :min="0" />
        </NFormItem>
        <NFormItem :label="$t('field.status')">
          <NSelect v-model:value="form.status" :options="statusOptions" />
        </NFormItem>
        <NFormItem :label="$t('field.hideInMenu')">
          <NSwitch v-model:value="form.hide_in_menu" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="modalShow = false">取消</NButton>
          <NButton v-auth="'platform.menu.manage'" type="primary" :loading="saving" @click="submit">确定</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.menu-tree-spin {
  width: 100%;
}

.menu-tree-spin :deep(.n-spin-container),
.menu-tree-spin :deep(.n-spin-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
}

.menu-tree {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  border: 1px solid #efeff5;
  border-radius: 8px;
  /* Avoid var(--n-color): outside Naive components it inherits Vite brand #646cff. */
  background: #fff;
  color: #333639;
}

.menu-tree__scroll {
  flex: 0 1 auto;
  min-height: 0;
}

.menu-tree :deep(.menu-tree__head),
.menu-tree :deep(.menu-tree__row) {
  /* 每行独立 grid：末列不能用 auto，否则表头窄、行内操作宽 → 整表错位 */
  display: grid;
  grid-template-columns: var(--menu-tree-cols);
  align-items: center;
  justify-items: stretch;
  gap: 8px;
  width: 100%;
  min-width: inherit;
  box-sizing: border-box;
  padding: 8px 12px;
  text-align: left;
}

.menu-tree__head {
  flex: 0 0 auto;
  background: #fafafc;
  color: #9898a8;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid #efeff5;
}

.menu-tree__empty {
  padding: 40px 12px;
  text-align: center;
  color: #9898a8;
  font-size: 13px;
  box-sizing: border-box;
}

.menu-tree :deep(.menu-tree__row) {
  border-bottom: 1px solid #efeff5;
  background: #fff;
  color: #333639;
  font-size: 13px;
}

.menu-tree :deep(.menu-tree__row:hover) {
  background: #f5f5f7;
}

.menu-tree :deep(.menu-tree__chosen),
.menu-tree :deep(.menu-tree__ghost),
.menu-tree :deep(.menu-tree__drag) {
  background: transparent !important;
}

.menu-tree :deep(.menu-tree__chosen > .menu-tree__row),
.menu-tree :deep(.menu-tree__ghost > .menu-tree__row) {
  background: #f0f0f5;
  outline: 1px dashed #d0d0d8;
}

.menu-tree :deep(.menu-tree__drag > .menu-tree__row) {
  background: #fff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  opacity: 0.95;
}

/* grid 默认 min-width:auto 会撑破列宽并叠到邻列；强制裁切 + 省略 */
.menu-tree :deep(.menu-tree__col) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.menu-tree :deep(.menu-tree__col--route),
.menu-tree :deep(.menu-tree__col--time) {
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.menu-tree :deep(.menu-tree__col--actions) {
  overflow: visible;
}

.menu-tree :deep(.menu-tree__col--title) {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.menu-tree :deep(.menu-tree__title-text) {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.menu-tree :deep(.menu-tree__hide-tag) {
  flex: none;
  margin-left: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.menu-tree :deep(.menu-tree__icon) {
  flex: none;
  width: 18px;
  height: 18px;
  font-size: 18px;
  color: #666;
}

.menu-tree :deep(.menu-tree__icon--empty) {
  display: inline-block;
}

.menu-tree :deep(.menu-tree__handle) {
  cursor: grab;
  border: none;
  background: transparent;
  color: #9898a8;
  letter-spacing: -2px;
  padding: 2px 4px;
  line-height: 1;
  font-size: 14px;
}

.menu-tree :deep(.menu-tree__handle:active) {
  cursor: grabbing;
}

.menu-tree :deep(.menu-tree__expand),
.menu-tree :deep(.menu-tree__expand-spacer) {
  width: 18px;
  height: 18px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.menu-tree :deep(.menu-tree__expand) {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  padding: 0;
  font-size: 18px;
}

.menu-tree :deep(.menu-tree__expand:hover) {
  color: rgb(var(--primary-color));
}

.menu-tree :deep(.menu-tree__list) {
  min-height: 4px;
}
</style>

<style>
.menu-parent-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}

.menu-parent-opt__icon {
  flex: none;
  width: 18px;
  height: 18px;
  font-size: 18px;
  color: #666;
}

.menu-parent-opt__text {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.menu-parent-opt__route {
  color: #9898a8;
  font-size: 12px;
}
</style>
