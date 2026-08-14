<script setup lang="ts">
import { computed, h, watch, type VNodeChild } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NBadge, NButton, NDropdown, NEmpty, NScrollbar, NTooltip, type DropdownOption } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAppStore } from '@/store/modules/app';
import { useAuthStore } from '@/store/modules/auth';
import { useNotificationStore } from '@/store/modules/notification';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/datetime';

defineOptions({ name: 'NotificationBell' });

const appStore = useAppStore();
const authStore = useAuthStore();
const notifyStore = useNotificationStore();
const route = useRoute();
const router = useRouter();

const badgeValue = computed(() => (notifyStore.unreadCount > 99 ? '99+' : notifyStore.unreadCount));

watch(
  () => authStore.isLogin,
  login => {
    if (login) {
      notifyStore.connect();
    } else {
      notifyStore.reset();
    }
  },
  { immediate: true }
);

function onDropdownUpdate(show: boolean) {
  if (!show || !authStore.isLogin) return;
  // SSE 偶发断开时，打开面板先拉列表并尝试重连，保证角标/列表能追上。
  void notifyStore.refreshList();
  if (!notifyStore.connected) {
    notifyStore.reconnect();
  }
}

function isCurrentPage(link: string) {
  const resolved = router.resolve(link);
  if (resolved.path !== route.path) return false;
  const a = resolved.query;
  const b = route.query;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    const as = Array.isArray(av) ? av.join(',') : String(av ?? '');
    const bs = Array.isArray(bv) ? bv.join(',') : String(bv ?? '');
    if (as !== bs) return false;
  }
  return true;
}

async function onItemClick(id: number, link: string) {
  await notifyStore.markRead(id);
  const target = (link || '').trim();
  if (!target) return;
  // 已在目标页时 router.push 无感，改为与标签栏刷新相同的 reloadPage。
  if (isCurrentPage(target)) {
    await appStore.reloadPage();
    return;
  }
  await router.push(target);
}

async function onClearOne(e: MouseEvent, id: number) {
  e.stopPropagation();
  e.preventDefault();
  await notifyStore.clearOne(id);
}

async function onClearAll(e?: MouseEvent) {
  e?.stopPropagation();
  e?.preventDefault();
  await notifyStore.clearAll();
}

async function onMarkAllRead(e?: MouseEvent) {
  e?.stopPropagation();
  e?.preventDefault();
  await notifyStore.markAllRead();
}

function renderIconAction(opts: {
  tip: string;
  icon: string;
  disabled?: boolean;
  onClick: (e: MouseEvent) => void;
}): VNodeChild {
  return h(
    NTooltip,
    { placement: 'bottom', delay: 300 },
    {
      trigger: () =>
        h(
          NButton,
          {
            text: true,
            size: 'tiny',
            disabled: opts.disabled,
            class: 'h-28px w-28px',
            onClick: (e: MouseEvent) => opts.onClick(e)
          },
          {
            default: () => h(SvgIcon, { icon: opts.icon, class: 'text-16px' })
          }
        ),
      default: () => opts.tip
    }
  );
}

function renderHeader(): VNodeChild {
  const empty = notifyStore.items.length === 0;
  const noUnread = notifyStore.unreadCount <= 0;
  return h(
    'div',
    {
      class: 'flex items-center justify-between px-12px py-8px border-b border-#efeff5 dark:border-#ffffff1a shrink-0'
    },
    [
      h('span', { class: 'text-14px font-medium' }, $t('notification.title')),
      h('div', { class: 'flex items-center gap-2px' }, [
        renderIconAction({
          tip: $t('notification.markAllRead'),
          icon: 'mdi:email-check-outline',
          disabled: empty || noUnread,
          onClick: e => onMarkAllRead(e)
        }),
        renderIconAction({
          tip: $t('notification.clearAll'),
          icon: 'mdi:delete-outline',
          disabled: empty,
          onClick: e => onClearAll(e)
        })
      ])
    ]
  );
}

function renderItem(item: (typeof notifyStore.items)[number]): VNodeChild {
  return h(
    'div',
    {
      class:
        'group flex items-start gap-8px w-full px-12px py-10px hover:bg-[rgb(var(--primary-color)/0.06)] transition-colors cursor-pointer',
      onClick: () => onItemClick(item.id, item.link)
    },
    [
      h('span', {
        class: [
          'mt-6px h-7px w-7px rounded-full shrink-0',
          item.read ? 'bg-transparent' : 'bg-[rgb(var(--primary-color))]'
        ]
      }),
      h('div', { class: 'min-w-0 flex-1' }, [
        h(
          'div',
          { class: ['text-13px font-medium truncate', item.read ? 'opacity-70' : ''] },
          item.title || item.event
        ),
        item.body ? h('div', { class: 'text-12px text-#666 dark:text-#aaa mt-2px line-clamp-2' }, item.body) : null,
        h('div', { class: 'text-11px text-#999 mt-4px' }, formatDateTime(item.created_at))
      ]),
      h(
        'div',
        {
          class: 'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          onClick: (e: MouseEvent) => e.stopPropagation()
        },
        [
          renderIconAction({
            tip: $t('notification.clearOne'),
            icon: 'mdi:close',
            onClick: e => onClearOne(e, item.id)
          })
        ]
      )
    ]
  );
}

function renderPanel(): VNodeChild {
  const body =
    notifyStore.items.length === 0
      ? h('div', { class: 'py-20px' }, [h(NEmpty, { description: $t('notification.empty'), size: 'small' })])
      : notifyStore.items.map(item => renderItem(item));

  return h(
    'div',
    {
      class: 'notification-panel w-360px',
      onClick: (e: MouseEvent) => e.preventDefault()
    },
    [
      renderHeader(),
      h(
        NScrollbar,
        {
          class: 'notification-panel__scroll',
          style: { maxHeight: '360px' }
        },
        { default: () => body }
      )
    ]
  );
}

const options = computed<DropdownOption[]>(() => [
  {
    key: '__panel__',
    type: 'render',
    render: renderPanel
  }
]);
</script>

<template>
  <NDropdown
    trigger="click"
    placement="bottom-end"
    :options="options"
    :show-arrow="false"
    :menu-props="
      () => ({
        class: 'notification-dropdown-menu'
      })
    "
    @update:show="onDropdownUpdate"
  >
    <div>
      <ButtonIcon :tooltip-content="$t('icon.notification')" tooltip-placement="bottom">
        <NBadge :value="badgeValue" :show="notifyStore.unreadCount > 0" :max="99">
          <SvgIcon icon="mdi:bell-outline" />
        </NBadge>
      </ButtonIcon>
    </div>
  </NDropdown>
</template>

<style>
/* Dropdown teleports to body — keep header fixed; only NScrollbar overlays. */
.notification-dropdown-menu.n-dropdown-menu {
  width: 360px;
  padding: 0 !important;
  overflow: hidden;
}

.notification-dropdown-menu .n-dropdown-option {
  padding: 0 !important;
  background-color: transparent !important;
}

.notification-dropdown-menu .n-dropdown-option:hover {
  background-color: transparent !important;
}

.notification-panel__scroll > .n-scrollbar-container {
  scrollbar-width: none;
}

.notification-panel__scroll > .n-scrollbar-container::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
