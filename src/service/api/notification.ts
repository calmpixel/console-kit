import { request } from '../request';
import { localStg } from '@/utils/storage';

export type ConsoleNotification = {
  id: number;
  event: string;
  title: string;
  body: string;
  link: string;
  payload?: Record<string, unknown>;
  created_by: number;
  created_at: string;
  read: boolean;
};

export function fetchNotifications(params?: { limit?: number; before_id?: number; unread_only?: boolean }) {
  return request<{ ok?: boolean; items?: ConsoleNotification[] }>({
    url: '/notifications',
    params: {
      limit: params?.limit,
      before_id: params?.before_id,
      unread_only: params?.unread_only ? '1' : undefined
    }
  });
}

export function fetchNotificationUnreadCount() {
  return request<{ ok?: boolean; count?: number }>({ url: '/notifications/unread-count' });
}

export function markNotificationRead(id: number) {
  return request<{ ok?: boolean }>({ url: `/notifications/${id}/read`, method: 'post' });
}

export function markAllNotificationsRead() {
  return request<{ ok?: boolean; marked?: number }>({ url: '/notifications/read-all', method: 'post' });
}

export function clearNotification(id: number) {
  return request<{ ok?: boolean }>({ url: `/notifications/${id}`, method: 'delete' });
}

export function clearAllNotifications() {
  return request<{ ok?: boolean; cleared?: number }>({ url: '/notifications/clear-all', method: 'post' });
}

export function notificationsStreamURL(token?: string) {
  const t = token ?? localStg.get('token') ?? '';
  return `/api/console/v1/notifications/stream?access_token=${encodeURIComponent(t)}`;
}
