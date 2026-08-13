import { request } from '../request';

export type AdminRole = {
  id: number;
  code: string;
  name: string;
  scope_kind: string;
  scope_id: string;
  builtin: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CatalogPerm = {
  code: string;
  name: string;
};

export type CreateRoleBody = {
  code: string;
  name: string;
  scope_kind?: string;
  scope_id?: string;
};

export type PatchRoleBody = {
  name?: string;
  scope_kind?: string;
  scope_id?: string;
};

export type FetchRolesParams = {
  q?: string;
  status?: 'all' | 'builtin' | 'custom' | '';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export function fetchRoles(params: FetchRolesParams = {}) {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  return request<{ ok?: boolean; items?: AdminRole[] }>({ url: '/roles', params: query });
}

export function createRole(data: CreateRoleBody) {
  return request<{ ok?: boolean; id?: number }>({ url: '/roles', method: 'post', data });
}

export function patchRole(id: number, data: PatchRoleBody) {
  return request<{ ok?: boolean }>({ url: `/roles/${id}`, method: 'patch', data });
}

export function deleteRole(id: number) {
  return request<{ ok?: boolean }>({ url: `/roles/${id}`, method: 'delete' });
}

export function batchDeleteRoles(ids: number[]) {
  return request<{ ok?: boolean; deleted?: number }>({
    url: '/roles/batch-delete',
    method: 'post',
    data: { ids }
  });
}

export function fetchRolePermissions(id: number) {
  return request<{ ok?: boolean; permissions?: string[] }>({ url: `/roles/${id}/permissions` });
}

export function setRolePermissions(id: number, permissions: string[]) {
  return request<{ ok?: boolean }>({
    url: `/roles/${id}/permissions`,
    method: 'put',
    data: { permissions }
  });
}

export function fetchPermissionCatalog() {
  return request<{ ok?: boolean; items?: CatalogPerm[] }>({ url: '/permissions' });
}
