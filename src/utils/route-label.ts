import { $t } from '@/locales';

/**
 * 路由/菜单展示文案：
 * - 动态菜单（后端 menus.title）：有 title 就用 title，不走 i18n
 * - 静态内置页（登录/403）：通常只有 i18nKey
 */
export function resolveRouteLabel(title?: string | null, i18nKey?: string | null) {
  const t = title?.trim();
  if (t) {
    return t;
  }
  if (i18nKey) {
    return $t(i18nKey as App.I18n.I18nKey);
  }
  return title || '';
}
