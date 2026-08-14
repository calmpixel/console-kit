<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  NAvatar,
  NButton,
  NCard,
  NDropdown,
  NEmpty,
  NGi,
  NGrid,
  NProgress,
  NSpace,
  type DropdownOption
} from 'naive-ui';
import { createReusableTemplate } from '@vueuse/core';
import { useAuthStore } from '@/store/modules/auth';
import { useThemeStore } from '@/store/modules/theme';
import { useNotificationStore } from '@/store/modules/notification';
import { useEcharts, type ECOption } from '@/hooks/common/echarts';
import { useRouterPush } from '@/hooks/common/router';
import type { RouteKey } from '@elegant-router/types';
import {
  fetchBackups,
  fetchMenus,
  fetchRoles,
  fetchSystemHealth,
  fetchUsers,
  type SystemHostDisk,
  type SystemHostHealth
} from '@/service/api';
import defaultAvatarUrl from '@/assets/svg-icon/avatar.svg?url';

defineOptions({ name: 'OverviewPage' });

const authStore = useAuthStore();
const themeStore = useThemeStore();
const { routerPushByKey } = useRouterPush();

const notifyStore = useNotificationStore();
/** SSE 通知流连接状态（与右上角通知铃铛共享同一 store 实例）。 */
const sseConnected = computed(() => notifyStore.connected);

const welcomeAvatarSrc = computed(() => (authStore.userInfo.avatar || '').trim() || defaultAvatarUrl);

const host = ref<SystemHostHealth | null>(null);
const loading = ref(false);

const platform = ref({
  users: 0,
  roles: 0,
  menus: 0,
  backups: 0
});

const NET_HISTORY_MAX = 30;
const netHistory = ref<{ t: string; recv: number; sent: number }[]>([]);

let healthTimer: number | null = null;
let healthFailures = 0;
const MAX_HEALTH_FAILURES = 5;

const REFRESH_INTERVALS = [1, 3, 5, 8] as const;
const refreshIntervalSec = ref<(typeof REFRESH_INTERVALS)[number]>(3);

const refreshIntervalOptions = computed<DropdownOption[]>(() =>
  REFRESH_INTERVALS.map(sec => ({
    label: `${sec} 秒`,
    key: String(sec)
  }))
);

function stopHealthTimer() {
  if (healthTimer) {
    window.clearInterval(healthTimer);
    healthTimer = null;
  }
}

function startHealthTimer() {
  stopHealthTimer();
  const ms = Math.max(1, Number(refreshIntervalSec.value) || 3) * 1000;
  healthTimer = window.setInterval(() => {
    void refreshHost();
    void refreshPlatform();
  }, ms);
}

function onRefreshIntervalSelect(key: string | number) {
  const sec = Number(key);
  if (![1, 3, 5, 8].includes(sec)) return;
  refreshIntervalSec.value = sec as (typeof REFRESH_INTERVALS)[number];
  startHealthTimer();
}

const chartHooks = {
  onRender: () => undefined
};

function gaugeSeries(name: string, center: [string, string], color: string) {
  return {
    type: 'gauge' as const,
    name,
    center,
    radius: '88%',
    startAngle: 210,
    endAngle: -30,
    min: 0,
    max: 100,
    splitNumber: 5,
    itemStyle: { color },
    progress: { show: true, width: 12, roundCap: true },
    pointer: {
      show: true,
      length: '55%',
      width: 4,
      itemStyle: { color }
    },
    axisLine: {
      roundCap: true,
      lineStyle: {
        width: 12,
        color: [
          [0.55, 'rgba(103, 194, 58, 0.35)'],
          [0.8, 'rgba(230, 162, 60, 0.45)'],
          [1, 'rgba(245, 108, 108, 0.55)']
        ]
      }
    },
    axisTick: { show: false },
    splitLine: {
      length: 8,
      distance: -16,
      lineStyle: { width: 2, color: 'rgba(128,128,128,0.45)' }
    },
    axisLabel: {
      distance: -28,
      fontSize: 10,
      color: '#999',
      formatter: (v: number) => (v % 50 === 0 ? String(v) : '')
    },
    anchor: {
      show: true,
      showAbove: true,
      size: 10,
      itemStyle: { borderWidth: 2, borderColor: color, color: '#fff' }
    },
    title: { show: true, offsetCenter: [0, '78%'], fontSize: 12, color: '#999' },
    detail: {
      valueAnimation: true,
      offsetCenter: [0, '48%'],
      fontSize: 18,
      fontWeight: 700,
      formatter: '{value}%',
      color: 'inherit'
    },
    data: [{ value: 0, name }]
  };
}

