<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import {
  NAvatar,
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NUpload,
  type DataTableColumns,
  type DataTableRowKey,
  type DataTableSortState,
  type FormRules,
  type SelectOption,
  type UploadCustomRequestOptions,
  type UploadFileInfo
} from 'naive-ui';
import {
  batchDeleteUsers,
  batchDisableUsers,
  createUser,
  deleteUser,
  fetchRoles,
  fetchUsers,
  patchUser,
  resetUserPassword,
  setUserRoles,
  uploadUserAvatar,
  type AdminRole,
  type AdminUser
} from '@/service/api';
import { renderTableAction, renderTableActions } from '@/components/common/table-action';
import { resolveTableScrollX } from '@/components/common/table-pagination';
import { useAdminListQuery } from '@/hooks/common/admin-list-query';
import { useColumnSetting } from '@/hooks/common/column-setting';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { cellText } from '@/utils/cell-text';
import { formatDateTime } from '@/utils/datetime';
import defaultAvatarUrl from '@/assets/svg-icon/avatar.svg?url';

defineOptions({ name: 'SystemUser' });

const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const batchBusy = ref(false);
const items = ref<AdminUser[]>([]);
const roles = ref<AdminRole[]>([]);
const checkedKeys = ref<DataTableRowKey[]>([]);
const statusFilter = ref<'all' | 'active' | 'disabled'>('all');
const pendingAvatarFile = ref<File | null>(null);
const avatarObjectUrl = ref('');

const selfUserId = computed(() => Number(authStore.userInfo.userId) || 0);

function isSelf(row: AdminUser) {
  return selfUserId.value > 0 && row.id === selfUserId.value;
}

function resolveAvatarSrc(avatar?: string | null) {
  const src = (avatar || '').trim();
  return src || defaultAvatarUrl;
}

/** 无自定义头像时用默认 svg；有则走上传地址（与右上角一致） */
function renderUserAvatar(row: Pick<AdminUser, 'avatar'>, size = 18) {
  const avatar = h(NAvatar, {
    size,
    round: true,
    src: resolveAvatarSrc(row.avatar),
    fallbackSrc: defaultAvatarUrl,
    style: { flexShrink: 0, background: 'transparent' }
  });

  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
      }
    },
    [avatar]
  );
}

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
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'active' },
  { label: '禁用', value: 'disabled' }
];

const modalShow = ref(false);
const modalMode = ref<'create' | 'edit' | 'roles' | 'password'>('create');
const editing = ref<AdminUser | null>(null);

const form = reactive({
  username: '',
  password: '',
  display_name: '',
  avatar: '',
  disabled: false,
  role_ids: [] as number[]
});

const roleOptions = computed(() => roles.value.map(r => ({ label: `${r.name} (${r.code})`, value: r.id })));
const selectedIds = computed(() => checkedKeys.value.map(Number));

const avatarPreviewSrc = computed(() => resolveAvatarSrc(form.avatar));
const canClearAvatar = computed(() => Boolean(pendingAvatarFile.value || (form.avatar || '').trim()));

const modalTitle = computed(() => {
  switch (modalMode.value) {
    case 'create':
      return '新建用户';
    case 'edit':
      return `编辑用户 · ${editing.value?.username || ''}`;
    case 'roles':
      return `分配角色 · ${editing.value?.username || ''}`;
    case 'password':
      return `重置密码 · ${editing.value?.username || ''}`;
    default:
      return '';
  }
});

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {};
  if (modalMode.value === 'create') {
    rules.username = [{ required: true, message: '请输入用户名', trigger: ['blur', 'input'] }];
    rules.password = [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }];
  } else if (modalMode.value === 'edit') {
    rules.username = [{ required: true, message: '请输入用户名', trigger: ['blur', 'input'] }];
  } else if (modalMode.value === 'password') {
    rules.password = [{ required: true, message: '请输入新密码', trigger: ['blur', 'input'] }];
  }
  return rules;
});

function roleNames(ids: number[] | undefined) {
  if (!ids?.length) return '-';
  const map = new Map(roles.value.map(r => [r.id, r.name || r.code]));
  return ids.map(id => map.get(id) || `#${id}`).join(', ');
}

function resetFilters() {
  keyword.value = '';
  statusFilter.value = 'all';
  pagination.page = 1;
  void loadUsers();
}

