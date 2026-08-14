/**
 * 简易平台 mock：登录 + 系统管理各页面（用户/角色/菜单/设置/操作日志/备份/通知）完整可逛。
 * 数据存于模块内存，写操作即时生效；在 request.onRequest 里调用 applyPlatformMock(config)。
 */
import type { InternalAxiosRequestConfig } from 'axios';

// ---------- 小工具 ----------
let mockSeq = 1000;
function nextID(): number {
  mockSeq += 1;
  return mockSeq;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ---------- 权限目录 ----------
const PERMISSION_CATALOG: { code: string; name: string }[] = [
  { code: 'platform.dashboard.read', name: '工作台查看' },
  { code: 'platform.user.manage', name: '用户管理' },
  { code: 'platform.role.manage', name: '角色管理' },
  { code: 'platform.menu.manage', name: '菜单管理' },
  { code: 'platform.settings.manage', name: '系统设置' },
  { code: 'platform.logs.read', name: '操作日志查看' },
  { code: 'platform.backup.manage', name: '备份恢复' }
];

const ALL_PERMISSIONS = PERMISSION_CATALOG.map(p => p.code);

// ---------- 数据模型 ----------
interface MockUser {
  id: number;
  username: string;
  display_name: string;
  avatar: string;
  disabled: boolean;
  role_ids: number[];
  created_at: string;
  updated_at: string;
}

interface MockRole {
  id: number;
  code: string;
  name: string;
  scope_kind: string;
  scope_id: string;
  builtin: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

interface MockMenu {
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
  created_at: string;
  updated_at: string;
}

interface MockBackup {
  id: number;
  kind: string;
  status: string;
  file_path: string;
  size_bytes: number;
  note: string;
  parent_id?: number;
  options?: Record<string, unknown>;
  progress?: number;
  phase?: string;
  created_at: string;
  finished_at?: string;
  restores?: MockBackup[];
}

interface MockLog {
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
}

interface MockNotification {
  id: number;
  event: string;
  title: string;
  body: string;
  link: string;
  created_by: number;
  created_at: string;
  read: boolean;
}

// ---------- 内存数据 ----------
const db = {
  users: [
    {
      id: 1,
      username: 'admin',
      display_name: 'Admin',
      avatar: '',
      disabled: false,
      role_ids: [1],
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 2,
      username: 'alice',
      display_name: 'Alice',
      avatar: '',
      disabled: false,
      role_ids: [2],
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 3,
      username: 'bob',
      display_name: 'Bob',
      avatar: '',
      disabled: true,
      role_ids: [2],
      created_at: nowISO(),
      updated_at: nowISO()
    }
  ] as MockUser[],
  roles: [
    {
      id: 1,
      code: 'platform_super',
      name: '超级管理员',
      scope_kind: 'platform',
      scope_id: '1',
      builtin: true,
      permissions: [...ALL_PERMISSIONS],
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 2,
      code: 'platform_admin',
      name: '平台管理员',
      scope_kind: 'platform',
      scope_id: '1',
      builtin: false,
      permissions: ['platform.dashboard.read', 'platform.user.manage', 'platform.logs.read'],
      created_at: nowISO(),
      updated_at: nowISO()
    }
  ] as MockRole[],
  menus: [
    {
      id: 1,
      parent_id: null,
      route_name: 'overview',
      path: '/overview',
      component: 'layout.base$view.overview',
      icon: 'mdi:view-dashboard-outline',
      order_no: 1,
      hide_in_menu: false,
      permission_code: '',
      status: 'enabled',
      title: '工作台',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 2,
      parent_id: null,
      route_name: 'system',
      path: '/system',
      component: 'layout.base',
      icon: 'mdi:cog-outline',
      order_no: 2,
      hide_in_menu: false,
      permission_code: '',
      status: 'enabled',
      title: '系统管理',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 3,
      parent_id: 2,
      route_name: 'system_settings',
      path: '/system/settings',
      component: 'view.system_settings',
      icon: 'mdi:tune-variant',
      order_no: 1,
      hide_in_menu: false,
      permission_code: 'platform.settings.manage',
      status: 'enabled',
      title: '系统设置',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 4,
      parent_id: 2,
      route_name: 'system_user',
      path: '/system/user',
      component: 'view.system_user',
      icon: 'mdi:account-group',
      order_no: 2,
      hide_in_menu: false,
      permission_code: 'platform.user.manage',
      status: 'enabled',
      title: '用户管理',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 5,
      parent_id: 2,
      route_name: 'system_role',
      path: '/system/role',
      component: 'view.system_role',
      icon: 'mdi:shield-account',
      order_no: 3,
      hide_in_menu: false,
      permission_code: 'platform.role.manage',
      status: 'enabled',
      title: '角色管理',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 6,
      parent_id: 2,
      route_name: 'system_menu',
      path: '/system/menu',
      component: 'view.system_menu',
      icon: 'mdi:menu',
      order_no: 4,
      hide_in_menu: false,
      permission_code: 'platform.menu.manage',
      status: 'enabled',
      title: '菜单管理',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 7,
      parent_id: 2,
      route_name: 'system_op-log',
      path: '/system/op-log',
      component: 'view.system_op-log',
      icon: 'mdi:script-text-outline',
      order_no: 5,
      hide_in_menu: false,
      permission_code: 'platform.logs.read',
      status: 'enabled',
      title: '操作日志',
      created_at: nowISO(),
      updated_at: nowISO()
    },
    {
      id: 8,
      parent_id: 2,
      route_name: 'system_backup',
      path: '/system/backup',
      component: 'view.system_backup',
      icon: 'mdi:database-arrow-down-outline',
      order_no: 6,
      hide_in_menu: false,
      permission_code: 'platform.backup.manage',
      status: 'enabled',
      title: '备份恢复',
      created_at: nowISO(),
      updated_at: nowISO()
    }
  ] as MockMenu[],
  backups: [
    {
      id: 1,
      kind: 'backup',
      status: 'done',
      file_path: 'platform-20260813-185600.bak',
      size_bytes: 8 * 1024 * 1024,
      note: '手动备份',
      options: { structure: true, data: true },
      progress: 100,
      phase: 'done',
      created_at: nowISO(),
      finished_at: nowISO(),
      restores: [
        {
          id: nextID(),
          kind: 'restore',
          status: 'done',
          file_path: '',
          size_bytes: 0,
          note: '恢复自备份 #1',
          options: { structure: true, data: true },
          progress: 100,
          phase: 'done',
          parent_id: 1,
          created_at: nowISO(),
          finished_at: nowISO()
        }
      ]
    }
  ] as MockBackup[],
  opLogs: [
    {
      id: 1,
      user_id: 1,
      username: 'admin',
      display_name: 'Admin',
      action: 'settings.update',
      target_type: 'settings',
      target_id: 'site',
      detail: { 'site.name': 'HelmAdmin' },
      ip: '127.0.0.1',
      method: 'PUT',
      path: '/api/console/v1/settings',
      status_code: 200,
      latency_ms: 12,
      request_id: 'mock-req-1',
      user_agent: 'Mozilla/5.0 (mock)',
      auth_type: 'jwt',
      auth_masked: 'adm***',
      created_at: nowISO()
    },
    {
      id: 2,
      user_id: 1,
      username: 'admin',
      display_name: 'Admin',
      action: 'auth.login',
      target_type: 'auth',
      target_id: 'admin',
      detail: { source: 'password' },
      ip: '127.0.0.1',
      method: 'POST',
      path: '/api/console/v1/auth/login',
      status_code: 200,
      latency_ms: 8,
      request_id: 'mock-req-2',
      user_agent: 'Mozilla/5.0 (mock)',
      auth_type: 'none',
      auth_masked: '',
      created_at: nowISO()
    },
    {
      id: 3,
      user_id: 1,
      username: 'admin',
      display_name: 'Admin',
      action: 'backup.create',
      target_type: 'backup',
      target_id: '1',
      detail: { kind: 'backup' },
      ip: '127.0.0.1',
      method: 'POST',
      path: '/api/console/v1/backups',
      status_code: 200,
      latency_ms: 430,
      request_id: 'mock-req-3',
      user_agent: 'Mozilla/5.0 (mock)',
      auth_type: 'jwt',
      auth_masked: 'adm***',
      created_at: nowISO()
    },
    {
      id: 4,
      user_id: 2,
      username: 'alice',
      display_name: 'Alice',
      action: 'user.role.update',
      target_type: 'user',
      target_id: '3',
      detail: { role_ids: [2] },
      ip: '10.0.0.5',
      method: 'PUT',
      path: '/api/console/v1/users/3/roles',
      status_code: 400,
      latency_ms: 3,
      request_id: 'mock-req-4',
      user_agent: 'curl/8.0',
      auth_type: 'jwt',
      auth_masked: 'ali***',
      created_at: nowISO()
    },
    {
      id: 5,
      user_id: 1,
      username: 'admin',
      display_name: 'Admin',
      action: 'backup.restore',
      target_type: 'backup',
      target_id: '1',
      detail: { structure: true, data: true },
      ip: '127.0.0.1',
      method: 'POST',
      path: '/api/console/v1/backups/1/restore',
      status_code: 500,
      latency_ms: 1200,
      request_id: 'mock-req-5',
      user_agent: 'Mozilla/5.0 (mock)',
      auth_type: 'jwt',
      auth_masked: 'adm***',
      created_at: nowISO()
    }
  ] as MockLog[],
  notifications: [
    {
      id: 1,
      event: 'backup.done',
      title: '备份完成',
      body: '平台备份 platform-20260813-185600.bak 已完成',
      link: '',
      created_by: 1,
      created_at: nowISO(),
      read: false
    },
    {
      id: 2,
      event: 'auth.login',
      title: '管理员登录',
      body: '用户 admin 登录控制台',
      link: '',
      created_by: 1,
      created_at: nowISO(),
      read: true
    }
  ] as MockNotification[],
  settings: {
    'site.name': 'HelmAdmin',
    'site.notice': '',
    'summary.ttl_hint': '60s'
  } as Record<string, string>
};

// ---------- 过滤辅助 ----------
function filterUsers(query: Record<string, string>): MockUser[] {
  const q = (query.q || '').trim().toLowerCase();
  const status = query.status || 'all';
  const sortBy = query.sort_by || 'id';
  const sortOrder = query.sort_order === 'asc' ? 1 : -1;
  let list = db.users;
  if (q) {
    list = list.filter(u => u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q));
  }
  if (status === 'active') list = list.filter(u => !u.disabled);
  if (status === 'disabled') list = list.filter(u => u.disabled);
  return [...list].sort((a, b) => {
    const av = a[sortBy as keyof MockUser];
    const bv = b[sortBy as keyof MockUser];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortOrder;
    return String(av ?? '').localeCompare(String(bv ?? '')) * sortOrder;
  });
}

function filterRoles(query: Record<string, string>): MockRole[] {
  const q = (query.q || '').trim().toLowerCase();
  const status = query.status || 'all';
  let list = db.roles;
  if (q) {
    list = list.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }
  if (status === 'builtin') list = list.filter(r => r.builtin);
  if (status === 'custom') list = list.filter(r => !r.builtin);
  return [...list];
}

function filterBackups(query: Record<string, string>): MockBackup[] {
  const q = (query.q || '').trim().toLowerCase();
  const status = query.status || 'all';
  const kind = query.kind || 'all';
  let list = db.backups;
  if (status !== 'all') list = list.filter(b => b.status === status);
  if (kind !== 'all') list = list.filter(b => b.kind === kind);
  if (q) {
    list = list.filter(b => (b.file_path || '').toLowerCase().includes(q) || (b.note || '').toLowerCase().includes(q));
  }
  return [...list];
}

function opLogResult(code?: number): string {
  if (code == null) return 'success';
  if (code >= 500) return 'server_error';
  if (code >= 400) return 'client_error';
  return 'success';
}

function filterOpLogs(query: Record<string, string>): MockLog[] {
  const q = (query.q || '').trim().toLowerCase();
  const results = (query.result || '').split(',').filter(Boolean);
  const from = query.from ? new Date(query.from).getTime() : NaN;
  const to = query.to ? new Date(query.to).getTime() : NaN;
  let list = db.opLogs;
  if (q) {
    list = list.filter(
      l =>
        l.username.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.target_type || '').toLowerCase().includes(q)
    );
  }
  if (results.length) {
    list = list.filter(l => results.includes(opLogResult(l.status_code)));
  }
  if (!Number.isNaN(from)) list = list.filter(l => new Date(l.created_at).getTime() >= from);
  if (!Number.isNaN(to)) list = list.filter(l => new Date(l.created_at).getTime() <= to);
  return [...list];
}