function formatBytes(n?: number) {
  if (n == null || Number.isNaN(n)) return '-';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = Math.max(0, n);
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function formatBps(n?: number) {
  if (n == null || Number.isNaN(n)) return '-';
  return `${formatBytes(n)}/s`;
}

const hostDisks = computed(() => host.value?.disks || []);

function diskUsedPct(d: SystemHostDisk) {
  return Math.min(100, Math.max(0, Number(d.used_percent || 0)));
}

function diskProgressStatus(d: SystemHostDisk): 'success' | 'warning' | 'error' | 'default' {
  const pct = diskUsedPct(d);
  if (pct >= 90) return 'error';
  if (pct >= 75) return 'warning';
  return 'success';
}

const { domRef: gaugeDomRef, setOptions: setGaugeOptions } = useEcharts(
  () =>
    ({
      series: [gaugeSeries('CPU', ['25%', '52%'], '#56cdf3'), gaugeSeries('内存', ['75%', '52%'], '#719de3')]
    }) as ECOption,
  chartHooks
);

const { domRef: netDomRef, setOptions: setNetOptions } = useEcharts(
  () =>
    ({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number | string) => formatBps(Number(v))
      },
      legend: {
        data: ['下行', '上行'],
        top: 0,
        right: 0,
        textStyle: { fontSize: 11 }
      },
      grid: { left: 8, right: 8, top: 28, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [] as string[],
        axisLabel: { fontSize: 10, color: '#999' },
        axisLine: { lineStyle: { color: 'rgba(128,128,128,0.3)' } }
      },
      yAxis: {
        type: 'value',
        splitNumber: 3,
        axisLabel: {
          fontSize: 10,
          color: '#999',
          formatter: (v: number) => formatBytes(v)
        },
        splitLine: { lineStyle: { type: 'dashed', color: 'rgba(128,128,128,0.2)' } }
      },
      series: [
        {
          name: '下行',
          type: 'line',
          smooth: true,
          showSymbol: false,
          color: '#56cdf3',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(86,205,243,0.35)' },
                { offset: 1, color: 'rgba(86,205,243,0.02)' }
              ]
            }
          },
          data: [] as number[]
        },
        {
          name: '上行',
          type: 'line',
          smooth: true,
          showSymbol: false,
          color: '#f68057',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(246,128,87,0.3)' },
                { offset: 1, color: 'rgba(246,128,87,0.02)' }
              ]
            }
          },
          data: [] as number[]
        }
      ]
    }) as ECOption,
  chartHooks
);

function pushNetSample(h: SystemHostHealth) {
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  netHistory.value = [
    ...netHistory.value,
    {
      t,
      recv: Math.max(0, Number(h.net_recv_bps || 0)),
      sent: Math.max(0, Number(h.net_sent_bps || 0))
    }
  ].slice(-NET_HISTORY_MAX);
}

function syncHostCharts(h: SystemHostHealth | null) {
  if (!h) return;
  const cpu = Math.min(100, Math.max(0, Number(h.cpu_percent || 0)));
  const mem = Math.min(100, Math.max(0, Number(h.mem_used_percent || 0)));
  setGaugeOptions({
    series: [
      { data: [{ value: Number(cpu.toFixed(1)), name: 'CPU' }] },
      { data: [{ value: Number(mem.toFixed(1)), name: '内存' }] }
    ]
  } as ECOption);
  setNetOptions({
    xAxis: { data: netHistory.value.map(p => p.t) },
    series: [{ data: netHistory.value.map(p => p.recv) }, { data: netHistory.value.map(p => p.sent) }]
  } as ECOption);
}

watch(host, h => syncHostCharts(h), { deep: true });

interface StatCard {
  key: string;
  title: string;
  value: number | string;
  color: { start: string; end: string };
  icon: string;
  /** 跳转路由；无则不跳 */
  route?: RouteKey;
}

