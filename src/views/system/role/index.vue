<script setup lang="ts">
import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue';
import {
  NAlert,
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  NText,
  NTree,
  type DataTableColumns,
  type DataTableRowKey,
  type DataTableSortState,
  type FormRules,
  type SelectOption,
  type TreeOption
} from 'naive-ui';
import {
  batchDeleteRoles,
  createRole,
  deleteRole,
  fetchPermissionCatalog,
  fetchRolePermissions,
  fetchRoles,
  patchRole,
  setRolePermissions,
  type AdminRole,
  type CatalogPerm
} from '@/service/api';
import { renderTableAction, renderTableActions } from '@/components/common/table-action';
import { resolveTableScrollX } from '@/components/common/table-pagination';
import { useAdminListQuery } from '@/hooks/common/admin-list-query';
import { useColumnSetting } from '@/hooks/common/column-setting';
import { $t } from '@/locales';
import { cellText } from '@/utils/cell-text';
import { formatDateTime } from '@/utils/datetime';
import { allPermissionCodes, buildPermissionTree, leafPermissionKeys } from './perm-tree';

defineOptions({ name: 'SystemRole' });

const loading = ref(false);
const saving = ref(false);
const batchBusy = ref(false);
const items = ref<AdminRole[]>([]);
const catalog = ref<CatalogPerm[]>([]);
const checkedKeys = ref<DataTableRowKey[]>([]);
const statusFilter = ref<'all' | 'builtin' | 'custom'>('all');

const {
  keyword,
  pagination,
  columnSortOrder,
  apiSortBy,
  apiSortOrder,
  applySorter,
  pageItems: makePageItems,
  tablePagination: makeTablePagination,
  clampPage,
  watchKeyword
} = useAdminListQuery();

const pageItems = makePageItems(items);
const tablePagination = makeTablePagination(() => items.value.length);

const statusOptions: SelectOption[] = [
  { label: '全部类型', value: 'all' },
  { label: '内置', value: 'builtin' },
  { label: '自定义', value: 'custom' }
];

const modalShow = ref(false);
const modalMode = ref<'create' | 'edit' | 'perms'>('create');
const editing = ref<AdminRole | null>(null);
const permTreeExpanded = ref<Array<string | number>>([]);
/** 强制权限树在打开时重新挂载，避免弹窗内高度/滚动错乱 */
const permTreeKey = ref(0);

const form = reactive({
  code: '',
  name: '',
  scope_kind: 'platform',
  scope_id: '',
  permissions: [] as string[]
});

const scopeOptions = [
  { label: 'platform', value: 'platform' },
  { label: 'provider', value: 'provider' }
];

const modalTitle = computed(() => {
  if (modalMode.value === 'create') return '新建角色';
  if (modalMode.value === 'edit') return `编辑角色 · ${editing.value?.code || ''}`;
  return `权限配置 · ${editing.value?.code || ''}`;
});

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {};
  if (modalMode.value === 'create') {
    rules.code = [{ required: true, message: '请输入角色代码', trigger: ['blur', 'input'] }];
    rules.name = [{ required: true, message: '请输入名称', trigger: ['blur', 'input'] }];
  } else if (modalMode.value === 'edit') {
    rules.name = [{ required: true, message: '请输入名称', trigger: ['blur', 'input'] }];
  }
  return rules;
});

const permTree = computed<TreeOption[]>(() => buildPermissionTree(catalog.value));
const selectedIds = computed(() => checkedKeys.value.map(Number));
const hasSelection = computed(() => selectedIds.value.length > 0);

const checkedPermKeys = computed({
  get: () => form.permissions as Array<string | number>,
  set: (keys: Array<string | number>) => {
    form.permissions = leafPermissionKeys(keys, catalog.value);
  }
});

