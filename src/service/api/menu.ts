import { request } from '../request';

export type AdminMenu = {
  id: number;
  parent_id: number | null;
  route_name: string;
  path: string;
  component: string;
  icon: string;
  order_no: number;
  hide_in_menu: boolean;
  permission_code: string;
  status: string;
  title: string;
  created_at?: string;
  updated_at?: string;
};

export type MenuBody = {
  parent_id?: number | null;
  route_name: string;
  path?: string;
  component?: string;
  icon?: string;
  order_no?: number;
  hide_in_menu?: boolean;
  permission_code?: string;
  status?: string;
  title?: string;
};

export type MenuOrderItem = {
  id: number;
  parent_id: number | null;
  order_no: number;
};

export function fetchMenus() {
  return request<{ ok?: boolean; items?: AdminMenu[] }>({ url: '/menus' });
}

export function createMenu(data: MenuBody) {
  return request<{ ok?: boolean; id?: number }>({ url: '/menus', method: 'post', data });
}

export function patchMenu(id: number, data: MenuBody) {
  return request<{ ok?: boolean }>({ url: `/menus/${id}`, method: 'patch', data });
}

export function deleteMenu(id: number) {
  return request<{ ok?: boolean }>({ url: `/menus/${id}`, method: 'delete' });
}

export function reorderMenus(items: MenuOrderItem[]) {
  return request<{ ok?: boolean }>({ url: '/menus/reorder', method: 'put', data: { items } });
}