function makeBackupJob(kind: 'backup' | 'restore', note: string, options: Record<string, unknown>): MockBackup {
  const ts = nowISO();
  return {
    id: nextID(),
    kind,
    status: 'done',
    file_path: kind === 'backup' ? `platform-${Date.now()}.bak` : '',
    size_bytes: kind === 'backup' ? Math.round((5 + Math.random() * 20) * 1024 * 1024) : 0,
    note,
    options,
    progress: 100,
    phase: 'done',
    created_at: ts,
    finished_at: ts
  };
}

const adminUser = {
  id: 1,
  username: 'admin',
  display_name: 'Admin',
  avatar: '',
  permissions: [...ALL_PERMISSIONS],
  roles: [{ code: 'platform_super', name: '超级管理员' }],
  home: 'overview'
};

function okBody(data: Record<string, unknown>) {
  return { ok: true, ...data };
}

/** If mock handles the request, sets config.adapter and returns true. */
export function applyPlatformMock(config: InternalAxiosRequestConfig): boolean {
  const rawUrl = config.url || '';
  const url = rawUrl.replace(/^\/api\/console\/v1/, '').split('?')[0];
  const method = (config.method || 'get').toLowerCase();
  const query = Object.fromEntries(new URLSearchParams(rawUrl.split('?')[1] || ''));
  const body = (config.data || {}) as Record<string, any>;

  const respond = (data: Record<string, unknown>, status = 200) => {
    config.adapter = async () => ({
      data: status === 200 ? okBody(data) : data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config,
      request: {}
    });
    return true;
  };

  const respondBlob = (blob: Blob) => {
    config.adapter = async () => ({
      data: blob,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    });
    return true;
  };

  // ---------- auth ----------
  if (method === 'post' && url.endsWith('/auth/login')) {
    return respond({
      token: 'mock-token',
      expires_at: new Date(Date.now() + 864e5).toISOString(),
      user: adminUser
    });
  }
  if (method === 'get' && url.endsWith('/auth/me')) {
    return respond({ user: adminUser });
  }
  if (method === 'post' && url.endsWith('/auth/error')) {
    return respond({ ok: false, code: String(query.code || '400'), msg: query.msg || 'mock error' }, 400);
  }

  // ---------- route ----------
  if (method === 'get' && url.includes('/route/getConstantRoutes')) {
    return respond({ routes: [] });
  }
  if (method === 'get' && url.includes('/route/getUserRoutes')) {
    return respond({
      home: 'overview',
      routes: [
        {
          name: 'overview',
          path: '/overview',
          component: 'layout.base$view.overview',
          meta: { title: '工作台', icon: 'mdi:view-dashboard-outline', order: 1 }
        },
        {
          name: 'system',
          path: '/system',
          component: 'layout.base',
          meta: { title: '系统管理', icon: 'mdi:cog-outline', order: 2 },
          children: [
            {
              name: 'system_settings',
              path: '/system/settings',
              component: 'view.system_settings',
              meta: { title: '系统设置', icon: 'mdi:tune-variant', order: 4 }
            },
            {
              name: 'system_user',
              path: '/system/user',
              component: 'view.system_user',
              meta: { title: '用户管理', icon: 'mdi:account-group', order: 1 }
            },
            {
              name: 'system_role',
              path: '/system/role',
              component: 'view.system_role',
              meta: { title: '角色管理', icon: 'mdi:shield-account', order: 2 }
            },
            {
              name: 'system_menu',
              path: '/system/menu',
              component: 'view.system_menu',
              meta: { title: '菜单管理', icon: 'mdi:menu', order: 3 }
            },
            {
              name: 'system_op-log',
              path: '/system/op-log',
              component: 'view.system_op-log',
              meta: { title: '操作日志', icon: 'mdi:script-text-outline', order: 5 }
            },
            {
              name: 'system_backup',
              path: '/system/backup',
              component: 'view.system_backup',
              meta: { title: '备份恢复', icon: 'mdi:database-arrow-down-outline', order: 6 }
            }
          ]
        }
      ]
    });
  }
  if (method === 'get' && url.includes('/route/isRouteExist')) {
    return respond({ data: true });
  }

  // ---------- system settings ----------
  if (url === '/settings') {
    if (method === 'get') return respond({ items: { ...db.settings } });
    if (method === 'put') {
      const items = body.items as Record<string, string> | undefined;
      if (items && typeof items === 'object') Object.assign(db.settings, items);
      return respond({ items: { ...db.settings } });
    }
  }

  // ---------- system health ----------
  if (method === 'get' && url.includes('/system/health')) {
    return respond({
      host: {
        cpu_percent: 12.5,
        cpu_cores: 8,
        mem_used_percent: 41.2,
        mem_total_bytes: 16 * 1024 ** 3,
        mem_used_bytes: 6 * 1024 ** 3,
        sampled_at: new Date().toISOString(),
        disks: [{ mount: 'C:', used_percent: 55 }]
      }
    });
  }

  // ---------- branding ----------
  if (method === 'get' && url.includes('/branding')) {
    return respond({ site_title: import.meta.env.VITE_APP_TITLE || 'HelmAdmin', logo_text: 'HelmAdmin' });
  }

  // ---------- users ----------
  if (url === '/users/batch-disabled' && method === 'post') {
    const ids: number[] = body.ids || [];
    db.users.forEach(u => {
      if (ids.includes(u.id)) {
        u.disabled = Boolean(body.disabled);
        u.updated_at = nowISO();
      }
    });
    return respond({ updated: ids.length });
  }
  if (url === '/users/batch-delete' && method === 'post') {
    const ids: number[] = body.ids || [];
    const before = db.users.length;
    db.users = db.users.filter(u => !ids.includes(u.id));
    return respond({ deleted: before - db.users.length });
  }
  if (url === '/users' && method === 'get') {
    return respond({ items: filterUsers(query) });
  }
  if (url === '/users' && method === 'post') {
    const user: MockUser = {
      id: nextID(),
      username: String(body.username || ''),
      display_name: String(body.display_name || body.username || ''),
      avatar: '',
      disabled: false,
      role_ids: Array.isArray(body.role_ids) ? body.role_ids.map(Number) : [],
      created_at: nowISO(),
      updated_at: nowISO()
    };
    db.users.push(user);
    return respond({ id: user.id });
  }
  const userMatch = url.match(/^\/users\/(\d+)/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    const user = db.users.find(u => u.id === id);
    if (!user) return respond({ ok: false, msg: '用户不存在' }, 404);
    if (url.endsWith('/avatar') && method === 'post') {
      return respond({ avatar: '' });
    }
    if (url.endsWith('/roles') && method === 'put') {
      user.role_ids = Array.isArray(body.role_ids) ? body.role_ids.map(Number) : user.role_ids;
      user.updated_at = nowISO();
      return respond({});
    }
    if (url.endsWith('/reset-password') && method === 'post') {
      return respond({});
    }
    if (method === 'patch') {
      Object.assign(user, body);
      user.updated_at = nowISO();
      return respond({});
    }
    if (method === 'delete') {
      db.users = db.users.filter(u => u.id !== id);
      return respond({});
    }
  }

  // ---------- roles ----------
  if (url === '/roles/batch-delete' && method === 'post') {
    const ids: number[] = body.ids || [];
    const before = db.roles.length;
    db.roles = db.roles.filter(r => !ids.includes(r.id));
    return respond({ deleted: before - db.roles.length });
  }
  if (url === '/roles' && method === 'get') {
    return respond({ items: filterRoles(query) });
  }
  if (url === '/roles' && method === 'post') {
    const role: MockRole = {
      id: nextID(),
      code: String(body.code || ''),
      name: String(body.name || body.code || ''),
      scope_kind: String(body.scope_kind || 'platform'),
      scope_id: String(body.scope_id ?? '1'),
      builtin: false,
      permissions: [],
      created_at: nowISO(),
      updated_at: nowISO()
    };
    db.roles.push(role);
    return respond({ id: role.id });
  }
  const roleMatch = url.match(/^\/roles\/(\d+)/);
  if (roleMatch) {
    const id = Number(roleMatch[1]);
    const role = db.roles.find(r => r.id === id);
    if (!role) return respond({ ok: false, msg: '角色不存在' }, 404);
    if (url.endsWith('/permissions')) {
      if (method === 'get') return respond({ permissions: role.permissions });
      if (method === 'put') {
        role.permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];
        role.updated_at = nowISO();
        return respond({});
      }
    }
    if (method === 'patch') {
      Object.assign(role, body);
      role.updated_at = nowISO();
      return respond({});
    }
    if (method === 'delete') {
      db.roles = db.roles.filter(r => r.id !== id);
      return respond({});
    }
  }
  if (url === '/permissions' && method === 'get') {
    return respond({ items: PERMISSION_CATALOG });
  }

  // ---------- menus ----------
  if (url === '/menus/reorder' && method === 'put') {
    const items: { id: number; parent_id: number | null; order_no: number }[] = body.items || [];
    items.forEach(it => {
      const m = db.menus.find(x => x.id === it.id);
      if (m) {
        m.parent_id = it.parent_id ?? null;
        m.order_no = it.order_no;
        m.updated_at = nowISO();
      }
    });
    return respond({});
  }
  if (url === '/menus' && method === 'get') {
    return respond({ items: db.menus });
  }
  if (url === '/menus' && method === 'post') {
    const menu: MockMenu = {
      id: nextID(),
      parent_id: body.parent_id ?? null,
      route_name: String(body.route_name || ''),
      path: String(body.path || ''),
      component: String(body.component || ''),
      icon: String(body.icon || 'mdi:menu'),
      order_no: Number(body.order_no ?? 0),
      hide_in_menu: Boolean(body.hide_in_menu),
      permission_code: String(body.permission_code || ''),
      status: String(body.status || 'enabled'),
      title: String(body.title || body.route_name || ''),
      created_at: nowISO(),
      updated_at: nowISO()
    };
    db.menus.push(menu);
    return respond({ id: menu.id });
  }
  const menuMatch = url.match(/^\/menus\/(\d+)/);
  if (menuMatch) {
    const id = Number(menuMatch[1]);
    const menu = db.menus.find(m => m.id === id);
    if (!menu) return respond({ ok: false, msg: '菜单不存在' }, 404);
    if (method === 'patch') {
      Object.assign(menu, body);
      menu.updated_at = nowISO();
      return respond({});
    }
    if (method === 'delete') {
      const ids = new Set<number>();
      const collect = (pid: number) => {
        db.menus.forEach(m => {
          if (m.parent_id === pid && !ids.has(m.id)) {
            ids.add(m.id);
            collect(m.id);
          }
        });
      };
      ids.add(id);
      collect(id);
      db.menus = db.menus.filter(m => !ids.has(m.id));
      return respond({});
    }
  }

  // ---------- backups ----------
  if (url === '/backups/upload' && method === 'post') {
    const job = makeBackupJob('backup', '上传备份', { structure: true, data: true });
    db.backups.unshift(job);
    return respond({ job });
  }
  const backupJobMatch = url.match(/^\/backups\/jobs\/(\d+)/);
  if (backupJobMatch && method === 'get') {
    const id = Number(backupJobMatch[1]);
    const job = db.backups.find(b => b.id === id);
    if (!job) return respond({ ok: false, msg: '任务不存在' }, 404);
    return respond({ job });
  }
  if (url === '/backups' && method === 'get') {
    return respond({ items: filterBackups(query) });
  }
  if (url === '/backups' && method === 'post') {
    const job = makeBackupJob(
      'backup',
      '手动备份',
      (body.options as Record<string, unknown>) || { structure: true, data: true }
    );
    db.backups.unshift(job);
    return respond({ job });
  }
  const backupMatch = url.match(/^\/backups\/(\d+)/);
  if (backupMatch) {
    const id = Number(backupMatch[1]);
    const backup = db.backups.find(b => b.id === id);
    if (!backup) return respond({ ok: false, msg: '备份不存在' }, 404);
    if (url.endsWith('/download')) {
      return respondBlob(new Blob([`mock backup data #${id}`], { type: 'application/octet-stream' }));
    }
    if (url.endsWith('/restore') && method === 'post') {
      const restore = makeBackupJob(
        'restore',
        `恢复自备份 #${id}`,
        (body.options as Record<string, unknown>) || { structure: true, data: true }
      );
      restore.parent_id = id;
      backup.restores = backup.restores || [];
      backup.restores.unshift(restore);
      db.backups.unshift(restore);
      return respond({ job: restore });
    }
    if (method === 'get') {
      return respond({ item: { ...backup, restores: backup.restores || [] } });
    }
    if (method === 'delete') {
      db.backups = db.backups.filter(b => b.id !== id && b.parent_id !== id);
      return respond({});
    }
  }

  // ---------- op-logs ----------
  if (url === '/op-logs' && method === 'get') {
    return respond({ items: filterOpLogs(query) });
  }
  const opMatch = url.match(/^\/op-logs\/(\d+)/);
  if (opMatch && method === 'get') {
    const id = Number(opMatch[1]);
    const item = db.opLogs.find(l => l.id === id);
    if (!item) return respond({ ok: false, msg: '日志不存在' }, 404);
    return respond({ item });
  }

  // ---------- notifications ----------
  if (url === '/notifications/unread-count' && method === 'get') {
    return respond({ count: db.notifications.filter(n => !n.read).length });
  }
  if (url === '/notifications/read-all' && method === 'post') {
    const marked = db.notifications.filter(n => !n.read).length;
    db.notifications.forEach(n => {
      n.read = true;
    });
    return respond({ marked });
  }
  if (url === '/notifications/clear-all' && method === 'post') {
    const cleared = db.notifications.length;
    db.notifications = [];
    return respond({ cleared });
  }
  if (url === '/notifications' && method === 'get') {
    let list = [...db.notifications];
    if (String(query.unread_only) === '1') list = list.filter(n => !n.read);
    if (query.limit) list = list.slice(0, Number(query.limit));
    return respond({ items: list });
  }
  const notifMatch = url.match(/^\/notifications\/(\d+)/);
  if (notifMatch) {
    const id = Number(notifMatch[1]);
    const n = db.notifications.find(x => x.id === id);
    if (!n) return respond({ ok: false, msg: '通知不存在' }, 404);
    if (url.endsWith('/read') && method === 'post') {
      n.read = true;
      return respond({});
    }
    if (method === 'delete') {
      db.notifications = db.notifications.filter(x => x.id !== id);
      return respond({});
    }
  }

  // ---------- fallback ----------
  if (method === 'get') {
    return respond({ items: [] });
  }
  return false;
}
