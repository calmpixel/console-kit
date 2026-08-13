import type { App } from 'vue';
import setupAuthDirective from './auth';

/** Setup custom Vue directives. */
export function setupDirectives(app: App) {
  setupAuthDirective(app);
}
