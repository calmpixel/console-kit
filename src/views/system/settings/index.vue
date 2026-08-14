<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NInput, NSpin } from 'naive-ui';
import { request } from '@/service/request';
import { useSiteStore } from '@/store/modules/site';

defineOptions({ name: 'SystemSettings' });

type TabKey = 'site' | 'runtime';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  title: string;
  description: string;
}

const tabs: TabItem[] = [
  {
    key: 'site',
    label: '站点设置',
    icon: 'mdi:web',
    title: '站点设置',
    description: '自定义控制台站点名称与公告文案'
  },
  {
    key: 'runtime',
    label: '运行时',
    icon: 'mdi:timer-outline',
    title: '运行时提示',
    description: '控制台展示用的运行时提示文案（不改动服务端实际配置）'
  }
];

const activeTab = ref<TabKey>('site');
const loading = ref(false);
const saving = ref(false);
const siteStore = useSiteStore();

const form = ref({
  'site.name': '',
  'site.notice': '',
  'summary.ttl_hint': ''
});

const currentTab = computed(() => tabs.find(t => t.key === activeTab.value) || tabs[0]);

async function load() {
  loading.value = true;
  const { data, error } = await request<{ items?: Record<string, string> }>({ url: '/settings' });
  loading.value = false;
  if (error) return;
  const items = data?.items || {};
  form.value = {
    'site.name': items['site.name'] ?? (import.meta.env.VITE_APP_TITLE || '控制台'),
    'site.notice': items['site.notice'] ?? '',
    'summary.ttl_hint': items['summary.ttl_hint'] ?? ''
  };
  siteStore.setSiteName(form.value['site.name']);
}

async function save() {
  saving.value = true;
  const { error } = await request({ url: '/settings', method: 'put', data: { items: form.value } });
  saving.value = false;
  if (error) return;
  siteStore.setSiteName(form.value['site.name']);
  window.$message?.success('保存成功');
}

onMounted(load);
</script>

<template>
  <div class="settings-page">
    <nav class="settings-tabs" aria-label="设置分类">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="settings-tabs__item"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <SvgIcon :icon="tab.icon" class="settings-tabs__icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <NSpin :show="loading">
      <section class="settings-card">
        <header class="settings-card__header">
          <h1 class="settings-card__title">{{ currentTab.title }}</h1>
          <p class="settings-card__desc">{{ currentTab.description }}</p>
        </header>

        <div class="settings-card__body">
          <template v-if="activeTab === 'site'">
            <div class="settings-section">
              <h2 class="settings-section__title">站点品牌</h2>
              <p class="settings-section__desc">用于控制台标题与面向管理员的公告展示</p>

              <div class="settings-fields">
                <div class="settings-field settings-field--half">
                  <label class="settings-field__label">站点名称</label>
                  <NInput v-model:value="form['site.name']" placeholder="例如：我的控制台" maxlength="64" show-count />
                  <p class="settings-field__hint">显示在浏览器标题与控制台品牌位置</p>
                </div>

                <div class="settings-field settings-field--full">
                  <label class="settings-field__label">公告</label>
                  <NInput
                    v-model:value="form['site.notice']"
                    type="textarea"
                    :rows="4"
                    placeholder="展示给所有用户的公告文案，可留空"
                    maxlength="500"
                    show-count
                  />
                  <p class="settings-field__hint">写入后对具备权限的控制台用户可见；留空表示不展示公告</p>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'runtime'">
            <div class="settings-callout">
              <div class="settings-callout__text">
                <h3 class="settings-callout__title">仅展示提示</h3>
                <p class="settings-callout__desc">下列文案只影响控制台说明，实际 `summary.ttl` 仍由服务端配置决定</p>
              </div>
            </div>

            <div class="settings-section">
              <h2 class="settings-section__title">汇总新鲜度</h2>
              <p class="settings-section__desc">帮助运维理解 summary 过期阈值</p>

              <div class="settings-fields">
                <div class="settings-field settings-field--half">
                  <label class="settings-field__label">Summary TTL 提示</label>
                  <NInput v-model:value="form['summary.ttl_hint']" placeholder="例如：60s" maxlength="32" />
                  <p class="settings-field__hint">建议与后端 `summary.ttl` 保持一致，例如 60s</p>
                </div>
              </div>
            </div>
          </template>
        </div>

        <footer class="settings-card__footer">
          <NButton
            v-auth="'platform.settings.manage'"
            type="primary"
            :loading="saving"
            :disabled="loading"
            @click="save"
          >
            <template #icon>
              <SvgIcon icon="mdi:content-save-outline" />
            </template>
            保存
          </NButton>
          <NButton :loading="loading" :disabled="saving" @click="load">
            <template #icon>
              <SvgIcon icon="mdi:restore" />
            </template>
            重置
          </NButton>
        </footer>
      </section>
    </NSpin>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-height: 0;
}

.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  background: rgb(var(--container-bg-color));
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 4%),
    0 4px 16px rgb(15 23 42 / 4%);
}

.settings-tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--base-text-color) / 0.62);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.settings-tabs__item:hover {
  color: rgb(var(--base-text-color) / 0.88);
  background: rgb(var(--base-text-color) / 0.04);
}

.settings-tabs__item.is-active {
  color: rgb(var(--primary-color));
  background: rgb(var(--primary-color) / 0.1);
}

.settings-tabs__icon {
  font-size: 16px;
}

.settings-card {
  background: rgb(var(--container-bg-color));
  border-radius: 14px;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 4%),
    0 8px 24px rgb(15 23 42 / 5%);
  overflow: hidden;
}

.settings-card__header {
  padding: 24px 28px 18px;
  border-bottom: 1px solid rgb(var(--base-text-color) / 0.08);
}

.settings-card__title {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.3;
  color: rgb(var(--base-text-color));
}

.settings-card__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--base-text-color) / 0.5);
}

.settings-card__body {
  padding: 22px 28px 8px;
}

.settings-callout {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  padding: 14px 16px;
  border: 1px solid rgb(var(--warning-color) / 0.35);
  border-radius: 10px;
  background: rgb(var(--warning-color) / 0.1);
}

.settings-callout__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--base-text-color));
}

.settings-callout__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--base-text-color) / 0.58);
}

.settings-section + .settings-section {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid rgb(var(--base-text-color) / 0.08);
}

.settings-section__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--base-text-color));
}

.settings-section__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--base-text-color) / 0.5);
}

.settings-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
  margin-top: 18px;
}

.settings-field {
  min-width: 0;
}

.settings-field--full {
  grid-column: 1 / -1;
}

.settings-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--base-text-color) / 0.88);
}

.settings-field__hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--base-text-color) / 0.45);
}

.settings-card__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px 28px 22px;
  border-top: 1px solid rgb(var(--base-text-color) / 0.06);
}

@media (max-width: 720px) {
  .settings-fields {
    grid-template-columns: 1fr;
  }

  .settings-field--half {
    grid-column: 1 / -1;
  }

  .settings-card__header,
  .settings-card__body,
  .settings-card__footer {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