function createBaseColumns(): DataTableColumns<AdminUser> {
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
      title: $t('field.avatar'),
      key: 'avatar',
      width: 52,
      align: 'center',
      render: row => renderUserAvatar(row, 18)
    },
    {
      title: '用户名',
      key: 'username',
      width: 140,
      minWidth: 100,
      maxWidth: 200,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('username'),
      render: row => cellText(row.username)
    },
    {
      title: '显示名',
      key: 'display_name',
      width: 120,
      minWidth: 100,
      maxWidth: 220,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('display_name'),
      render: row => cellText(row.display_name)
    },
    {
      title: '角色',
      key: 'role_ids',
      width: 140,
      minWidth: 100,
      maxWidth: 260,
      ellipsis: { tooltip: true },
      render: row => roleNames(row.role_ids)
    },
    {
      title: '状态',
      key: 'disabled',
      width: 90,
      sorter: true,
      sortOrder: columnSortOrder('disabled'),
      render: row =>
        h(
          NTag,
          { size: 'small', type: row.disabled ? 'warning' : 'success', bordered: false },
          {
            default: () => (row.disabled ? '禁用' : '正常')
          }
        )
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
      width: 248,
      fixed: 'right',
      render: row => {
        const actions = [
          renderTableAction({
            label: '编辑',
            icon: 'mdi:pencil-outline',
            onClick: () => openEdit(row)
          }),
          renderTableAction({
            label: '角色',
            icon: 'mdi:shield-account-outline',
            onClick: () => openRoles(row)
          }),
          renderTableAction({
            label: '重置密码',
            icon: 'mdi:lock-reset',
            onClick: () => openPassword(row)
          })
        ];
        if (isSelf(row)) {
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
                default: () => `确认删除用户 ${row.username}？`
              }
            )
          );
        }
        return renderTableActions(actions);
      }
    }
  ];
}

const { columnChecks, columns } = useColumnSetting<AdminUser>(createBaseColumns, { tableId: 'system.user.v3' });

const tableScrollX = computed(() => resolveTableScrollX(columns.value));

function revokeAvatarObjectUrl() {
  if (avatarObjectUrl.value) {
    URL.revokeObjectURL(avatarObjectUrl.value);
    avatarObjectUrl.value = '';
  }
}

function resetForm() {
  form.username = '';
  form.password = '';
  form.display_name = '';
  form.avatar = '';
  form.disabled = false;
  form.role_ids = [];
  pendingAvatarFile.value = null;
  revokeAvatarObjectUrl();
}

function openCreate() {
  editing.value = null;
  modalMode.value = 'create';
  resetForm();
  modalShow.value = true;
}

function openEdit(row: AdminUser) {
  editing.value = row;
  modalMode.value = 'edit';
  revokeAvatarObjectUrl();
  form.username = row.username;
  form.password = '';
  form.display_name = row.display_name || '';
  form.avatar = row.avatar || '';
  form.disabled = !!row.disabled;
  form.role_ids = [...(row.role_ids || [])];
  pendingAvatarFile.value = null;
  modalShow.value = true;
}

function openRoles(row: AdminUser) {
  editing.value = row;
  modalMode.value = 'roles';
  form.role_ids = [...(row.role_ids || [])];
  modalShow.value = true;
}

function openPassword(row: AdminUser) {
  editing.value = row;
  modalMode.value = 'password';
  form.password = '';
  modalShow.value = true;
}

function applyAvatarFile(raw: File) {
  if (!raw.type.startsWith('image/')) {
    window.$message?.warning('请选择图片文件');
    return;
  }
  if (raw.size > 2 * 1024 * 1024) {
    window.$message?.warning('头像需不超过 2MB');
    return;
  }
  revokeAvatarObjectUrl();
  pendingAvatarFile.value = raw;
  const url = URL.createObjectURL(raw);
  avatarObjectUrl.value = url;
  form.avatar = url;
}

function onAvatarSelect(options: { file: UploadFileInfo }) {
  const raw = options.file.file;
  if (!raw) return;
  applyAvatarFile(raw);
}

/** Naive Upload still fires custom-request unless we no-op it; keep local-only. */
function onAvatarCustomRequest(options: UploadCustomRequestOptions) {
  options.onFinish();
}

function clearAvatar(e?: Event) {
  e?.stopPropagation();
  e?.preventDefault();
  pendingAvatarFile.value = null;
  revokeAvatarObjectUrl();
  form.avatar = '';
}

async function loadRoles() {
  const rolesRes = await fetchRoles();
  if (rolesRes.error) return;
  roles.value = rolesRes.data?.items || [];
}

async function loadUsers() {
  loading.value = true;
  const usersRes = await fetchUsers({
    q: keyword.value,
    status: statusFilter.value,
    sort_by: apiSortBy(),
    sort_order: apiSortOrder()
  });
  loading.value = false;
  if (usersRes.error) return;
  items.value = usersRes.data?.items || [];
  const idSet = new Set(items.value.map(item => item.id));
  checkedKeys.value = checkedKeys.value.filter(key => idSet.has(Number(key)));
  clampPage(items.value.length);
}

async function load() {
  await Promise.all([loadUsers(), loadRoles()]);
}

