/** Display labels for API status codes (UI only; values stay English). */
const STATUS_LABELS: Record<string, string> = {
  enabled: '启用',
  disabled: '禁用',
  active: '启用',
  inactive: '停用',
  online: '在线',
  offline: '离线',
  published: '已发布',
  yanked: '已下架',
  done: '完成',
  failed: '失败',
  running: '运行中',
  provisioning: '安装中',
  starting: '启动中',
  stopping: '停止中',
  faulted: '故障',
  exited: '已退出',
  pending: '待处理',
  none: '无',
  unknown: '未知',
  revoked: '已吊销',
  backup: '备份',
  restore: '恢复'
};

export function statusLabel(status: string | null | undefined, fallback = '-'): string {
  const key = String(status || '').trim();
  if (!key) return fallback;
  return STATUS_LABELS[key] ?? STATUS_LABELS[key.toLowerCase()] ?? key;
}
