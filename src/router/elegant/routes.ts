/* eslint-disable */
/* prettier-ignore */
// auto-generated routes (business kept out). Regenerate carefully — keep business out.

import type { GeneratedRoute } from '@elegant-router/types';

export const generatedRoutes: GeneratedRoute[] = [
  {
    name: '403',
    path: '/403',
    component: 'layout.blank$view.403',
    meta: {
      title: '403',
      i18nKey: 'route.403',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: '404',
    path: '/404',
    component: 'layout.blank$view.404',
    meta: {
      title: '404',
      i18nKey: 'route.404',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: '500',
    path: '/500',
    component: 'layout.blank$view.500',
    meta: {
      title: '500',
      i18nKey: 'route.500',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: 'home',
    path: '/home',
    component: 'layout.base$view.home',
    meta: {
      title: 'home',
      i18nKey: 'route.home'
    }
  },
  {
    name: 'iframe-page',
    path: '/iframe-page/:url',
    component: 'layout.base$view.iframe-page',
    props: true,
    meta: {
      title: 'iframe-page',
      i18nKey: 'route.iframe-page',
      constant: true,
      hideInMenu: true,
      keepAlive: true
    }
  },
  {
    name: 'login',
    path: '/login/:module(pwd-login|code-login|register|reset-pwd|bind-wechat)?',
    component: 'layout.blank$view.login',
    props: true,
    meta: {
      title: 'login',
      i18nKey: 'route.login',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: 'overview',
    path: '/overview',
    component: 'layout.base$view.overview',
    meta: {
      title: '工作台',
      i18nKey: 'route.overview',
      icon: 'mdi:view-dashboard-outline',
      order: 1
    }
  },
  {
    name: 'system',
    path: '/system',
    component: 'layout.base',
    meta: {
      title: '系统',
      i18nKey: 'route.system',
      icon: 'mdi:cog-outline',
      order: 2
    },
    children: [
      {
        name: 'system_backup',
        path: '/system/backup',
        component: 'view.system_backup',
        meta: {
          title: '备份恢复',
          i18nKey: 'route.system_backup',
          icon: 'mdi:database-arrow-down-outline',
          order: 6
        },
        children: [
          {
            name: 'system_backup_detail',
            path: '/system/backup/detail/:id',
            component: 'view.system_backup_detail',
            meta: {
              title: 'system_backup_detail',
              i18nKey: 'route.system_backup_detail'
            }
          }
        ]
      },
      {
        name: 'system_menu',
        path: '/system/menu',
        component: 'view.system_menu',
        meta: {
          title: '菜单',
          i18nKey: 'route.system_menu',
          icon: 'mdi:menu',
          order: 3
        }
      },
      {
        name: 'system_op-log',
        path: '/system/op-log',
        component: 'view.system_op-log',
        meta: {
          title: '操作日志',
          i18nKey: 'route.system_op-log',
          icon: 'mdi:script-text-outline',
          order: 5
        }
      },
      {
        name: 'system_role',
        path: '/system/role',
        component: 'view.system_role',
        meta: {
          title: '角色',
          i18nKey: 'route.system_role',
          icon: 'mdi:shield-account',
          order: 2
        }
      },
      {
        name: 'system_settings',
        path: '/system/settings',
        component: 'view.system_settings',
        meta: {
          title: '系统设置',
          i18nKey: 'route.system_settings',
          icon: 'mdi:tune-variant',
          order: 4
        }
      },
      {
        name: 'system_user',
        path: '/system/user',
        component: 'view.system_user',
        meta: {
          title: '用户',
          i18nKey: 'route.system_user',
          icon: 'mdi:account-group',
          order: 1
        }
      }
    ]
  }
];
