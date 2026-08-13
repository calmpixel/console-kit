<script setup lang="ts">
import { NPopconfirm, NSpace, NTag, NText } from 'naive-ui';
import { VueDraggable } from 'vue-draggable-plus';
import TableActionLink from '@/components/common/table-action-link.vue';
import type { AdminMenu } from '@/service/api';
import { $t } from '@/locales';
import { statusLabel } from '@/utils/status-label';

export type MenuTreeNode = AdminMenu & { children: MenuTreeNode[] };

export type MenuColKey = 'title' | 'route_name' | 'status' | 'created_at' | 'updated_at' | 'actions';

defineOptions({ name: 'MenuTreeNodes' });

const props = withDefaults(
  defineProps<{
    modelValue: MenuTreeNode[];
    /** Indent title column only; other columns stay flush. */
    depth?: number;
    expanded: Set<number>;
    /** When true (e.g. search active), disable drag reorder. */
    disabled?: boolean;
    /** Visible data columns from column setting (handle always shown). */
    visibleCols?: Set<MenuColKey>;
  }>(),
  { depth: 0, disabled: false }
);

const emit = defineEmits<{
  'update:modelValue': [value: MenuTreeNode[]];
  dragEnd: [];
  toggle: [id: number];
  createChild: [parentId: number];
  edit: [row: MenuTreeNode];
  remove: [row: MenuTreeNode];
}>();

function onUpdate(value: MenuTreeNode[]) {
  emit('update:modelValue', value);
}

function titlePad() {
  return `${(props.depth || 0) * 20}px`;
}

function colVisible(key: MenuColKey) {
  // Default all visible when parent has not wired column setting yet
  if (!props.visibleCols) return true;
  return props.visibleCols.has(key);
}
</script>

<template>
  <VueDraggable
    :model-value="modelValue"
    :animation="180"
    :disabled="disabled"
    handle=".menu-tree__handle"
    group="menu-tree"
    ghost-class="menu-tree__ghost"
    chosen-class="menu-tree__chosen"
    drag-class="menu-tree__drag"
    class="menu-tree__list"
    @update:model-value="onUpdate"
    @end="emit('dragEnd')"
  >
    <div v-for="node in modelValue" :key="node.id" class="menu-tree__branch">
      <div class="menu-tree__row">
        <span class="menu-tree__col menu-tree__col--handle">
          <button
            type="button"
            class="menu-tree__handle"
            :disabled="disabled"
            :title="disabled ? '筛选中不可拖动' : '拖动排序'"
          >
            ⋮⋮
          </button>
        </span>
        <span
          v-if="colVisible('title')"
          class="menu-tree__col menu-tree__col--title"
          :style="{ paddingLeft: titlePad() }"
        >
          <button
            v-if="node.children.length"
            type="button"
            class="menu-tree__expand"
            :title="expanded.has(node.id) ? '收起' : '展开'"
            @click="emit('toggle', node.id)"
          >
            <SvgIcon :icon="expanded.has(node.id) ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
          </button>
          <span v-else class="menu-tree__expand-spacer" />
          <SvgIcon v-if="node.icon" :icon="node.icon" class="menu-tree__icon" />
          <span v-else class="menu-tree__icon menu-tree__icon--empty" />
          <span class="menu-tree__title-text" :title="node.title || node.route_name">{{
            node.title || node.route_name
          }}</span>
          <NText v-if="node.hide_in_menu" depth="3" class="menu-tree__hide-tag">隐藏</NText>
        </span>
        <span
          v-if="colVisible('route_name')"
          class="menu-tree__col menu-tree__col--route"
          :title="node.route_name"
        >
          {{ node.route_name }}
        </span>
        <span v-if="colVisible('status')" class="menu-tree__col menu-tree__col--status">
          <NTag size="small" :type="node.status === 'enabled' ? 'success' : 'warning'" :bordered="false">
            {{ statusLabel(node.status) }}
          </NTag>
        </span>
        <span
          v-if="colVisible('created_at')"
          class="menu-tree__col menu-tree__col--time"
          :title="node.created_at"
        >
          {{ node.created_at || '-' }}
        </span>
        <span
          v-if="colVisible('updated_at')"
          class="menu-tree__col menu-tree__col--time"
          :title="node.updated_at"
        >
          {{ node.updated_at || '-' }}
        </span>
        <span v-if="colVisible('actions')" class="menu-tree__col menu-tree__col--actions">
          <NSpace :size="6" :wrap="false">
            <TableActionLink label="子菜单" icon="mdi:plus" @click="emit('createChild', node.id)" />
            <TableActionLink :label="$t('common.edit')" icon="mdi:pencil-outline" @click="emit('edit', node)" />
            <NPopconfirm @positive-click="emit('remove', node)">
              <template #trigger>
                <TableActionLink :label="$t('common.delete')" icon="mdi:delete-outline" type="error" />
              </template>
              确认删除菜单 {{ node.route_name }}？请先处理其子菜单。
            </NPopconfirm>
          </NSpace>
        </span>
      </div>

      <MenuTreeNodes
        v-if="node.children.length && expanded.has(node.id)"
        v-model="node.children"
        :depth="(depth || 0) + 1"
        :expanded="expanded"
        :disabled="disabled"
        :visible-cols="visibleCols"
        @drag-end="emit('dragEnd')"
        @toggle="id => emit('toggle', id)"
        @create-child="id => emit('createChild', id)"
        @edit="row => emit('edit', row)"
        @remove="row => emit('remove', row)"
      />
    </div>
  </VueDraggable>
</template>
