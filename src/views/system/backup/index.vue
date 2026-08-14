<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NDataTable,
  NInput,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  type DataTableColumns,
  type DataTableSortState,
  type SelectOption
} from 'naive-ui';
import {
  createBackupJob,
  deleteBackup,
  downloadBackup,
  fetchBackups,
  uploadBackup,
  type BackupJob
} from '@/service/api';
import { renderTableAction, renderTableActions } from '@/components/common/table-action';
import { resolveTableScrollX } from '@/components/common/table-pagination';
import { useAdminListQuery } from '@/hooks/common/admin-list-query';
import { useColumnSetting } from '@/hooks/common/column-setting';
import { $t } from '@/locales';
import { cellText } from '@/utils/cell-text';
import { formatDateTime } from '@/utils/datetime';
import { statusLabel } from '@/utils/status-label';

defineOptions({ name: 'SystemBackup' });

const router = useRouter();
const loading = ref(false);
const creating = ref(false);
const uploading = ref(false);
const uploadInput = ref<HTMLInputElement | null>(null);
const deletingID = ref<number | null>(null);
const items = ref<BackupJob[]>([]);
const statusFilter = ref<'all' | 'done' | 'failed' | 'running'>('all');

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
  { label: '成功', value: 'done' },
  { label: '失败', value: 'failed' },
  { label: '进行中', value: 'running' }
];

function resetFilters() {
  keyword.value = '';
  statusFilter.value = 'all';
  pagination.page = 1;
  void load();
}

function formatBytes(n?: number) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

function createBaseColumns(): DataTableColumns<BackupJob> {
  return [
    { title: $t('field.id'), key: 'id', width: 70, fixed: 'left', sorter: true, sortOrder: columnSortOrder('id') },
    {
      title: '状态',
      key: 'status',
      width: 100,
      sorter: true,
      sortOrder: columnSortOrder('status'),
      render: row => {
        const map: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
          done: 'success',
          failed: 'error',
          running: 'warning',
          pending: 'default'
        };
        return h(
          NTag,
          { size: 'small', type: map[row.status] || 'default', bordered: false },
          { default: () => statusLabel(row.status) }
        );
      }
    },
    {
      title: '文件',
      key: 'file_path',
      width: 220,
      minWidth: 140,
      maxWidth: 360,
      ellipsis: { tooltip: true },
      render: row => cellText(row.file_path)
    },
    {
      title: '大小',
      key: 'size_bytes',
      width: 100,
      sorter: true,
      sortOrder: columnSortOrder('size_bytes'),
      render: row => formatBytes(row.size_bytes)
    },
    {
      title: '备注',
      key: 'note',
      width: 140,
      minWidth: 100,
      maxWidth: 260,
      ellipsis: { tooltip: true },
      render: row => cellText(row.note)
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 178,
      sorter: true,
      sortOrder: columnSortOrder('created_at'),
      render: row => formatDateTime(row.created_at)
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: row => {
        const canRestore = row.status === 'done' && Boolean(row.file_path);
        const canDownload = canRestore;
        const canDelete = row.status !== 'running';
        return renderTableActions([
          renderTableAction({
            label: '下载',
            icon: 'mdi:download-outline',
            disabled: !canDownload,
            onClick: () => download(row)
          }),
          renderTableAction({
            label: '恢复',
            icon: 'mdi:backup-restore',
            disabled: !canRestore,
            onClick: () => router.push({ name: 'system_backup_detail', params: { id: String(row.id) } })
          }),
          h(
            NPopconfirm,
            {
              disabled: !canDelete || deletingID.value === row.id,
              onPositiveClick: () => remove(row)
            },
            {
              trigger: () =>
                renderTableAction({
                  label: '删除',
                  icon: 'mdi:delete-outline',
                  type: 'error',
                  disabled: !canDelete || deletingID.value === row.id
                }),
              default: () => `确认删除备份 #${row.id}？将同时删除服务端文件。`
            }
          )
        ]);
      }
    }
  ];
}

const { columnChecks, columns } = useColumnSetting<BackupJob>(createBaseColumns, { tableId: 'system.backup.v2' });

const tableScrollX = computed(() => resolveTableScrollX(columns.value));

async function load() {
  loading.value = true;
  const { data, error } = await fetchBackups({
    q: keyword.value,
    status: statusFilter.value,
    kind: 'backup',
    sort_by: apiSortBy(),
    sort_order: apiSortOrder()
  });
  loading.value = false;
  if (error) return;
  items.value = data?.items || [];
  clampPage(items.value.length);
}

function onUpdateSorter(sorter: DataTableSortState | DataTableSortState[] | null) {
  applySorter(sorter);
  void load();
}

async function createBackup() {
  creating.value = true;
  const { error } = await createBackupJob();
  creating.value = false;
  if (error) return;
  window.$message?.success('备份已创建');
  await load();
}

function onPickUpload() {
  uploadInput.value?.click();
}

async function onUploadSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.bak')) {
    window.$message?.warning('请选择 .bak 备份文件');
    return;
  }
  uploading.value = true;
  const { error } = await uploadBackup(file);
  uploading.value = false;
  if (error) return;
  window.$message?.success(`已上传备份：${file.name}`);
  await load();
}

async function remove(row: BackupJob) {
  deletingID.value = row.id;
  const { error } = await deleteBackup(row.id);
  deletingID.value = null;
  if (error) return;
  window.$message?.success(`已删除备份 #${row.id}`);
  await load();
}

async function download(row: BackupJob) {
  const { data, error } = await downloadBackup(row.id);
  if (error || !data) {
    window.$message?.error('下载失败');
    return;
  }
  const url = URL.createObjectURL(data);
  const fileName = row.file_path?.split('/').pop() || `platform-backup-${row.id}.bak`;
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

watchKeyword(() => {
  void load();
});

watch(statusFilter, () => {
  pagination.page = 1;
  void load();
});

onMounted(load);
</script>

<template>
  <div class="h-full min-h-0 flex-col-stretch overflow-hidden">
    <AdminListPage
      title="备份与恢复"
      description="列表仅展示备份任务状态（成功/失败/进行中）。恢复请进入详情勾选「结构/数据」后异步执行；仅支持 sqlite。"
    >
      <template #filters>
        <NSpace :size="12" align="center" wrap>
          <NInput v-model:value="keyword" clearable class="w-260px" placeholder="搜索文件路径 / 备注">
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
        <NButton v-auth="'platform.backup.manage'" type="primary" :loading="creating" @click="createBackup">
          <template #icon>
            <SvgIcon icon="mdi:database-plus-outline" />
          </template>
          立即备份
        </NButton>
        <NButton v-auth="'platform.backup.manage'" :loading="uploading" @click="onPickUpload">
          <template #icon>
            <SvgIcon icon="mdi:upload-outline" />
          </template>
          上传备份
        </NButton>
        <input ref="uploadInput" type="file" accept=".bak" class="hidden" @change="onUploadSelected" />
        <TableToolGroup v-model:columns="columnChecks" :loading="loading" @refresh="load" />
      </template>

      <AdminTableWrap v-slot="{ maxHeight }">
        <NDataTable
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
  </div>
</template>