function createBaseColumns(): DataTableColumns<AdminRole> {
  return [
    { type: 'selection', fixed: 'left', width: 48 },
    {
      title: $t('field.id'),
      key: 'id',
      width: 70,
      fixed: 'left',
      sorter: true,
      sortOrder: columnSortOrder('id')
    },
    {
      title: $t('field.code'),
      key: 'code',
      width: 160,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('code'),
      render: row => cellText(row.code)
    },
    {
      title: $t('field.name'),
      key: 'name',
      minWidth: 120,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('name'),
      render: row => cellText(row.name)
    },
    {
      title: $t('field.scope'),
      key: 'scope_kind',
      width: 100,
      sorter: true,
      sortOrder: columnSortOrder('scope_kind'),
      render: row => cellText(row.scope_kind)
    },
    {
      title: $t('field.scopeId'),
      key: 'scope_id',
      width: 120,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('scope_id'),
      render: row => cellText(row.scope_id)
    },
    {
      title: '内置',
      key: 'builtin',
      width: 80,
      sorter: true,
      sortOrder: columnSortOrder('builtin'),
      render: row =>
        h(NTag, { size: 'small', type: row.builtin ? 'info' : 'default', bordered: false }, {
          default: () => (row.builtin ? '是' : '否')
        })
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 178,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('created_at'),
      render: row => formatDateTime(row.created_at)
    },
    {
      title: '更新时间',
      key: 'updated_at',
      width: 178,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('updated_at'),
      render: row => formatDateTime(row.updated_at)
    },
    {
      title: '操作',
      key: 'actions',
      width: 168,
      fixed: 'right',
      render: row => {
        const actions = [
          renderTableAction({
            label: '编辑',
            icon: 'mdi:pencil-outline',
            onClick: () => openEdit(row)
          }),
          renderTableAction({
            label: '权限',
            icon: 'mdi:key-variant',
            onClick: () => openPerms(row)
          })
        ];
        if (row.builtin) {
          actions.push(
            renderTableAction({
              label: '删除',
              icon: 'mdi:delete-outline',
              type: 'error',
              disabled: true
            })
          );
        } else {
          actions.push(
            h(
              NPopconfirm,
              { onPositiveClick: () => remove(row) },
              {
                trigger: () =>
                  renderTableAction({
                    label: '删除',
                    icon: 'mdi:delete-outline',
                    type: 'error'
                  }),
                default: () => `确认删除角色 ${row.code}？`
              }
            )
          );
        }
        return renderTableActions(actions);
      }
    }
  ];
}

const { columnChecks, columns } = useColumnSetting<AdminRole>(createBaseColumns, { tableId: 'system.role' });
const tableScrollX = computed(() => resolveTableScrollX(columns.value));

function collectExpandKeys(nodes: TreeOption[], out: Array<string | number>) {
  for (const n of nodes) {
    if (n.children?.length) {
      out.push(n.key as string | number);
      collectExpandKeys(n.children, out);
    }
  }
}

const allPermExpandKeys = computed(() => {
  const keys: Array<string | number> = [];
  collectExpandKeys(permTree.value, keys);
  return keys;
});

const permsExpanded = computed(() => {
  const all = allPermExpandKeys.value;
  if (!all.length) return false;
  const set = new Set(permTreeExpanded.value.map(String));
  return all.every(k => set.has(String(k)));
});

const permsAllSelected = computed(
  () => catalog.value.length > 0 && form.permissions.length >= catalog.value.length
);

function expandAllPerms() {
  permTreeExpanded.value = [...allPermExpandKeys.value];
}

function collapseAllPerms() {
  permTreeExpanded.value = [];
}

function toggleExpandPerms() {
  if (permsExpanded.value) collapseAllPerms();
  else expandAllPerms();
}

function selectAllPerms() {
  form.permissions = allPermissionCodes(catalog.value);
}

function clearAllPerms() {
  form.permissions = [];
}

function toggleSelectAllPerms() {
  if (permsAllSelected.value) clearAllPerms();
  else selectAllPerms();
}

function resetForm() {
  form.code = '';
  form.name = '';
  form.scope_kind = 'platform';
  form.scope_id = '';
  form.permissions = [];
  permTreeExpanded.value = [];
}

function openCreate() {
  editing.value = null;
  modalMode.value = 'create';
  resetForm();
  modalShow.value = true;
}

function openEdit(row: AdminRole) {
  editing.value = row;
  modalMode.value = 'edit';
  form.code = row.code;
  form.name = row.name;
  form.scope_kind = row.scope_kind || 'platform';
  form.scope_id = row.scope_id || '';
  modalShow.value = true;
}

