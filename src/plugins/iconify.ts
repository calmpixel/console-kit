import { addCollection, addIcon } from '@iconify/vue/offline';
import mdi from '@iconify/json/json/mdi.json';
import lineMd from '@iconify/json/json/line-md.json';

/**
 * Register local icon sets so SvgIcon never requests api.iconify.design
 * (often blocked or flaky in China / intranet). Prefer mdi:* in UI code;
 * line-md covers Soybean menu fold animation icons.
 */
export function setupIconifyOffline() {
  addCollection(mdi);
  addCollection(lineMd);
  // Remix hard-drive (offline; full ri set is large — register only what we use).
  addIcon('ri:hard-drive-2-line', {
    body: '<path fill="currentColor" d="M5 14h14V4H5zm0 2v4h14v-4zM4 2h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1m11 15h2v2h-2z"/>',
    width: 24,
    height: 24
  });
}
