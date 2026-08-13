import type { Router } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { resolveRouteLabel } from '@/utils/route-label';

export function createDocumentTitleGuard(router: Router) {
  router.afterEach(to => {
    const { i18nKey, title } = to.meta;

    useTitle(resolveRouteLabel(title, i18nKey));
  });
}