async function openPerms(row: AdminRole) {
  editing.value = row;
  modalMode.value = 'perms';
  form.permissions = [];
  permTreeExpanded.value = [];
  permTreeKey.value += 1;
  modalShow.value = true;

  if (!catalog.value.length) {
    await loadCatalog();
  }
  await nextTick();
  expandAllPerms();

  const { data, error } = await fetchRolePermissions(row.id);
  if (error) return;
  form.permissions = data?.permissions || [];
}

function resetFilters() {
  keyword.value = '';
  statusFilter.value = 'all';
  pagination.page = 1;
  void loadRoles();
}

async function loadRoles() {
  loading.value = true;
  const { data, error } = await fetchRoles({
    q: keyword.value,
    status: statusFilter.value,
    sort_by: apiSortBy(),
    sort_order: apiSortOrder()
  });
  loading.value = false;
  if (error) return;
  items.value = data?.items || [];
  const idSet = new Set(items.value.map(item => item.id));
  checkedKeys.value = checkedKeys.value.filter(key => idSet.has(Number(key)));
  clampPage(items.value.length);
}

async function loadCatalog() {
  const { data, error } = await fetchPermissionCatalog();
  if (error) return;
  catalog.value = data?.items || [];
  if (!catalog.value.length) {
    window.$message?.warning('权限目录为空，请检查 /permissions 接口');
  }
}

async function load() {
  await Promise.all([loadRoles(), loadCatalog()]);
}

function onUpdateSorter(sorter: DataTableSortState | DataTableSortState[] | null) {
  applySorter(sorter);
  void loadRoles();
}

async function remove(row: AdminRole) {
  const { error } = await deleteRole(row.id);
  if (error) return;
  window.$message?.success(`已删除角色${row.code}`);
  await loadRoles();
}

async function batchRemove() {
  if (!hasSelection.value) return;
  batchBusy.value = true;
  const ids = [...selectedIds.value];
  const { data, error } = await batchDeleteRoles(ids);
  batchBusy.value = false;
  if (error) return;
  window.$message?.success(`已删除${data?.deleted ?? ids.length} 个角色`);
  checkedKeys.value = [];
  await loadRoles();
}

async function submit() {
  saving.value = true;
  let error: Error | null = null;
  let successMsg = '';

  if (modalMode.value === 'create') {
    ({ error } = await createRole({
      code: form.code.trim(),
      name: form.name.trim(),
      scope_kind: form.scope_kind,
      scope_id: form.scope_id.trim()
    }));
    if (!error) successMsg = '角色已创建';
  } else if (modalMode.value === 'edit' && editing.value) {
    ({ error } = await patchRole(editing.value.id, {
      name: form.name.trim(),
      scope_kind: form.scope_kind,
      scope_id: form.scope_id.trim()
    }));
    if (!error) successMsg = '角色已更新';
  } else if (modalMode.value === 'perms' && editing.value) {
    ({ error } = await setRolePermissions(editing.value.id, form.permissions));
    if (!error) successMsg = '权限已保存';
  }

  saving.value = false;
  if (error) return;
  if (successMsg) window.$message?.success(successMsg);
  modalShow.value = false;
  await loadRoles();
}

watchKeyword(() => {
  void loadRoles();
});

watch(statusFilter, () => {
  pagination.page = 1;
  void loadRoles();
});

onMounted(load);
</script>

