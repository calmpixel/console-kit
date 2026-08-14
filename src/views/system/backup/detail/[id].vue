<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDescriptions,
  NDescriptionsItem,
  NProgress,
  NSpace,
  NTag,
  NText
} from 'naive-ui';
import { fetchBackup, fetchBackupJob, startRestore, type BackupDetail, type BackupJob } from '@/service/api';
import { cellText } from '@/utils/cell-text';
import { formatDateTime } from '@/utils/datetime';
import { statusLabel } from '@/utils/status-label';

defineOptions({ name: 'SystemBackupDetail' });

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const starting = ref(false);
const detail = ref<BackupDetail | null>(null);
const activeJob = ref<BackupJob | null>(null);

const opts = reactive({
  structure: true,
  data: true
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

const backupId = computed(() => Number(route.params.id) || 0);

const phaseText = computed(() => {
  const phase = (activeJob.value?.phase || detail.value?.phase || '').trim();
  if (!phase) return '-';
  if (phase === 'preparing') return '准备中';
  if (phase === 'done') return '已完成';
  if (phase === 'failed') return '失败';
  if (phase.startsWith('structure:')) return `恢复结构 · ${phase.slice('structure:'.length)}`;
  if (phase.startsWith('data:')) return `恢复数据 · ${phase.slice('data:'.length)}`;
  return phase;
});

const progress = computed(() => Number(activeJob.value?.progress ?? 0) || 0);
const jobStatus = computed(() => activeJob.value?.status || '');
const isRunning = computed(() => jobStatus.value === 'running');

function statusType(status?: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'done') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'warning';
  return 'default';
}

function formatBytes(n?: number) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll(jobId: number) {
  stopPoll();
  pollTimer = setInterval(() => {
    void refreshJob(jobId);
  }, 800);
}

async function refreshJob(jobId: number) {
  const { data, error } = await fetchBackupJob(jobId);
  if (error || !data?.job) return;
  activeJob.value = data.job;
  if (data.job.status === 'done' || data.job.status === 'failed') {
    stopPoll();
    await loadDetail(false);
    if (data.job.status === 'done') {
      window.$message?.success('恢复完成。建议刷新页面或重新登录以加载最新数据。');
    } else {
      window.$message?.error(data.job.note || '恢复失败');
    }
  }
}

async function loadDetail(showLoading = true) {
  if (!backupId.value) return;
  if (showLoading) loading.value = true;
  const { data, error } = await fetchBackup(backupId.value);
  if (showLoading) loading.value = false;
  if (error) {
    detail.value = null;
    return;
  }
  detail.value = data?.item || null;
  const latest = detail.value?.restores?.[0];
  if (latest && (!activeJob.value || activeJob.value.id === latest.id || !isRunning.value)) {
    activeJob.value = latest;
    if (latest.status === 'running') startPoll(latest.id);
  }
}

async function onStartRestore() {
  if (!opts.structure && !opts.data) {
    window.$message?.warning('请至少勾选「恢复结构」或「恢复数据」');
    return;
  }
  starting.value = true;
  const { data, error } = await startRestore(backupId.value, {
    structure: opts.structure,
    data: opts.data
  });
  starting.value = false;
  if (error) return;
  if (!data?.job) {
    window.$message?.error('未返回恢复任务');
    return;
  }
  activeJob.value = data.job;
  window.$message?.success('恢复任务已启动');
  startPoll(data.job.id);
  await loadDetail(false);
}

function goBack() {
  router.push({ name: 'system_backup' });
}

onMounted(() => {
  void loadDetail();
});

onUnmounted(() => {
  stopPoll();
});
</script>

<template>
  <div class="h-full min-h-0 overflow-auto p-16px">
    <NSpace vertical :size="16">
      <!-- 顶部：返回 + 标题 + 刷新（卡片式头部，全站详情页统一） -->
      <NCard :bordered="false" class="card-wrapper">
        <div class="flex-y-center justify-between gap-12px flex-wrap">
          <div class="flex-y-center gap-2px">
            <NButton quaternary circle class="shrink-0 -ml-15px" @click="goBack">
              <template #icon>
                <SvgIcon icon="mdi:arrow-left" />
              </template>
            </NButton>
            <h3 class="text-18px font-semibold leading-none">备份详情 #{{ backupId || '-' }}</h3>
          </div>
          <NButton size="small" secondary :loading="loading" @click="loadDetail()">
            <template #icon>
              <SvgIcon icon="mdi:refresh" />
            </template>
            刷新
          </NButton>
        </div>
      </NCard>

      <NCard v-if="detail" :bordered="false" class="card-wrapper" title="备份信息">
        <NDescriptions label-placement="left" :column="2" size="small">
          <NDescriptionsItem label="状态">
            <NTag size="small" :type="statusType(detail.status)" :bordered="false">
              {{ statusLabel(detail.status) }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="大小">{{ formatBytes(detail.size_bytes) }}</NDescriptionsItem>
          <NDescriptionsItem label="文件" :span="2">{{ cellText(detail.file_path) }}</NDescriptionsItem>
          <NDescriptionsItem label="创建时间">{{ formatDateTime(detail.created_at) }}</NDescriptionsItem>
          <NDescriptionsItem label="完成时间">{{ formatDateTime(detail.finished_at) }}</NDescriptionsItem>
          <NDescriptionsItem label="备注" :span="2">{{ cellText(detail.note) }}</NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NCard v-if="detail" :bordered="false" class="card-wrapper" title="恢复选项">
        <NSpace vertical :size="14">
          <NAlert type="warning" :bordered="false">
            选择要恢复的内容后开始。可重复发起；不会整文件覆盖 live 库，也不会改写备份台账表。仅支持 sqlite。
          </NAlert>
          <NSpace>
            <NCheckbox v-model:checked="opts.structure" :disabled="isRunning">恢复结构</NCheckbox>
            <NCheckbox v-model:checked="opts.data" :disabled="isRunning">恢复数据</NCheckbox>
          </NSpace>
          <div>
            <NButton
              v-auth="'platform.backup.manage'"
              type="primary"
              :loading="starting"
              :disabled="detail.status !== 'done' || isRunning || (!opts.structure && !opts.data)"
              @click="onStartRestore"
            >
              {{ isRunning ? '恢复进行中…' : '开始恢复' }}
            </NButton>
          </div>
        </NSpace>
      </NCard>

      <NCard v-if="activeJob" :bordered="false" class="card-wrapper" title="恢复进度">
        <NSpace vertical :size="12">
          <div class="flex items-center gap-10px flex-wrap">
            <NTag size="small" :type="statusType(activeJob.status)" :bordered="false">
              {{ statusLabel(activeJob.status) }}
            </NTag>
            <span class="text-13px opacity-70">任务 #{{ activeJob.id }}</span>
            <span class="text-13px opacity-70">阶段：{{ phaseText }}</span>
          </div>
          <NProgress
            type="line"
            :percentage="progress"
            :status="activeJob.status === 'failed' ? 'error' : activeJob.status === 'done' ? 'success' : 'default'"
            indicator-placement="inside"
            :processing="isRunning"
          />
          <div v-if="activeJob.note" class="text-13px opacity-70 break-all">{{ activeJob.note }}</div>
        </NSpace>
      </NCard>

      <NCard v-if="detail?.restores?.length" :bordered="false" class="card-wrapper" title="历史恢复">
        <div class="flex-col gap-8px">
          <div
            v-for="item in detail.restores"
            :key="item.id"
            class="flex items-center justify-between gap-12px py-6px border-b border-solid border-[rgba(0,0,0,0.06)] last:border-none"
          >
            <div class="min-w-0 flex items-center gap-8px">
              <NTag size="small" :type="statusType(item.status)" :bordered="false">
                {{ statusLabel(item.status) }}
              </NTag>
              <span class="text-13px">#{{ item.id }}</span>
              <span class="text-12px opacity-55 truncate">{{ cellText(item.phase) }} · {{ item.progress ?? 0 }}%</span>
            </div>
            <span class="text-12px opacity-55 shrink-0">{{ formatDateTime(item.created_at) }}</span>
          </div>
        </div>
      </NCard>

      <NCard v-if="!loading && !detail" :bordered="false" class="card-wrapper">
        <NText depth="3">未找到该备份，可能已被删除。</NText>
      </NCard>
    </NSpace>
  </div>
</template>
