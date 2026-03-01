<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Subscription, Category } from '@/types'
import SubscriptionItem from './SubscriptionItem.vue'

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
  (e: 'batch-delete', ids: string[]): void
  (e: 'select', id: string): void
  (e: 'rename-category', id: string): void
  (e: 'delete-category', id: string): void
}>()

// 搜索和筛选
const searchQuery = ref('')
const selectedCategoryId = ref<string>('')
const sortBy = ref<'name' | 'unread' | 'updated'>('updated')

// 批量选择状态
const isSelectMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedSubscription = ref<Subscription | null>(null)
const selectedCategory = ref<Category | null>(null)

// 拖拽状态
const draggedId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

// 分类折叠状态
const collapsedCategories = ref<Set<string>>(new Set())

const toggleCategory = (id: string) => {
  if (collapsedCategories.value.has(id)) {
    collapsedCategories.value.delete(id)
  } else {
    collapsedCategories.value.add(id)
  }
}

// 视图模式判断
const isGroupedView = computed(() => {
  // 如果有搜索词，或者选择了特定分类，或者是批量选择模式，或者是按未读数排序，则使用平铺视图
  if (searchQuery.value || selectedCategoryId.value || isSelectMode.value || sortBy.value === 'unread') {
    return false
  }
  return true
})

// 分组后的订阅
const groupedSubscriptions = computed(() => {
  const groups: Record<string, Subscription[]> = {}
  const uncategorized: Subscription[] = []

  // 初始化所有分类的组
  props.categories.forEach(c => {
    groups[c.id] = []
  })

  // 分配订阅
  props.subscriptions.forEach(s => {
    if (s.categoryId && groups[s.categoryId]) {
      groups[s.categoryId].push(s)
    } else {
      uncategorized.push(s)
    }
  })

  // 排序组内订阅
  const sortFn = (a: Subscription, b: Subscription) => {
    if (sortBy.value === 'name') {
      return a.title.localeCompare(b.title)
    }
    // 默认按更新时间
    const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0
    const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0
    return bTime - aTime
  }

  Object.keys(groups).forEach(key => {
    groups[key].sort(sortFn)
  })
  uncategorized.sort(sortFn)

  return { groups, uncategorized }
})

// 过滤和排序后的订阅（平铺视图用）
const filteredSubscriptions = computed(() => {
  let result = [...props.subscriptions]

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(query) ||
      (s.url?.toLowerCase().includes(query) ?? false) ||
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
      result.sort((a, b) => (b.unreadCount ?? 0) - (a.unreadCount ?? 0))
      break
    case 'updated':
      result.sort((a, b) => {
        const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0
        const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0
        return bTime - aTime
      })
      break
  }

  return result
})

// 是否全选
const isAllSelected = computed(() => {
  return filteredSubscriptions.value.length > 0 &&
    filteredSubscriptions.value.every(s => selectedIds.value.has(s.id))
})

// 是否有选中
const hasSelected = computed(() => selectedIds.value.size > 0)

// 进入/退出选择模式
const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedIds.value.clear()
  }
}

// 切换单个选择
const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredSubscriptions.value.forEach(s => selectedIds.value.add(s.id))
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedIds.value.size === 0) return

  const count = selectedIds.value.size
  if (confirm(`确定要删除选中的 ${count} 个订阅吗？此操作不可恢复。`)) {
    emit('batch-delete', Array.from(selectedIds.value))
    selectedIds.value.clear()
    isSelectMode.value = false
  }
}

// 显示右键菜单
const showContextMenu = (e: MouseEvent, subscription: Subscription) => {
  e.preventDefault()
  contextMenuVisible.value = true
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  selectedSubscription.value = subscription
  selectedCategory.value = null
}

// 显示分类右键菜单
const showCategoryContextMenu = (e: MouseEvent, category: Category) => {
  // e.preventDefault() // 使用修饰符处理
  contextMenuVisible.value = true
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  selectedCategory.value = category
  selectedSubscription.value = null
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  selectedSubscription.value = null
  selectedCategory.value = null
}

// 右键菜单操作
const handleEdit = () => {
  if (selectedSubscription.value) {
    emit('edit', selectedSubscription.value.id)
  } else if (selectedCategory.value) {
    emit('rename-category', selectedCategory.value.id)
  }
  hideContextMenu()
}

