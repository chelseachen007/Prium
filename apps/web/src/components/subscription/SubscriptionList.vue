<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Subscription, Category } from '@/types'

const props = defineProps<{
  subscriptions: Subscription[]
  categories: Category[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'toggle-active', id: string): void
  (e: 'refresh', id: string): void
  (e: 'reorder', ids: string[]): void
}>()

// 搜索和筛选
const searchQuery = ref('')
const selectedCategoryId = ref<string>('')
const sortBy = ref<'name' | 'unread' | 'updated'>('updated')

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedSubscription = ref<Subscription | null>(null)

// 拖拽状态
const draggedId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

// 过滤和排序后的订阅
const filteredSubscriptions = computed(() => {
  let result = [...props.subscriptions]

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.url.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query)
    )
  }

  // 分类过滤
  if (selectedCategoryId.value) {
    result = result.filter(s => s.categoryId === selectedCategoryId.value)
  }

  // 排序
  switch (sortBy.value) {
    case 'name':
      result.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'unread':
      result.sort((a, b) => b.unreadCount - a.unreadCount)
      break
    case 'updated':
      result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      break
  }

  return result
})

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

// 显示右键菜单
const showContextMenu = (e: MouseEvent, subscription: Subscription) => {
  e.preventDefault()
  contextMenuVisible.value = true
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  selectedSubscription.value = subscription
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  selectedSubscription.value = null
}

// 右键菜单操作
const handleEdit = () => {
  if (selectedSubscription.value) {
    emit('edit', selectedSubscription.value.id)
  }
  hideContextMenu()
}

const handleDelete = () => {
  if (selectedSubscription.value && confirm('确定要删除此订阅吗？')) {
    emit('delete', selectedSubscription.value.id)
  }
  hideContextMenu()
}

const handleToggleActive = () => {
  if (selectedSubscription.value) {
    emit('toggle-active', selectedSubscription.value.id)
  }
  hideContextMenu()
}

const handleRefresh = () => {
  if (selectedSubscription.value) {
    emit('refresh', selectedSubscription.value.id)
  }
  hideContextMenu()
}

// 拖拽相关
const handleDragStart = (e: DragEvent, id: string) => {
  draggedId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (e: DragEvent, id: string) => {
  e.preventDefault()
  if (draggedId.value && draggedId.value !== id) {
    dragOverId.value = id
  }
}

const handleDragLeave = () => {
  dragOverId.value = null
}

const handleDrop = (e: DragEvent, targetId: string) => {
  e.preventDefault()
  if (!draggedId.value || draggedId.value === targetId) {
    draggedId.value = null
    dragOverId.value = null
    return
  }

  // 重新排序
  const ids = props.subscriptions.map(s => s.id)
  const draggedIndex = ids.indexOf(draggedId.value)
  const targetIndex = ids.indexOf(targetId)

  if (draggedIndex !== -1 && targetIndex !== -1) {
    ids.splice(draggedIndex, 1)
    ids.splice(targetIndex, 0, draggedId.value)
    emit('reorder', ids)
  }

  draggedId.value = null
  dragOverId.value = null
}

// 点击外部关闭右键菜单
const handleClickOutside = () => {
  if (contextMenuVisible.value) {
    hideContextMenu()
  }
}
</script>

<template>
  <div class="space-y-4" @click="handleClickOutside">
    <!-- 搜索和筛选栏 -->
    <div class="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-card">
      <!-- 搜索框 -->
      <div class="relative flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索订阅..."
          class="input pl-10"
        />
        <svg
          class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- 分类筛选 -->
      <select v-model="selectedCategoryId" class="input w-40">
        <option value="">全部分类</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>

      <!-- 排序 -->
      <select v-model="sortBy" class="input w-32">
        <option value="updated">最近更新</option>
        <option value="name">名称</option>
        <option value="unread">未读数</option>
      </select>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="card p-6 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-neutral-200 rounded-lg"></div>
          <div class="flex-1">
            <div class="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
            <div class="h-3 bg-neutral-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 订阅列表 -->
    <div v-else class="space-y-2">
      <div
        v-for="subscription in filteredSubscriptions"
        :key="subscription.id"
        class="card p-4 hover:shadow-soft transition-all cursor-pointer group"
        :class="{
          'opacity-50': !subscription.isActive,
          'ring-2 ring-primary-500': dragOverId === subscription.id
        }"
        draggable="true"
        @contextmenu="showContextMenu($event, subscription)"
        @dragstart="handleDragStart($event, subscription.id)"
        @dragover="handleDragOver($event, subscription.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, subscription.id)"
      >
        <div class="flex items-center gap-4">
          <!-- 图标 -->
          <div class="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <img
              v-if="subscription.icon"
              :src="subscription.icon"
              :alt="subscription.title"
              class="w-6 h-6 rounded"
            />
            <svg v-else class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-sm font-medium text-neutral-900 truncate">
                {{ subscription.title }}
              </h3>
              <span
                v-if="subscription.category"
                class="px-1.5 py-0.5 text-xs bg-neutral-100 text-neutral-500 rounded"
              >
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
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="subscription.unreadCount > 0
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-neutral-100 text-neutral-500'"
              >
                {{ subscription.unreadCount }} 未读
              </span>
            </div>

            <!-- 最后更新 -->
            <span class="text-xs text-neutral-400 hidden sm:block">
              {{ formatDate(subscription.lastUpdated) }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <!-- 刷新 -->
            <button
              class="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="刷新"
              @click.stop="emit('refresh', subscription.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- 启用/禁用 -->
            <button
              class="p-1.5 rounded-lg transition-colors"
              :class="subscription.isActive
                ? 'text-success-500 hover:bg-success-50'
                : 'text-neutral-400 hover:bg-neutral-100'"
              :title="subscription.isActive ? '禁用' : '启用'"
              @click.stop="emit('toggle-active', subscription.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="subscription.isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <!-- 编辑 -->
            <button
              class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              title="编辑"
              @click.stop="emit('edit', subscription.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <!-- 删除 -->
            <button
              class="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
              title="删除"
              @click.stop="emit('delete', subscription.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- 拖拽手柄 -->
          <div class="p-1 text-neutral-300 cursor-move">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && filteredSubscriptions.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
      <h3 class="text-lg font-medium text-neutral-900 mb-2">
        {{ searchQuery ? '未找到匹配的订阅' : '暂无订阅' }}
      </h3>
      <p class="text-neutral-500">
        {{ searchQuery ? '尝试其他搜索关键词' : '添加你的第一个 RSS 订阅源' }}
      </p>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="fixed bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 min-w-[160px]"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      >
        <button
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleRefresh"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
        <button
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleEdit"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          编辑
        </button>
        <button
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleToggleActive"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          {{ selectedSubscription?.isActive ? '禁用' : '启用' }}
        </button>
        <hr class="my-2 border-neutral-100" />
        <button
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50"
          @click="handleDelete"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>
      </div>
    </teleport>
  </div>
</template>
