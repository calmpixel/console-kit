import { request } from '../request';

export type BackupJob = {
  id: number;
  kind: string;
  status: string;
  file_path: string;
  size_bytes: number;
  note: string;
  parent_id?: number;
  options?: { structure?: boolean; data?: boolean } | Record<string, unknown>;
  progress?: number;
  phase?: string;
  created_at: string;
  finished_at?: string;
};

export type BackupDetail = BackupJob & {
  restores?: BackupJob[];
};

export type LogEntry = {
  id: number;
  user_id?: number;
  username: string;
  display_name?: string;
  action: string;
  target_type: string;
  target_id: string;
  detail?: Record<string, unknown>;
  ip: string;
  method?: string;
  path?: string;
  status_code?: number;
  latency_ms?: number;
  request_id?: string;
  user_agent?: string;
  referer?: string;
  auth_type?: string;
  auth_masked?: string;
  created_at: string;
};

export type FetchBackupsParams = {
  q?: string;
  status?: 'all' | 'done' | 'failed' | 'running' | '';
  kind?: 'backup' | 'restore' | 'all' | '';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export function fetchBackups(params: FetchBackupsParams = {}) {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.kind) query.kind = params.kind;
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  return request<{ ok?: boolean; items?: BackupJob[] }>({ url: '/backups', params: query });
}

export function fetchBackup(id: number) {
  return request<{ ok?: boolean; item?: BackupDetail }>({ url: `/backups/${id}` });
}

export function fetchBackupJob(id: number) {
  return request<{ ok?: boolean; job?: BackupJob }>({ url: `/backups/jobs/${id}` });
}

export function createBackupJob() {
  return request<{ ok?: boolean; job?: BackupJob }>({ url: '/backups', method: 'post', data: {} });
}

export function uploadBackup(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<{ ok?: boolean; job?: BackupJob }>({
    url: '/backups/upload',
    method: 'post',
    data: form
  });
}

export function downloadBackup(id: number) {
  return request<Blob, 'blob'>({ url: `/backups/${id}/download`, responseType: 'blob' });
}

export function deleteBackup(id: number) {
  return request<{ ok?: boolean }>({ url: `/backups/${id}`, method: 'delete' });
}

export function startRestore(id: number, opts: { structure: boolean; data: boolean }) {
  return request<{ ok?: boolean; job?: BackupJob }>({
    url: `/backups/${id}/restore`,
    method: 'post',
    data: opts
  });
}

export type OpLogResult = 'success' | 'client_error' | 'server_error';

export type FetchLogsParams = {
  q?: string;
  result?: OpLogResult[] | string;
  from?: string;
  to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
};

function buildLogQuery(params: FetchLogsParams) {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.from?.trim()) query.from = params.from.trim();
  if (params.to?.trim()) query.to = params.to.trim();
  if (params.result) {
    const list = Array.isArray(params.result) ? params.result : [params.result];
    const joined = list
      .map(s => String(s).trim())
      .filter(Boolean)
      .join(',');
    if (joined) query.result = joined;
  }
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  if (params.limit) query.limit = String(params.limit);
  return query;
}

export function fetchOpLogs(params: FetchLogsParams = {}) {
  return request<{ ok?: boolean; items?: LogEntry[] }>({ url: '/op-logs', params: buildLogQuery(params) });
}

export function fetchOpLog(id: number) {
  return request<{ ok?: boolean; item?: LogEntry }>({ url: `/op-logs/${id}` });
}
