<script setup lang="ts">
import type { Subscription } from '@/types'

const props = defineProps<{
  subscription: Subscription
  isSelectMode: boolean
  isSelected: boolean
  dragOverId: string | null
}>()

const emit = defineEmits<{
  (e: 'toggle-select', id: string): void
  (e: 'contextmenu', event: MouseEvent, subscription: Subscription): void
  (e: 'dragstart', event: DragEvent, id: string): void
  (e: 'dragover', event: DragEvent, id: string): void
  (e: 'dragleave'): void
  (e: 'drop', event: DragEvent, id: string): void
  (e: 'refresh', id: string): void
  (e: 'toggle-active', id: string): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'click', id: string): void
}>()

// 格式化日期
const formatDate = (date: string | Date | undefined) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

const handleClick = () => {
  if (props.isSelectMode) {
    emit('toggle-select', props.subscription.id)
  } else {
    emit('click', props.subscription.id)
  }
}
</script>

<template>
  <div class="card p-4 hover:shadow-soft transition-all cursor-pointer group" :class="{
    'opacity-50': !subscription.isActive,
    'ring-2 ring-primary-500': dragOverId === subscription.id,
    'bg-primary-50 border-primary-200': isSelected
  }" :draggable="!isSelectMode" @click="handleClick"
    @contextmenu="!isSelectMode && emit('contextmenu', $event, subscription)"
    @dragstart="emit('dragstart', $event, subscription.id)" @dragover="emit('dragover', $event, subscription.id)"
    @dragleave="emit('dragleave')" @drop="emit('drop', $event, subscription.id)">
    <div class="flex items-center gap-4">
      <!-- 选择复选框 -->
      <div v-if="isSelectMode" class="flex-shrink-0">
        <input type="checkbox" :checked="isSelected"
          class="w-5 h-5 text-primary-600 border-neutral-300 rounded focus:ring-primary-500" @click.stop
          @change="emit('toggle-select', subscription.id)" />
      </div>

      <!-- 图标 -->
      <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <img v-if="subscription.icon" :src="subscription.icon" :alt="subscription.title" class="w-6 h-6 rounded" />
        <svg v-else class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </div>

      <!-- 信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-sm font-medium text-neutral-900 truncate">
            {{ subscription.title }}
          </h3>
          <span v-if="subscription.category" class="px-1.5 py-0.5 text-xs bg-neutral-100 text-neutral-500 rounded">
            {{ subscription.category }}
          </span>
        </div>
        <p class="text-xs text-neutral-500 truncate">
          {{ subscription.url }}
        </p>
      </div>

      <!-- 统计信息 -->
      <div class="flex items-center gap-4 text-sm">
        <!-- 未读数 -->
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 text-xs font-medium rounded-full" :class="(subscription.unreadCount ?? 0) > 0
            ? 'bg-primary-100 text-primary-700'
            : 'bg-neutral-100 text-neutral-500'">
            {{ subscription.unreadCount ?? 0 }} 未读
          </span>
        </div>

        <!-- 最后更新 -->
        <span class="text-xs text-neutral-400 hidden sm:block">
          {{ formatDate(subscription.lastUpdated) }}
        </span>
      </div>

      <!-- 操作按钮（非选择模式） -->
      <div v-if="!isSelectMode" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- 刷新 -->
        <button class="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="刷新" @click.stop="emit('refresh', subscription.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- 启用/禁用 -->
        <button class="p-1.5 rounded-lg transition-colors" :class="subscription.isActive
          ? 'text-success-500 hover:bg-success-50'
          : 'text-neutral-400 hover:bg-neutral-100'" :title="subscription.isActive ? '禁用' : '启用'"
          @click.stop="emit('toggle-active', subscription.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="subscription.isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- 编辑 -->
        <button class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          title="编辑" @click.stop="emit('edit', subscription.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- 删除 -->
        <button class="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
          title="删除" @click.stop="emit('delete', subscription.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <!-- 拖拽手柄（非选择模式） -->
      <div v-if="!isSelectMode" class="p-1 text-neutral-300 cursor-move">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
        </svg>
      </div>
    </div>
  </div>
</template>
