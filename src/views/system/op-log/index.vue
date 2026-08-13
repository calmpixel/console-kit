<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import {
  NButton,
  NDataTable,
  NGi,
  NGrid,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  type DataTableColumns,
  type DataTableSortState,
  type SelectOption
} from 'naive-ui';
import { fetchOpLog, fetchOpLogs, type LogEntry, type OpLogResult } from '@/service/api';
import DateRangeFilter from '@/components/common/date-range-filter.vue';
import { resolveTableScrollX } from '@/components/common/table-pagination';
import { useAdminListQuery } from '@/hooks/common/admin-list-query';
import { useColumnSetting } from '@/hooks/common/column-setting';
import { $t } from '@/locales';
import { cellText } from '@/utils/cell-text';
import { formatDateTime } from '@/utils/datetime';

defineOptions({ name: 'SystemOpLog' });

const loading = ref(false);
const items = ref<LogEntry[]>([]);
const detailShow = ref(false);
const detailLoading = ref(false);
const detail = ref<LogEntry | null>(null);
const resultFilter = ref<OpLogResult[]>([]);
const timeRange = ref<[number, number] | null>(null);

const resultOptions: SelectOption[] = [
  { label: '成功 (2xx)', value: 'success' },
  { label: '客户端错误 (4xx)', value: 'client_error' },
  { label: '失败 (5xx)', value: 'server_error' }
];

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
} = useAdminListQuery({ defaultApiSortBy: 'id', defaultApiSortOrder: 'desc' });

