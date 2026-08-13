/**
 * 简易平台 mock：登录与空列表，便于不启 api-kit 时逛壳。
 * 在 request.onRequest 里调用 applyPlatformMock(config)。
 */
import type { InternalAxiosRequestConfig } from 'axios';

const adminUser = {
  id: 1,
  username: 'admin',
  display_name: 'Admin',
  avatar: '',
  permissions: [
    'platform.dashboard.read',
    'platform.user.manage',
    'platform.role.manage',
    'platform.menu.manage',
    'platform.settings.manage',
    'platform.logs.read',
    'platform.backup.manage'
  ],
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

  const respond = (data: Record<string, unknown>) => {
    config.adapter = async () => ({
      data: okBody(data),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    });
    return true;
  };

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
  if (method === 'get' && (url === '/users' || url.endsWith('/users'))) {
    return respond({ items: [{ id: 1, username: 'admin', display_name: 'Admin', disabled: false }] });
  }
  if (method === 'get' && (url === '/roles' || url.endsWith('/roles'))) {
    return respond({ items: [{ id: 1, code: 'platform_super', name: '超级管理员', builtin: true }] });
  }
  if (method === 'get' && url.includes('/permissions')) {
    return respond({ items: adminUser.permissions.map(code => ({ code, name: code })) });
  }
  if (method === 'get' && url.includes('/branding')) {
    return respond({ site_title: 'GokitHub.io', logo_text: 'Platform' });
  }
  if (method === 'get' && url.includes('/notifications/unread-count')) {
    return respond({ unread: 0 });
  }
  if (method === 'get') {
    return respond({ items: [] });
  }
  return false;
}
