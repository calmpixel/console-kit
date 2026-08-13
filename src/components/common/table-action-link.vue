<script setup lang="ts">
defineOptions({ name: 'TableActionLink' });

withDefaults(
  defineProps<{
    label: string;
    icon: string;
    /** primary | error | default */
    type?: 'primary' | 'error' | 'default';
    disabled?: boolean;
  }>(),
  {
    type: 'primary',
    disabled: false
  }
);

defineEmits<{ click: [e: MouseEvent] }>();
</script>

<template>
  <button
    type="button"
    class="table-action-link"
    :class="`is-${type}`"
    :disabled="disabled"
    @click="e => $emit('click', e)"
  >
    <SvgIcon :icon="icon" class="table-action-link__icon" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.table-action-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
  /* 默认跟随正文，不加主题色 */
  color: inherit;
  transition: color 0.15s ease;
}

.table-action-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.table-action-link__icon {
  font-size: 14px;
}

.table-action-link.is-primary:hover:not(:disabled),
.table-action-link.is-default:hover:not(:disabled) {
  color: rgb(var(--primary-color));
}

.table-action-link.is-error:hover:not(:disabled) {
  color: rgb(var(--error-color));
}
</style>
