import { onMounted, onUnmounted } from 'vue';
import type { ConsoleNotification } from '@/service/api';
import { onNotificationEvent } from '@/store/modules/notification';

/**
 * Subscribe to console notification events while the page is mounted.
 * Use to auto-refresh when a matching backend Notify(event) arrives.
 */
export function useNotificationEvents(
  events: string | string[],
  handler: (n: ConsoleNotification) => void
) {
  let off: (() => void) | undefined;

  onMounted(() => {
    off = onNotificationEvent(events, handler);
  });

  onUnmounted(() => {
    off?.();
  });
}