<template>
  <div class="h-full min-h-0 flex-col-stretch overflow-hidden">
    <AdminListPage title="角色管理">
      <template #filters>
        <NSpace :size="12" align="center" wrap>
          <NInput
            v-model:value="keyword"
            clearable
            class="w-260px"
            placeholder="搜索角色代码 / 名称"
          >
            <template #prefix>
              <SvgIcon icon="mdi:magnify" class="text-icon" />
            </template>
          </NInput>
          <NSelect
            v-model:value="statusFilter"
            class="w-132px"
            :options="statusOptions"
            :consistent-menu-width="false"
          />
          <NButton @click="resetFilters">重置</NButton>
        </NSpace>
      </template>

      <template #actions>
        <NButton v-auth="'platform.role.manage'" type="primary" @click="openCreate">
          <template #icon>
            <SvgIcon icon="mdi:plus" />
          </template>
          新建角色
        </NButton>
        <TableToolGroup v-model:columns="columnChecks" :loading="loading" @refresh="load" />
      </template>

      <AdminTableWrap v-slot="{ maxHeight }">
        <TableSelectionBar
          v-auth="'platform.role.manage'"
          :count="selectedIds.length"
          @clear="checkedKeys = []"
        >
          <NPopconfirm @positive-click="batchRemove">
            <template #trigger>
              <NButton text type="error" :loading="batchBusy">
                <template #icon>
                  <SvgIcon icon="mdi:delete-outline" />
                </template>
                批量删除
              </NButton>
            </template>
            确认删除选中的 {{ selectedIds.length }} 个角色？内置角色将被跳过。
          </NPopconfirm>
        </TableSelectionBar>
        <NDataTable
          v-model:checked-row-keys="checkedKeys"
          remote
          size="small"
          :loading="loading"
          :columns="columns"
          :data="pageItems"
          :pagination="tablePagination"
          :max-height="maxHeight"
          :scroll-x="tableScrollX"
          :row-key="row => row.id"
          @update:sorter="onUpdateSorter"
        />
      </AdminTableWrap>
    </AdminListPage>

    <NModal
      v-model:show="modalShow"
      preset="card"
      :title="modalTitle"
      :class="modalMode === 'perms' ? 'w-680px' : 'w-520px'"
      :mask-closable="!saving"
      @after-leave="resetForm"
    >
      <NForm v-if="modalMode !== 'perms'" label-placement="left" label-width="96" :model="form" :rules="formRules">
        <NFormItem v-if="modalMode === 'create'" path="code" :label="$t('field.code')">
          <NInput v-model:value="form.code" :placeholder="$t('form.roleCodePlaceholder')" />
        </NFormItem>
        <NFormItem path="name" :label="$t('field.name')">
          <NInput v-model:value="form.name" :placeholder="$t('form.roleNamePlaceholder')" />
        </NFormItem>
        <NFormItem :label="$t('field.scope')">
          <NSelect
            v-model:value="form.scope_kind"
            :options="scopeOptions"
            :disabled="editing?.builtin && editing?.code === 'platform_super'"
          />
        </NFormItem>
        <NFormItem :label="$t('field.scopeId')">
          <NInput
            v-model:value="form.scope_id"
            :placeholder="$t('form.scopeIdPlaceholder')"
            :disabled="editing?.builtin && editing?.code === 'platform_super'"
          />
        </NFormItem>
      </NForm>

      <div v-else class="perm-config">
        <NAlert class="mb-10px" type="info" :bordered="false">
          按作用域 / 资源树勾选；勾选父节点会级联子权限。保存时仅提交真实权限码。
        </NAlert>
        <div class="mb-10px flex items-center justify-between gap-12px">
          <div class="flex shrink-0 items-center gap-6px">
            <NButton size="tiny" secondary :disabled="!permTree.length" @click="toggleExpandPerms">
              <template #icon>
                <SvgIcon :icon="permsExpanded ? 'mdi:arrow-collapse-vertical' : 'mdi:arrow-expand-vertical'" />
              </template>
              {{ permsExpanded ? '折叠' : '展开' }}
            </NButton>
            <NButton size="tiny" secondary :disabled="!catalog.length" @click="toggleSelectAllPerms">
              <template #icon>
                <SvgIcon
                  :icon="permsAllSelected ? 'mdi:checkbox-multiple-blank-outline' : 'mdi:checkbox-multiple-marked-outline'"
                />
              </template>
              {{ permsAllSelected ? '全不选' : '全选' }}
            </NButton>
          </div>
          <NText depth="3" class="shrink-0 text-12px">
            已选 {{ form.permissions.length }} / {{ catalog.length }}
          </NText>
        </div>
        <div class="perm-tree-box h-420px w-full overflow-y-auto rounded-8px border border-[var(--n-border-color)] p-8px">
          <NTree
            v-if="permTree.length"
            :key="permTreeKey"
            v-model:checked-keys="checkedPermKeys"
            v-model:expanded-keys="permTreeExpanded"
            class="w-full"
            block-line
            checkable
            cascade
            check-strategy="child"
            expand-on-click
            :animated="false"
            :selectable="false"
            :data="permTree"
          />
          <div v-else class="flex h-full items-center justify-center text-13px opacity-45">
            暂无权限目录，请刷新后重试
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="modalShow = false">取消</NButton>
          <NButton v-auth="'platform.role.manage'" type="primary" :loading="saving" @click="submit">确定</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

