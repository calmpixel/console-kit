import { request } from '../request';

export type SystemHostDisk = {
  mount?: string;
  fstype?: string;
  total_bytes?: number;
  used_bytes?: number;
  free_bytes?: number;
  used_percent?: number;
};

export type SystemHostHealth = {
  cpu_percent?: number;
  cpu_cores?: number;
  mem_total_bytes?: number;
  mem_used_bytes?: number;
  mem_avail_bytes?: number;
  mem_used_percent?: number;
  net_bytes_recv?: number;
  net_bytes_sent?: number;
  net_recv_bps?: number;
  net_sent_bps?: number;
  disks?: SystemHostDisk[];
  sampled_at?: string;
};

export function fetchSystemHealth() {
  return request<{ ok?: boolean; host?: SystemHostHealth }>({
    url: '/system/health'
  });
}