function onUpdateSorter(sorter: DataTableSortState | DataTableSortState[] | null) {
  applySorter(sorter);
  void loadUsers();
}

async function batchSetDisabled(disabled: boolean) {
  if (!selectedIds.value.length) return;
  const ids = selectedIds.value.filter(id => id !== selfUserId.value);
  if (!ids.length) {
    window.$message?.warning('不能操作当前登录用户');
    return;
  }
  batchBusy.value = true;
  const { data, error } = await batchDisableUsers(ids, disabled);
  batchBusy.value = false;
  if (error) return;
  window.$message?.success(`已${disabled ? '禁用' : '启用'} ${data?.updated ?? ids.length} 个用户`);
  checkedKeys.value = [];
  await loadUsers();
}

async function remove(row: AdminUser) {
  if (isSelf(row)) {
    window.$message?.warning('不能删除自己');
    return;
  }
  const { error } = await deleteUser(row.id);
  if (error) return;
  window.$message?.success(`已删除用户${row.username}`);
  await loadUsers();
}

async function batchRemove() {
  if (!selectedIds.value.length) return;
  const ids = selectedIds.value.filter(id => id !== selfUserId.value);
  if (!ids.length) {
    window.$message?.warning('不能删除自己');
    return;
  }
  batchBusy.value = true;
  const { data, error } = await batchDeleteUsers(ids);
  batchBusy.value = false;
  if (error) return;
  window.$message?.success(`已删除${data?.deleted ?? ids.length} 个用户`);
  checkedKeys.value = [];
  await loadUsers();
}

async function maybeUploadAvatar(userId: number) {
  if (!pendingAvatarFile.value) return true;
  const { data, error } = await uploadUserAvatar(userId, pendingAvatarFile.value);
  if (error) return false;
  if (data?.avatar) {
    revokeAvatarObjectUrl();
    form.avatar = data.avatar;
  }
  pendingAvatarFile.value = null;
  return true;
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

  if (modalMode.value === 'create') {
    const created = await createUser({
      username: form.username.trim(),
      password: form.password,
      display_name: form.display_name.trim(),
      role_ids: form.role_ids
    });
    error = created.error;
    if (!error && created.data?.id) {
      const ok = await maybeUploadAvatar(created.data.id);
      if (!ok) {
        saving.value = false;
        window.$message?.warning('用户已创建，但头像上传失败，可在编辑中重试');
        modalShow.value = false;
        await loadUsers();
        return;
      }
      successMsg = '用户已创建';
    }
  } else if (modalMode.value === 'edit' && editing.value) {
    const username = form.username.trim();
    if (!username) {
      saving.value = false;
      window.$message?.warning('请输入用户名');
      return;
    }
    const patch: Parameters<typeof patchUser>[1] = {
      username,
      display_name: form.display_name.trim(),
      disabled: form.disabled
    };
    if (!pendingAvatarFile.value) {
      patch.avatar = form.avatar.trim();
    }
    ({ error } = await patchUser(editing.value.id, patch));
    if (!error) {
      const ok = await maybeUploadAvatar(editing.value.id);
      if (!ok) {
        saving.value = false;
        window.$message?.warning('资料已更新，但头像上传失败');
        await loadUsers();
        return;
      }
      successMsg = '用户已更新';
    }
  } else if (modalMode.value === 'roles' && editing.value) {
    ({ error } = await setUserRoles(editing.value.id, form.role_ids));
    successMsg = '角色已更新';
  } else if (modalMode.value === 'password' && editing.value) {
    ({ error } = await resetUserPassword(editing.value.id, form.password));
    successMsg = '密码已重置';
  }

  saving.value = false;
  if (error) return;
  if (successMsg) window.$message?.success(successMsg);
  modalShow.value = false;
  await loadUsers();
  // 改自己资料/头像后同步右上角与欢迎区
  if (editing.value && isSelf(editing.value)) {
    await authStore.getUserInfo();
  }
}

watchKeyword(() => {
  void loadUsers();
});

watch(statusFilter, () => {
  pagination.page = 1;
  void loadUsers();
});

onMounted(load);
</script>

