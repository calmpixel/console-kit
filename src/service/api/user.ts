import { request } from '../request';

export type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  avatar?: string;
  disabled: boolean;
  role_ids: number[];
  created_at?: string;
  updated_at?: string;
};

export type CreateUserBody = {
  username: string;
  password: string;
  display_name?: string;
  avatar?: string;
  role_ids?: number[];
};

export type PatchUserBody = {
  username?: string;
  display_name?: string;
  avatar?: string;
  disabled?: boolean;
};

export type FetchUsersParams = {
  q?: string;
  status?: 'all' | 'active' | 'disabled' | '';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export function fetchUsers(params: FetchUsersParams = {}) {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  return request<{ ok?: boolean; items?: AdminUser[] }>({ url: '/users', params: query });
}

export function createUser(data: CreateUserBody) {
  return request<{ ok?: boolean; id?: number }>({ url: '/users', method: 'post', data });
}

export function patchUser(id: number, data: PatchUserBody) {
  return request<{ ok?: boolean }>({ url: `/users/${id}`, method: 'patch', data });
}

export function uploadUserAvatar(id: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<{ ok?: boolean; avatar?: string }>({
    url: `/users/${id}/avatar`,
    method: 'post',
    data: form
  });
}

export function setUserRoles(id: number, roleIds: number[]) {
  return request<{ ok?: boolean }>({ url: `/users/${id}/roles`, method: 'put', data: { role_ids: roleIds } });
}

export function resetUserPassword(id: number, password: string) {
  return request<{ ok?: boolean }>({
    url: `/users/${id}/reset-password`,
    method: 'post',
    data: { password }
  });
}

export function batchDisableUsers(ids: number[], disabled: boolean) {
  return request<{ ok?: boolean; updated?: number }>({
    url: '/users/batch-disabled',
    method: 'post',
    data: { ids, disabled }
  });
}

export function deleteUser(id: number) {
  return request<{ ok?: boolean }>({ url: `/users/${id}`, method: 'delete' });
}

export function batchDeleteUsers(ids: number[]) {
  return request<{ ok?: boolean; deleted?: number }>({
    url: '/users/batch-delete',
    method: 'post',
    data: { ids }
  });
}