/** 平台自身管理数据指标（真实 API） */
const playStatCards = computed<StatCard[]>(() => [
  {
    key: 'users',
    title: '用户数',
    value: platform.value.users,
    color: { start: '#56cdf3', end: '#719de3' },
    icon: 'mdi:account-group',
    route: 'system_user'
  },
  {
    key: 'roles',
    title: '角色数',
    value: platform.value.roles,
    color: { start: '#865ec0', end: '#5144b4' },
    icon: 'mdi:shield-account',
    route: 'system_role'
  },
  {
    key: 'menus',
    title: '菜单数',
    value: platform.value.menus,
    color: { start: '#fcbc25', end: '#f68057' },
    icon: 'mdi:menu',
    route: 'system_menu'
  },
  {
    key: 'backups',
    title: '备份数',
    value: platform.value.backups,
    color: { start: '#ec4786', end: '#b955a4' },
    icon: 'mdi:database',
    route: 'system_backup'
  }
]);

function goStatCard(card: StatCard) {
  if (card.route) {
    void routerPushByKey(card.route);
  }
}

const [DefineGradientBg, GradientBg] = createReusableTemplate<{ gradientColor: string }>();

function getGradientColor(color: StatCard['color']) {
  return `linear-gradient(to bottom right, ${color.start}, ${color.end})`;
}

async function refreshPlatform() {
  const [u, r, m, b] = await Promise.all([fetchUsers(), fetchRoles(), fetchMenus(), fetchBackups()]);
  if (!u.error) platform.value.users = (u.data?.items || []).length;
  if (!r.error) platform.value.roles = (r.data?.items || []).length;
  if (!m.error) platform.value.menus = (m.data?.items || []).length;
  if (!b.error) platform.value.backups = (b.data?.items || []).length;
}

async function refreshHost() {
  const { data, error } = await fetchSystemHealth();
  if (error) {
    healthFailures += 1;
    if (healthFailures >= MAX_HEALTH_FAILURES) stopHealthTimer();
    return;
  }
  healthFailures = 0;
  const next = data?.host || null;
  if (next) pushNetSample(next);
  host.value = next;
}

async function refreshAll() {
  loading.value = true;
  try {
    await Promise.all([refreshHost(), refreshPlatform()]);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refreshAll();
  await nextTick();
  syncHostCharts(host.value);
  startHealthTimer();
});

onUnmounted(() => {
  stopHealthTimer();
});
</script>