const pageItems = makePageItems(items);
const tablePagination = makeTablePagination(() => items.value.length);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** SQLite created_at 文本可比较格式 */
function toSqliteDateTime(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function resetFilters() {
  keyword.value = '';
  resultFilter.value = [];
  timeRange.value = null;
  pagination.page = 1;
  void load();
}

function operatorPrimary(row: LogEntry) {
  const name = String(row.username || '').trim();
  if (name) return name;
  if (row.user_id != null && Number(row.user_id) > 0) return String(row.user_id);
  return '-';
}

function operatorSecondary(row: LogEntry) {
  const auth = cellText(row.auth_type, '');
  const name = String(row.username || '').trim();
  const display = cellText(row.display_name, '');
  const uid = row.user_id != null && Number(row.user_id) > 0 ? String(row.user_id) : '';
  // Live user: display_name · auth; deleted user primary is already user_id → auth only.
  if (name) {
    if (display && auth) return `${display} · ${auth}`;
    if (display) return display;
    if (auth && uid) return `${auth} · ID ${uid}`;
    if (auth) return auth;
    if (uid) return `ID ${uid}`;
    return '-';
  }
  if (auth) return auth;
  return '-';
}

function operatorDetailSecondary(row: LogEntry) {
  const name = String(row.username || '').trim();
  const display = String(row.display_name || '').trim();
  if (!name) return '-'; // 用户已删时主行已是 user_id
  if (display && display !== name) return display;
  if (row.user_id != null && Number(row.user_id) > 0) return `ID ${row.user_id}`;
  return '-';
}

function methodPath(row: LogEntry) {
  const method = cellText(row.method, '');
  const path = cellText(row.path, '');
  if (method && path) return `${method} ${path}`;
  if (path) return path;
  if (method) return method;
  return '-';
}

function statusTone(code?: number): { bg: string; fg: string; dot: string } {
  const n = Number(code) || 0;
  if (n >= 200 && n < 300) {
    return { bg: 'rgba(34, 197, 94, 0.12)', fg: 'rgb(22, 163, 74)', dot: 'rgb(34, 197, 94)' };
  }
  if (n >= 400 && n < 500) {
    return { bg: 'rgba(245, 158, 11, 0.14)', fg: 'rgb(180, 83, 9)', dot: 'rgb(245, 158, 11)' };
  }
  if (n >= 500) {
    return { bg: 'rgba(239, 68, 68, 0.12)', fg: 'rgb(185, 28, 28)', dot: 'rgb(239, 68, 68)' };
  }
  return { bg: 'rgba(148, 163, 184, 0.16)', fg: 'rgb(100, 116, 139)', dot: 'rgb(148, 163, 184)' };
}

function statusLabel(code?: number) {
  const n = Number(code) || 0;
  if (!n) return '-';
  if (n >= 200 && n < 300) return `${n} 成功`;
  if (n >= 400 && n < 500) return `${n} 客户端错误`;
  if (n >= 500) return `${n} 失败`;
  return String(n);
}

function renderStatusBadge(code?: number, withText = false) {
  const n = Number(code) || 0;
  if (!n) return h('span', { class: 'opacity-50' }, '-');
  const tone = statusTone(n);
  return h(
    'span',
    {
      class: 'inline-flex items-center gap-6px rounded-full px-10px py-2px text-12px font-medium',
      style: { background: tone.bg, color: tone.fg }
    },
    [
      h('span', {
        class: 'inline-block h-6px w-6px rounded-full shrink-0',
        style: { background: tone.dot }
      }),
      withText ? statusLabel(n) : String(n)
    ]
  );
}

function renderTwoLine(primary: string, secondary: string, opts?: { monoSecondary?: boolean }) {
  return h('div', { class: 'min-w-0 py-2px flex-col gap-2px' }, [
    h(
      'div',
      {
        class: 'truncate text-13px font-medium',
        title: primary
      },
      primary
    ),
    h(
      'div',
      {
        class: ['truncate text-12px opacity-50', opts?.monoSecondary ? 'font-mono' : ''].join(' '),
        title: secondary
      },
      secondary
    )
  ]);
}

async function openDetail(row: LogEntry) {
  detailShow.value = true;
  detail.value = row;
  detailLoading.value = true;
  const { data, error } = await fetchOpLog(row.id);
  detailLoading.value = false;
  if (error || !data?.item) return;
  detail.value = data.item;
}

function closeDetail() {
  detailShow.value = false;
  detail.value = null;
}

const detailBodyCode = computed(() => JSON.stringify(detail.value?.detail || {}, null, 2));

function formatLatency(ms?: number) {
  if (ms == null || ms === undefined) return '-';
  const n = Number(ms);
  if (!Number.isFinite(n)) return '-';
  return `${n} ms`;
}

function createBaseColumns(): DataTableColumns<LogEntry> {
  return [
    {
      title: $t('field.createdAt'),
      key: 'created_at',
      width: 168,
      fixed: 'left',
      sorter: true,
      sortOrder: columnSortOrder('created_at'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'border-none bg-transparent p-0 text-left cursor-pointer text-13px',
            onClick: () => void openDetail(row)
          },
          formatDateTime(row.created_at)
        )
    },
    {
      title: '操作者',
      key: 'username',
      width: 220,
      minWidth: 160,
      maxWidth: 280,
      sorter: true,
      sortOrder: columnSortOrder('username'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'w-full border-none bg-transparent p-0 text-left cursor-pointer',
            onClick: () => void openDetail(row)
          },
          [renderTwoLine(operatorPrimary(row), operatorSecondary(row))]
        )
    },
    {
      title: '动作',
      key: 'action',
      minWidth: 260,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('action'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'w-full border-none bg-transparent p-0 text-left cursor-pointer',
            onClick: () => void openDetail(row)
          },
          [renderTwoLine(cellText(row.action), methodPath(row), { monoSecondary: true })]
        )
    },
    {
      title: '结果',
      key: 'status_code',
      width: 100,
      sorter: true,
      sortOrder: columnSortOrder('status_code'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'border-none bg-transparent p-0 cursor-pointer',
            onClick: () => void openDetail(row)
          },
          [renderStatusBadge(row.status_code)]
        )
    },
    {
      title: $t('field.latency'),
      key: 'latency_ms',
      width: 100,
      sorter: true,
      sortOrder: columnSortOrder('latency_ms'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'border-none bg-transparent p-0 text-left cursor-pointer text-13px tabular-nums',
            onClick: () => void openDetail(row)
          },
          formatLatency(row.latency_ms)
        )
    },
    {
      title: $t('field.ip'),
      key: 'ip',
      width: 140,
      ellipsis: { tooltip: true },
      sorter: true,
      sortOrder: columnSortOrder('ip'),
      render: row =>
        h(
          'button',
          {
            type: 'button',
            class: 'border-none bg-transparent p-0 text-left cursor-pointer text-13px font-mono',
            onClick: () => void openDetail(row)
          },
          cellText(row.ip)
        )
    }
  ];
}

const { columnChecks, columns } = useColumnSetting<LogEntry>(createBaseColumns, { tableId: 'system.op-log.v3' });

const tableScrollX = computed(() => resolveTableScrollX(columns.value));

