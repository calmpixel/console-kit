import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { request } from '@/service/request';

/** Site / platform branding from GET /branding and system settings */
export const useSiteStore = defineStore(SetupStoreId.Site, () => {
  const siteName = ref('');

  /** Display name: settings `site.name`, else i18n platform title */
  const platformName = computed(() => siteName.value.trim() || $t('system.title'));

  function setSiteName(name: string) {
    siteName.value = name.trim();
  }

  async function loadSiteSettings() {
    const { data, error } = await request<{ site_name?: string }>({ url: '/branding' });
    if (error) return;
    if (typeof data?.site_name === 'string') {
      setSiteName(data.site_name);
    }
  }

  return {
    siteName,
    platformName,
    setSiteName,
    loadSiteSettings
  };
});
