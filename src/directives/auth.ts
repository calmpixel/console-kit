import type { App, Directive } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

function hasAuth(codes: string | string[], buttons: string[]): boolean {
  if (typeof codes === 'string') {
    return buttons.includes(codes);
  }

  return codes.some(code => buttons.includes(code));
}

/**
 * v-auth — remove element when user lacks permission code(s).
 *
 * The auth store must NOT be read at directive-registration time: `setupDirectives` runs before
 * `setupRouter` in `main.ts`, and `useAuthStore()` transitively pulls in the router guards
 * (`@/router` -> `./guard` -> `useAuthStore`), which need vue-router to already be installed on
 * the app. Reading the store lazily inside the hooks defers that access until components actually
 * mount, by which time the router is installed.
 */
export default function setupAuthDirective(app: App) {
  const authDirective: Directive<HTMLElement, string | string[]> = {
    mounted(el, binding) {
      const authStore = useAuthStore();
      if (!authStore.isLogin || !hasAuth(binding.value, authStore.userInfo.buttons)) {
        el.remove();
      }
    },
    updated(el, binding) {
      const authStore = useAuthStore();
      if (!authStore.isLogin || !hasAuth(binding.value, authStore.userInfo.buttons)) {
        el.remove();
      }
    }
  };

  app.directive('auth', authDirective);
}
