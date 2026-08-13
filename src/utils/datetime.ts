import dayjs from 'dayjs';

/**
 * Backend SQLite uses `datetime('now')` / CURRENT_TIMESTAMP → UTC wall time
 * without a zone suffix (`YYYY-MM-DD HH:mm:ss`). dayjs would otherwise parse
 * that as local and skew age/online by the TZ offset (e.g. +8h in China).
 * RFC3339 / strings with Z or ±offset are left as-is.
 */
const SQLITE_NAIVE_UTC = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function parseBackendTime(value?: string | null): dayjs.Dayjs | null {
  const s = (value || '').trim();
  if (!s) return null;
  const raw = SQLITE_NAIVE_UTC.test(s) ? `${s.replace(' ', 'T')}Z` : s;
  const d = dayjs(raw);
  return d.isValid() ? d : null;
}

/** Display timestamps as local `YYYY-MM-DD HH:mm:ss` (handles RFC3339 / SQLite UTC). */
export function formatDateTime(value?: string | null): string {
  const d = parseBackendTime(value);
  if (!d) return (value || '').trim() ? String(value).trim() : '-';
  return d.format('YYYY-MM-DD HH:mm:ss');
}

/** Human age like `12秒前` / `3分钟前` / `2小时前`. */
export function formatAge(value?: string | null, nowMs = Date.now()): string {
  const s = (value || '').trim();
  if (!s) return '从未上报';
  const d = parseBackendTime(s);
  if (!d) return s;
  const sec = Math.max(0, Math.floor((nowMs - d.valueOf()) / 1000));
  if (sec < 5) return '刚刚';
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 48) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  return `${day}天前`;
}

/** Phone stays online this long after agent.phone_list (matches store.PhoneOnlineTTL). */
export const PHONE_ONLINE_TTL_MS = 45_000;

export function isPhoneOnlineByLastSeen(lastSeenAt?: string | null, nowMs = Date.now()): boolean {
  const d = parseBackendTime(lastSeenAt);
  if (!d) return false;
  return nowMs - d.valueOf() <= PHONE_ONLINE_TTL_MS;
}
