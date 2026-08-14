import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
  clearAllNotifications,
  clearNotification,
  fetchNotificationUnreadCount,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsStreamURL,
  type ConsoleNotification
} from '@/service/api';
import { SetupStoreId } from '@/enum';
import { localStg } from '@/utils/storage';

type NotifyHandler = (n: ConsoleNotification) => void;

const eventHandlers = new Map<string, Set<NotifyHandler>>();
const anyHandlers = new Set<NotifyHandler>();

/** No SSE traffic → force reconnect. */
const STALE_MS = 40_000;
/** First ready must arrive within this after open. */
const CONNECT_TIMEOUT_MS = 8_000;
const WATCHDOG_MS = 5_000;
/** REST fallback so badge updates even when SSE is buffered/dead. */
const POLL_MS = 8_000;

export function onNotificationEvent(events: string | string[], handler: NotifyHandler) {
  const list = Array.isArray(events) ? events : [events];
  for (const ev of list) {
    let set = eventHandlers.get(ev);
    if (!set) {
      set = new Set();
      eventHandlers.set(ev, set);
    }
    set.add(handler);
  }
  return () => {
    for (const ev of list) {
      eventHandlers.get(ev)?.delete(handler);
    }
  };
}

export function onAnyNotification(handler: NotifyHandler) {
  anyHandlers.add(handler);
  return () => {
    anyHandlers.delete(handler);
  };
}

function emitNotification(n: ConsoleNotification) {
  anyHandlers.forEach(h => h(n));
  eventHandlers.get(n.event)?.forEach(h => h(n));
}