<template>
  <div class="h-full min-h-0 flex-col-stretch overflow-hidden">
    <AdminListPage title="用户管理">
      <template #filters>
        <NSpace :size="12" align="center" wrap>
          <NInput v-model:value="keyword" clearable class="w-260px" placeholder="搜索用户名 / 显示名">
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
        <NButton v-auth="'platform.user.manage'" type="primary" @click="openCreate">
          <template #icon>
            <SvgIcon icon="mdi:plus" />
          </template>
          新建用户
        </NButton>
        <TableToolGroup v-model:columns="columnChecks" :loading="loading" @refresh="loadUsers" />
      </template>

      <AdminTableWrap v-slot="{ maxHeight }">
        <TableSelectionBar :count="selectedIds.length" @clear="checkedKeys = []">
          <NButton
            v-auth="'platform.user.manage'"
            size="small"
            :disabled="!selectedIds.length || batchBusy"
            @click="batchSetDisabled(false)"
          >
            批量启用
          </NButton>
          <NButton
            v-auth="'platform.user.manage'"
            size="small"
            :disabled="!selectedIds.length || batchBusy"
            @click="batchSetDisabled(true)"
          >
            批量禁用
          </NButton>
          <NPopconfirm :disabled="!selectedIds.length || batchBusy" @positive-click="batchRemove">
            <template #trigger>
              <NButton
                v-auth="'platform.user.manage'"
                size="small"
                type="error"
                secondary
                :disabled="!selectedIds.length || batchBusy"
              >
                批量删除
              </NButton>
            </template>
            确认删除选中的{{ selectedIds.length }} 个用户？当前登录用户将被跳过。
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
      class="w-520px"
      :mask-closable="!saving"
      @after-leave="resetForm"
    >
      <div v-if="modalMode === 'create' || modalMode === 'edit'" class="mb-18px flex-col items-center gap-8px">
        <div class="user-avatar-picker relative">
          <NUpload
            accept="image/jpeg,image/png,image/webp,image/gif"
            :default-upload="false"
            :show-file-list="false"
            :custom-request="onAvatarCustomRequest"
            @change="onAvatarSelect"
          >
            <div
              class="user-avatar-frame group relative cursor-pointer overflow-hidden rounded-full"
              title="点击上传头像"
            >
              <NAvatar
                round
                :size="96"
                :src="avatarPreviewSrc"
                :fallback-src="defaultAvatarUrl"
                class="user-avatar-img"
              />
              <div class="user-avatar-mask">
                <SvgIcon icon="mdi:camera-outline" class="text-22px text-white" />
                <span class="mt-2px text-12px text-white/95">上传</span>
              </div>
            </div>
          </NUpload>
          <button v-if="canClearAvatar" type="button" class="user-avatar-clear" title="清除头像" @click="clearAvatar">
            <SvgIcon icon="mdi:close" class="text-14px" />
          </button>
        </div>
        <div class="text-12px opacity-45">点击头像上传，支持 jpg / png / webp / gif，不超过 2MB</div>
      </div>

      <NForm ref="formRef" label-placement="left" label-width="88" :model="form" :rules="formRules">
        <NFormItem v-if="modalMode === 'create' || modalMode === 'edit'" path="username" label="用户名">
          <NInput v-model:value="form.username" placeholder="登录用户名" />
        </NFormItem>
        <NFormItem v-if="modalMode === 'create' || modalMode === 'password'" path="password" label="密码">
          <NInput v-model:value="form.password" type="password" show-password-on="click" placeholder="登录密码" />
        </NFormItem>
        <NFormItem v-if="modalMode === 'create' || modalMode === 'edit'" label="显示名">
          <NInput v-model:value="form.display_name" placeholder="可选" />
        </NFormItem>
        <NFormItem v-if="modalMode === 'edit'" label="禁用">
          <NSwitch v-model:value="form.disabled" />
        </NFormItem>
        <NFormItem v-if="modalMode === 'create' || modalMode === 'roles'" label="角色">
          <NSelect
            v-model:value="form.role_ids"
            multiple
            filterable
            clearable
            :options="roleOptions"
            placeholder="选择角色"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="modalShow = false">取消</NButton>
          <NButton v-auth="'platform.user.manage'" type="primary" :loading="saving" @click="submit">确定</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.user-avatar-picker {
  width: 96px;
  height: 96px;
}

.user-avatar-picker :deep(.n-upload) {
  display: block;
  width: 96px;
  height: 96px;
}

.user-avatar-picker :deep(.n-upload-trigger) {
  display: block;
  width: 96px;
  height: 96px;
}

.user-avatar-frame {
  width: 96px;
  height: 96px;
  box-shadow: 0 0 0 1px rgb(var(--base-text-color) / 0.08);
  transition: box-shadow 0.2s ease;
}

.user-avatar-frame:hover {
  box-shadow: 0 0 0 2px rgb(var(--primary-color) / 0.35);
}

.user-avatar-img {
  background: transparent !important;
}

.user-avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 0.48);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.user-avatar-frame:hover .user-avatar-mask {
  opacity: 1;
}

.user-avatar-clear {
  position: absolute;
  top: -2px;
  right: -2px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgb(var(--container-bg-color));
  border-radius: 999px;
  background: rgb(var(--error-color));
  color: #fff;
  cursor: pointer;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.16);
  transition:
    transform 0.15s ease,
    filter 0.15s ease;
}

.user-avatar-clear:hover {
  transform: scale(1.06);
  filter: brightness(1.05);
}
</style>