async function load() {
  loading.value = true;
  const range = timeRange.value;
  const { data, error } = await fetchOpLogs({
    q: keyword.value,
    result: resultFilter.value.length ? resultFilter.value : undefined,
    from: range?.[0] != null ? toSqliteDateTime(range[0]) : undefined,
    to: range?.[1] != null ? toSqliteDateTime(range[1]) : undefined,
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

watchKeyword(() => {
  void load();
});

watch([resultFilter, timeRange], () => {
  pagination.page = 1;
  void load();
});

onMounted(load);
</script>

<template>
  <div class="h-full min-h-0 flex-col-stretch overflow-hidden">
    <AdminListPage title="操作日志" description="记录控制台关键写操作及请求上下文，便于排查与追溯。点击行可查看详情。">
      <template #filters>
        <NSpace :size="12" align="center" :wrap="false" class="flex-nowrap">
          <NInput
            v-model:value="keyword"
            clearable
            class="w-260px shrink-0"
            placeholder="搜索用户 / 动作 / 路径 / IP / 请求 ID"
          >
            <template #prefix>
              <SvgIcon icon="mdi:magnify" class="text-icon" />
            </template>
          </NInput>
          <NSelect
            v-model:value="resultFilter"
            multiple
            clearable
            max-tag-count="responsive"
            class="w-220px shrink-0"
            placeholder="结果"
            :options="resultOptions"
            :consistent-menu-width="false"
          />
          <DateRangeFilter v-model="timeRange" class="shrink-0" />
          <NButton class="shrink-0" @click="resetFilters">重置</NButton>
        </NSpace>
      </template>

      <template #actions>
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

    <NModal
      :show="detailShow"
      preset="card"
      title="操作日志详情"
      class="w-720px max-w-[92vw]"
      :bordered="false"
      :segmented="{ content: true }"
      @update:show="v => !v && closeDetail()"
    >
      <NSpin :show="detailLoading">
        <div v-if="detail" class="flex-col gap-14px">
          <div class="rounded-8px border border-solid border-[rgba(0,0,0,0.08)] p-14px flex-col gap-10px">
            <div class="flex items-center gap-10px flex-wrap">
              <span
                class="inline-flex items-center gap-6px rounded-full px-10px py-2px text-12px font-medium"
                :style="{
                  background: statusTone(detail.status_code).bg,
                  color: statusTone(detail.status_code).fg
                }"
              >
                <span
                  class="inline-block h-6px w-6px rounded-full shrink-0"
                  :style="{ background: statusTone(detail.status_code).dot }"
                />
                {{ Number(detail.status_code) ? statusLabel(detail.status_code) : '-' }}
              </span>
            </div>
            <div class="text-15px font-semibold break-all">
              {{ cellText(detail.action) }}
            </div>
            <div
              class="rounded-6px border border-solid border-[rgba(0,0,0,0.08)] bg-[rgb(var(--layout-bg-color))] px-10px py-8px font-mono text-12px opacity-80 break-all"
            >
              {{ methodPath(detail) }}
            </div>
            <div class="flex flex-wrap items-center gap-x-16px gap-y-6px text-12px opacity-70">
              <span class="inline-flex items-center gap-4px">
                <SvgIcon icon="mdi:clock-outline" class="text-14px" />
                {{ formatDateTime(detail.created_at) }}
              </span>
              <span>耗时 {{ Number(detail.latency_ms) || 0 }} ms</span>
              <span class="break-all">请求 ID {{ cellText(detail.request_id) }}</span>
            </div>
          </div>

          <NGrid :cols="3" :x-gap="10" :y-gap="10" responsive="screen" item-responsive>
            <NGi span="3 m:1">
              <div class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px min-h-64px">
                <div class="text-11px opacity-50 mb-6px">操作者</div>
                <div class="text-13px font-medium break-all">{{ operatorPrimary(detail) }}</div>
                <div class="text-12px opacity-50 mt-2px break-all">
                  {{ operatorDetailSecondary(detail) }}
                </div>
              </div>
            </NGi>
            <NGi span="3 m:1">
              <div class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px min-h-64px">
                <div class="text-11px opacity-50 mb-6px">认证方式</div>
                <div class="text-13px font-medium">{{ cellText(detail.auth_type) }}</div>
                <div class="text-12px opacity-50 mt-2px font-mono break-all">
                  {{ cellText(detail.auth_masked) }}
                </div>
              </div>
            </NGi>
            <NGi span="3 m:1">
              <div class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px min-h-64px">
                <div class="text-11px opacity-50 mb-6px">客户端 IP</div>
                <div class="text-13px font-medium break-all font-mono">{{ cellText(detail.ip) }}</div>
              </div>
            </NGi>
          </NGrid>

          <div>
            <div class="text-11px tracking-wide opacity-50 mb-6px">来源地址（Referer）</div>
            <div
              class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px text-12px opacity-80 break-all leading-relaxed font-mono"
            >
              {{ cellText(detail.referer) }}
            </div>
          </div>

          <div>
            <div class="text-11px tracking-wide opacity-50 mb-6px">USER-AGENT</div>
            <div
              class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px text-12px opacity-80 break-all leading-relaxed"
            >
              {{ cellText(detail.user_agent) }}
            </div>
          </div>

          <div>
            <div class="text-11px tracking-wide opacity-50 mb-6px">请求体（已脱敏）</div>
            <div class="rounded-8px bg-[rgb(var(--layout-bg-color))] px-12px py-10px overflow-auto max-h-280px">
              <pre class="m-0 whitespace-pre-wrap break-all text-12px font-mono leading-relaxed opacity-90">{{
                detailBodyCode
              }}</pre>
            </div>
          </div>
        </div>
      </NSpin>
    </NModal>
  </div>
</template>