const handleDelete = () => {
  if (selectedSubscription.value && confirm('确定要删除此订阅吗？')) {
    emit('delete', selectedSubscription.value.id)
  } else if (selectedCategory.value && confirm('确定要删除此分类吗？分类下的订阅将被移至未分类。')) {
    emit('delete-category', selectedCategory.value.id)
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
  if (isSelectMode.value) return
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
      <!-- 批量操作按钮 -->
      <div class="flex items-center gap-2">
        <button v-if="!isSelectMode" class="btn btn-ghost text-sm" @click="toggleSelectMode">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          批量管理
        </button>
        <template v-else>
          <button class="btn btn-ghost text-sm" @click="toggleSelectAll">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="isAllSelected" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
          <button class="btn btn-danger text-sm" :disabled="!hasSelected" @click="handleBatchDelete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除 ({{ selectedIds.size }})
          </button>
          <button class="btn btn-secondary text-sm" @click="toggleSelectMode">
            取消
          </button>
        </template>
      </div>

      <!-- 搜索框 -->
      <div class="relative flex-1 min-w-[200px]">
        <input v-model="searchQuery" type="text" placeholder="搜索订阅..." class="input pl-10" />
        <svg class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor"
          viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- 分类筛选 (仅在非分组视图或有特定筛选时显示，或者作为平铺视图的开关) -->
      <!-- 如果我们默认是分组视图，这个下拉框可以用来强制筛选某个分类并进入平铺模式 -->
      <select v-model="selectedCategoryId" class="input w-40">
        <option value="">全部分类 (分组)</option>
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
      <!-- 分组视图 -->
      <template v-if="isGroupedView">
        <div v-for="category in categories" :key="category.id" class="space-y-2">
          <!-- 只有当分类下有订阅时才显示 -->
          <template v-if="groupedSubscriptions.groups[category.id] && groupedSubscriptions.groups[category.id].length">
            <!-- 分类标题 -->
            <div class="flex items-center gap-1 px-2 py-1 group select-none"
              @contextmenu.prevent.stop="showCategoryContextMenu($event, category)">
              <!-- 折叠按钮 -->
              <div
                class="p-1 rounded cursor-pointer text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                @click.stop="toggleCategory(category.id)">
                <svg class="w-4 h-4 transition-transform duration-200"
                  :class="{ '-rotate-90': collapsedCategories.has(category.id) }" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <!-- 文件夹内容 -->
              <div class="flex-1 flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-neutral-50">
                <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19.7 7h-7.2l-1.3-2.3c-.4-.6-1-.9-1.7-.9H4c-1.1 0-2 .9-2 2v12.5c0 1.1.9 2 2 2h15.7c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" />
                </svg>
                <span class="font-medium text-sm text-neutral-600 group-hover:text-neutral-900">{{ category.name
                  }}</span>
                <span class="text-xs text-neutral-400">({{ groupedSubscriptions.groups[category.id].length }})</span>
              </div>
            </div>

            <!-- 订阅列表 -->
            <div v-show="!collapsedCategories.has(category.id)" class="space-y-2 pl-4">
              <SubscriptionItem v-for="subscription in groupedSubscriptions.groups[category.id]" :key="subscription.id"
                :subscription="subscription" :is-select-mode="isSelectMode"
                :is-selected="selectedIds.has(subscription.id)" :drag-over-id="dragOverId" @toggle-select="toggleSelect"
                @contextmenu="showContextMenu" @dragstart="handleDragStart" @dragover="handleDragOver"
                @dragleave="handleDragLeave" @drop="handleDrop" @refresh="id => emit('refresh', id)"
                @toggle-active="id => emit('toggle-active', id)" @edit="id => emit('edit', id)"
                @delete="id => emit('delete', id)" @click="id => emit('select', id)" />
            </div>
          </template>
        </div>

        <!-- 未分类订阅 -->
        <div v-if="groupedSubscriptions.uncategorized.length" class="space-y-2">
          <div class="flex items-center gap-2 px-2 py-1 text-neutral-500 select-none">
            <span class="font-medium text-sm">未分类</span>
            <span class="text-xs text-neutral-400">({{ groupedSubscriptions.uncategorized.length }})</span>
          </div>
          <div class="space-y-2 pl-4">
            <SubscriptionItem v-for="subscription in groupedSubscriptions.uncategorized" :key="subscription.id"
              :subscription="subscription" :is-select-mode="isSelectMode"
              :is-selected="selectedIds.has(subscription.id)" :drag-over-id="dragOverId" @toggle-select="toggleSelect"
              @contextmenu="showContextMenu" @dragstart="handleDragStart" @dragover="handleDragOver"
              @dragleave="handleDragLeave" @drop="handleDrop" @refresh="id => emit('refresh', id)"
              @toggle-active="id => emit('toggle-active', id)" @edit="id => emit('edit', id)"
              @delete="id => emit('delete', id)" @click="id => emit('select', id)" />
          </div>
        </div>
      </template>

      <!-- 平铺视图 -->
      <template v-else>
        <SubscriptionItem v-for="subscription in filteredSubscriptions" :key="subscription.id"
          :subscription="subscription" :is-select-mode="isSelectMode" :is-selected="selectedIds.has(subscription.id)"
          :drag-over-id="dragOverId" @toggle-select="toggleSelect" @contextmenu="showContextMenu"
          @dragstart="handleDragStart" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop"
          @refresh="id => emit('refresh', id)" @toggle-active="id => emit('toggle-active', id)"
          @edit="id => emit('edit', id)" @delete="id => emit('delete', id)" @click="id => emit('select', id)" />
      </template>
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && filteredSubscriptions.length === 0" class="text-center py-16">
      <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
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
      <div v-if="contextMenuVisible"
        class="fixed bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 min-w-[160px]"
        :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }">
        <button v-if="selectedSubscription"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleRefresh">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
        <button class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleEdit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {{ selectedCategory ? '重命名' : '编辑' }}
        </button>
        <button v-if="selectedSubscription"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="handleToggleActive">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          {{ selectedSubscription?.isActive ? '禁用' : '启用' }}
        </button>
        <hr class="my-2 border-neutral-100" />
        <button class="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50"
          @click="handleDelete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>
      </div>
    </teleport>
  </div>
</template>