<template>
  <NSpace vertical :size="16">
    <DefineGradientBg v-slot="{ $slots, gradientColor }">
      <div
        class="px-16px pb-4px pt-8px text-white"
        :style="{ backgroundImage: gradientColor, borderRadius: `${themeStore.themeRadius}px` }"
      >
        <component :is="$slots.default" />
      </div>
    </DefineGradientBg>

    <!-- 欢迎区 -->
    <NCard :bordered="false" class="card-wrapper">
      <div class="flex flex-wrap items-center justify-between gap-12px">
        <div class="flex-y-center">
          <div class="size-56px shrink-0 overflow-hidden rd-1/2 bg-primary/10 flex-center">
            <NAvatar
              round
              :size="56"
              :src="welcomeAvatarSrc"
              :fallback-src="defaultAvatarUrl"
              style="background: transparent"
            />
          </div>
          <div class="pl-12px">
            <h3 class="text-18px font-semibold">你好，{{ authStore.userInfo.userName || 'Admin' }}</h3>
            <p class="text-#999 leading-24px text-13px">控制台 · 平台健康与系统概览</p>
          </div>
        </div>
        <div class="flex-y-center gap-12px">
          <div class="flex-y-center gap-6px">
            <span class="sse-live-dot" :class="{ 'is-on': sseConnected }" />
            <span class="text-12px" :class="sseConnected ? 'text-[#67c23a]' : 'text-#999'">
              {{ sseConnected ? 'SSE · live' : 'SSE · 离线' }}
            </span>
          </div>
          <NDropdown
            trigger="click"
            placement="bottom-end"
            :options="refreshIntervalOptions"
            @select="onRefreshIntervalSelect"
          >
            <NButton size="small">
              间隔刷新({{ refreshIntervalSec }}秒)
              <SvgIcon icon="mdi:chevron-down" class="ml-4px text-14px" />
            </NButton>
          </NDropdown>
          <NButton size="small" title="刷新" :loading="loading" @click="refreshAll">
            <template #icon>
              <SvgIcon icon="mdi:refresh" />
            </template>
          </NButton>
        </div>
      </div>
    </NCard>

    <!-- 平台数据指标 -->
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NGrid cols="s:1 m:2 l:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGi v-for="item in playStatCards" :key="item.key">
          <GradientBg :gradient-color="getGradientColor(item.color)">
            <div
              class="flex justify-between items-start cursor-pointer select-none"
              role="link"
              tabindex="0"
              @click="goStatCard(item)"
              @keydown.enter="goStatCard(item)"
            >
              <div>
                <h3 class="text-16px">{{ item.title }}</h3>
                <p class="text-28px font-bold pt-8px">{{ item.value }}</p>
              </div>
              <SvgIcon :icon="item.icon" class="text-36px opacity-80" />
            </div>
          </GradientBg>
        </NGi>
      </NGrid>
    </NCard>

    <!-- 系统健康 -->
    <NCard :bordered="false" size="small" class="card-wrapper" title="系统健康（API 本机）">
      <div class="flex flex-col md:flex-row gap-8px">
        <div class="md:w-3/5 min-w-0">
          <div ref="gaugeDomRef" class="h-168px w-full"></div>
          <div class="flex justify-around text-12px text-#999 -mt-6px px-8px">
            <span>CPU · {{ host?.cpu_cores ?? '-' }} 核</span>
            <span>
              内存 {{ formatBytes(host?.mem_used_bytes) }} /
              {{ formatBytes(host?.mem_total_bytes) }}
            </span>
          </div>
        </div>
        <div class="md:w-2/5 min-w-0">
          <div class="text-12px text-#999 mb-2px flex justify-between gap-8px flex-wrap">
            <span>网络趋势</span>
            <span>↓ {{ formatBps(host?.net_recv_bps) }} · ↑ {{ formatBps(host?.net_sent_bps) }}</span>
          </div>
          <div ref="netDomRef" class="h-156px w-full"></div>
        </div>
      </div>

      <div class="mt-16px pt-12px border-t border-#efeff5 dark:border-#ffffff14">
        <div class="text-13px font-medium mb-10px">硬盘容量</div>
        <NEmpty v-if="!hostDisks.length" description="暂无文件系统数据" class="py-12px" />
        <div v-else class="flex flex-col gap-10px">
          <div v-for="(d, idx) in hostDisks" :key="`${d.mount || ''}-${idx}`" class="disk-fs-item min-w-0">
            <div class="disk-fs-row">
              <div class="disk-fs-name min-w-0">
                <SvgIcon icon="ri:hard-drive-2-line" class="text-16px text-#666 shrink-0" />
                <span class="font-medium text-13px truncate" :title="d.mount">{{ d.mount || '-' }}</span>
                <span v-if="d.fstype" class="text-#999 text-12px shrink-0">{{ d.fstype }}</span>
              </div>
              <div class="disk-fs-bar min-w-0">
                <NProgress
                  type="line"
                  :percentage="diskUsedPct(d)"
                  :status="diskProgressStatus(d)"
                  indicator-placement="inside"
                  :height="18"
                  :border-radius="4"
                  :fill-border-radius="4"
                  rail-color="rgba(0,0,0,0.06)"
                >
                  {{ formatBytes(d.used_bytes) }} / {{ formatBytes(d.total_bytes) }} · {{ diskUsedPct(d).toFixed(1) }}%
                </NProgress>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NCard>
  </NSpace>
</template>

<style scoped>
.sse-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c2c2c2;
  transition: background-color 0.3s;
}
.sse-live-dot.is-on {
  background: #67c23a;
  animation: sse-live-pulse 1.8s ease-out infinite;
}
@keyframes sse-live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.45);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(103, 194, 58, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}
.disk-fs-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
}
.disk-fs-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.disk-fs-name {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 160px;
  max-width: 200px;
}
.disk-fs-bar {
  flex: 1 1 auto;
  min-width: 0;
}
.disk-fs-bar :deep(.n-progress-icon) {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
html.dark .disk-fs-item {
  background: rgba(255, 255, 255, 0.06);
}
</style>
