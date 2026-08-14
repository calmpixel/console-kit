import type { ElegantConstRoute } from '@elegant-router/types';

const LAYOUT_BASE = 'layout.base';
const VIEW_PREFIX = 'view.';
const LAYOUT_PREFIX = 'layout.';
const LAYOUT_VIEW_SPLIT = '$';
const ROUTE_DEGREE_SPLITTER = '_';

/**
 * Top-level routes that are not a pure `layout.base` shell get wrapped so Soybean
 * can open them inside the app frame.
 *
 * Soybean `layout.base$view.xxx` only works when route `name` has no `_`
 * (`isSingleLevelRoute`). Names like `system_backup_detail` must become:
 *   layout parent (name without `_`) + child `view.xxx`.
 *
 * Only applies to root list items; children are left as-is.
 */
export function wrapTopLevelRoutesWithLayout(routes: ElegantConstRoute[]): ElegantConstRoute[] {
  return routes.map(wrapTopLevelRoute);
}

function wrapTopLevelRoute(route: ElegantConstRoute): ElegantConstRoute {
  const comp = String(route.component || '').trim();
  const hasChildren = Boolean(route.children?.length);
  const name = String(route.name);

  if (hasChildren) {
    if (isPureLayout(comp)) return route;
    return { ...route, component: LAYOUT_BASE };
  }

  // leaf
  const viewFromDollar = comp.includes(LAYOUT_VIEW_SPLIT) ? comp.split(LAYOUT_VIEW_SPLIT)[1]?.trim() : '';
  const viewComp = viewFromDollar || (comp.startsWith(VIEW_PREFIX) ? comp : '');

  if (!viewComp.startsWith(VIEW_PREFIX)) {
    // layout shell without view, or empty / unknown — leave alone
    if (isPureLayout(comp) || comp.includes(LAYOUT_VIEW_SPLIT)) return route;
    return route;
  }

  // Name without `_`: Soybean single-level `$` form
  if (!name.includes(ROUTE_DEGREE_SPLITTER)) {
    if (comp.includes(LAYOUT_VIEW_SPLIT)) return route;
    return { ...route, component: `${LAYOUT_BASE}${LAYOUT_VIEW_SPLIT}${viewComp}` };
  }

  // Name with `_`: `$` form is rejected by elegant transform — use layout + child
  const shellName = shellNameFor(name);
  return {
    name: shellName,
    path: route.path,
    component: LAYOUT_BASE,
    meta: { ...route.meta },
    children: [
      {
        ...route,
        path: '',
        component: viewComp,
        meta: {
          ...route.meta,
          hideInMenu: true,
          activeMenu: shellName
        }
      }
    ]
  } as ElegantConstRoute;
}

function isPureLayout(comp: string) {
  return Boolean(comp) && comp.startsWith(LAYOUT_PREFIX) && !comp.includes(LAYOUT_VIEW_SPLIT);
}

/** Elegant first-level names must not contain `_`. */
function shellNameFor(routeName: string) {
  return `m${routeName.replace(/_/g, '')}`;
}
