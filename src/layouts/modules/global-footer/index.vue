<script setup lang="ts">
import { useSiteStore } from '@/store/modules/site';

defineOptions({
  name: 'GlobalFooter'
});

const siteStore = useSiteStore();
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <span>Copyright MIT © 2021 {{ siteStore.platformName }}</span>
  </DarkModeContainer>
</template>

<style scoped></style>