export const useNotificationStore = defineStore(SetupStoreId.Notification, () => {
  const items = ref<ConsoleNotification[]>([]);
  const unreadCount = ref(0);
  const connected = ref(false);

  let es: EventSource | null = null;
  let intentionalClose = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdogTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectAttempt = 0;
  let lastEventAt = 0;
  let connectStartedAt = 0;
  let visibilityBound = false;
  let syncing = false;

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function clearPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function touch() {
    lastEventAt = Date.now();
    connected.value = true;
    reconnectAttempt = 0;
  }

  function scheduleReconnect() {
    if (intentionalClose || reconnectTimer) return;
    const delay = Math.min(10000, 1000 * 2 ** Math.min(reconnectAttempt, 3));
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (intentionalClose) return;
      if (!localStg.get('token')) return;
      forceConnect();
    }, delay);
  }

  function startWatchdog() {
    if (watchdogTimer) return;
    watchdogTimer = setInterval(() => {
      if (intentionalClose || !localStg.get('token')) return;

      // Never received ready / ping / notification.
      if (!lastEventAt) {
        if (connectStartedAt && Date.now() - connectStartedAt > CONNECT_TIMEOUT_MS) {
          forceConnect();
        }
        return;
      }

      if (Date.now() - lastEventAt > STALE_MS) {
        forceConnect();
      }
    }, WATCHDOG_MS);
  }

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (intentionalClose || !localStg.get('token')) return;
      void syncFromServer({ emitNew: true });
    }, POLL_MS);
  }

  function bindVisibility() {
    if (visibilityBound || typeof document === 'undefined') return;
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (intentionalClose || !localStg.get('token')) return;
      void syncFromServer({ emitNew: true });
      if (!connected.value || !lastEventAt || Date.now() - lastEventAt > STALE_MS) {
        forceConnect();
      }
    });
  }

  function upsertItem(n: ConsoleNotification, prepend = true) {
    const idx = items.value.findIndex(x => x.id === n.id);
    if (idx >= 0) {
      items.value[idx] = { ...items.value[idx], ...n };
      return;
    }
    if (prepend) {
      items.value = [n, ...items.value].slice(0, 50);
    } else {
      items.value.push(n);
    }
  }

  function handleIncoming(n: ConsoleNotification) {
    const existed = items.value.some(x => x.id === n.id);
    upsertItem(n, true);
    if (!existed && !n.read) {
      unreadCount.value += 1;
    }
    emitNotification(n);
  }

  /**
   * Pull inbox via REST. Used as fallback when SSE is dead/buffered,
   * and when opening the bell. Optionally emit newly seen unread items
   * so page hooks still fire.
   */
  async function syncFromServer(opts?: { emitNew?: boolean }) {
    if (syncing) return;
    if (!localStg.get('token')) return;
    syncing = true;
    try {
      const prevIds = new Set(items.value.map(x => x.id));
      const { data, error } = await fetchNotifications({ limit: 30 });
      if (error) return;
      const next = data?.items || [];
      items.value = next;

      const countRes = await fetchNotificationUnreadCount();
      if (!countRes.error) {
        unreadCount.value = Number(countRes.data?.count || 0);
      } else {
        unreadCount.value = next.filter(x => !x.read).length;
      }

      if (opts?.emitNew) {
        for (const n of next) {
          if (!n.read && !prevIds.has(n.id)) {
            emitNotification(n);
          }
        }
      }
    } finally {
      syncing = false;
    }
  }

  function bindEventSource(source: EventSource) {
    source.addEventListener('ready', (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as {
          unread_count?: number;
          items?: ConsoleNotification[];
        };
        unreadCount.value = Number(data.unread_count || 0);
        items.value = data.items || [];
        touch();
      } catch {
        /* ignore */
      }
    });
    source.addEventListener('notification', (ev: MessageEvent) => {
      try {
        touch();
        const data = JSON.parse(ev.data) as { item?: ConsoleNotification };
        if (data.item) handleIncoming(data.item);
      } catch {
        /* ignore */
      }
    });
    source.addEventListener('ping', () => {
      touch();
    });
    source.addEventListener('error', () => {
      connected.value = false;
      if (intentionalClose) return;
      if (source.readyState === EventSource.CLOSED) {
        if (es === source) es = null;
        scheduleReconnect();
      }
    });
  }

  function forceConnect() {
    clearReconnectTimer();
    intentionalClose = false;
    const token = localStg.get('token');
    if (!token) {
      disconnect();
      return;
    }
    if (es) {
      try {
        es.close();
      } catch {
        /* ignore */
      }
      es = null;
    }
    connected.value = false;
    lastEventAt = 0;
    connectStartedAt = Date.now();
    const source = new EventSource(notificationsStreamURL(token));
    es = source;
    bindEventSource(source);
    startWatchdog();
    startPoll();
    bindVisibility();
  }

  function connect() {
    intentionalClose = false;
    bindVisibility();
    startWatchdog();
    startPoll();
    const token = localStg.get('token');
    if (!token) {
      disconnect();
      return;
    }
    if (es && es.readyState === EventSource.OPEN && lastEventAt && Date.now() - lastEventAt < STALE_MS) {
      return;
    }
    forceConnect();
    // Bootstrap badge immediately via REST (don't wait for SSE).
    void syncFromServer({ emitNew: false });
  }

  function disconnect() {
    intentionalClose = true;
    clearReconnectTimer();
    clearWatchdog();
    clearPoll();
    reconnectAttempt = 0;
    lastEventAt = 0;
    connectStartedAt = 0;
    if (es) {
      try {
        es.close();
      } catch {
        /* ignore */
      }
      es = null;
    }
    connected.value = false;
  }

  function reconnect() {
    intentionalClose = false;
    forceConnect();
  }

  async function refreshList() {
    await syncFromServer({ emitNew: false });
  }

  async function markRead(id: number) {
    const { error } = await markNotificationRead(id);
    if (error) return;
    const row = items.value.find(x => x.id === id);
    if (row && !row.read) {
      row.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllRead() {
    const { error } = await markAllNotificationsRead();
    if (error) return;
    items.value = items.value.map(x => ({ ...x, read: true }));
    unreadCount.value = 0;
  }

  async function clearOne(id: number) {
    const row = items.value.find(x => x.id === id);
    const { error } = await clearNotification(id);
    if (error) return;
    items.value = items.value.filter(x => x.id !== id);
    if (row && !row.read) {
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function clearAll() {
    const { error } = await clearAllNotifications();
    if (error) return;
    items.value = [];
    unreadCount.value = 0;
  }

  function reset() {
    disconnect();
    items.value = [];
    unreadCount.value = 0;
  }

  return {
    items,
    unreadCount,
    connected,
    connect,
    disconnect,
    reconnect,
    refreshList,
    syncFromServer,
    markRead,
    markAllRead,
    clearOne,
    clearAll,
    reset,
    handleIncoming
  };
});
