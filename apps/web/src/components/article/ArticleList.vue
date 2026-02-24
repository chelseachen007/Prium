<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ArticleCard from './ArticleCard.vue'
import type { Article, ArticleFilter, ViewMode, SortOption } from '@/types'

const props = withDefaults(defineProps<{
  articles: Article[]
  isLoading?: boolean
  hasMore?: boolean
}>(), {
  isLoading: false,
  hasMore: false,
})

const emit = defineEmits<{
  (e: 'load-more'): void
  (e: 'toggle-star', id: string): void
  (e: 'mark-read', id: string): void
  (e: 'save-to-obsidian', id: string): void
  (e: 'filter-change', filter: ArticleFilter): void
  (e: 'view-change', view: ViewMode): void
  (e: 'sort-change', sort: SortOption): void
  (e: 'mark-all-read'): void
}>()

// 筛选和视图状态
const currentFilter = ref<ArticleFilter>('all')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')

// 过滤器选项
const filterOptions: { value: ArticleFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'starred', label: '收藏' },
]

// 排序选项
const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'date', label: '按时间排序' },
  { value: 'source', label: '按来源排序' },
  { value: 'readTime', label: '按阅读时长排序' },
]

// 虚拟滚动相关
const containerRef = ref<HTMLElement | null>(null)
const itemHeight = 280 // 预估每个卡片高度（增加以显示更多摘要内容）
const bufferSize = 5

const visibleRange = computed(() => {
  if (!containerRef.value) return { start: 0, end: 20 }

  const scrollTop = containerRef.value.scrollTop
  const containerHeight = containerRef.value.clientHeight

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
  const end = Math.min(
    props.articles.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
  )

  return { start, end }
})

const visibleArticles = computed(() => {
  return props.articles.slice(visibleRange.value.start, visibleRange.value.end)
})

const totalHeight = computed(() => {
  return props.articles.length * itemHeight
})

const offsetY = computed(() => {
  return visibleRange.value.start * itemHeight
})

// 滚动加载更多
const handleScroll = () => {
  if (!containerRef.value || !props.hasMore || props.isLoading) return

  const { scrollTop, scrollHeight, clientHeight } = containerRef.value
  if (scrollHeight - scrollTop - clientHeight < 200) {
    emit('load-more')
  }
}

// 处理事件
const handleToggleStar = (id: string) => emit('toggle-star', id)
const handleMarkRead = (id: string) => emit('mark-read', id)
const handleSaveToObsidian = (id: string) => emit('save-to-obsidian', id)

const handleFilterChange = (filter: ArticleFilter) => {
  currentFilter.value = filter
  emit('filter-change', filter)
}

const handleViewChange = (view: ViewMode) => {
  currentView.value = view
  emit('view-change', view)
}

const handleSortChange = () => {
  emit('sort-change', currentSort.value)
}

// 统计信息
const stats = computed(() => ({
  total: props.articles.length,
  unread: props.articles.filter(a => !a.isRead).length,
  starred: props.articles.filter(a => a.isStarred).length,
}))

// 挂载和卸载
onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-4 mb-4 p-4 bg-white rounded-xl shadow-sm border border-neutral-200">
      <!-- 筛选按钮 -->
      <div class="flex items-center gap-2">
        <button
          v-for="option in filterOptions"
          :key="option.value"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="currentFilter === option.value
            ? 'bg-primary-100 text-primary-700'
            : 'text-neutral-600 hover:bg-neutral-100'"
          @click="handleFilterChange(option.value)"
        >
          {{ option.label }}
          <span v-if="option.value === 'unread'" class="ml-1 text-xs">
            ({{ stats.unread }})
          </span>
          <span v-if="option.value === 'starred'" class="ml-1 text-xs">
            ({{ stats.starred }})
          </span>
        </button>

        <!-- 一键已读按钮 -->
        <button
          v-if="stats.unread > 0"
          class="px-3 py-1.5 text-sm font-medium rounded-lg text-neutral-600 hover:bg-success-50 hover:text-success-700 transition-colors"
          @click="emit('mark-all-read')"
        >
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          全部已读
        </button>
      </div>

      <!-- 视图切换和排序 -->
      <div class="flex items-center gap-3">
        <!-- 视图切换 -->
        <div class="flex items-center bg-neutral-100 rounded-lg p-1">
          <button
            class="p-1.5 rounded-md transition-colors"
            :class="currentView === 'list' ? 'bg-white shadow-sm text-neutral-700' : 'text-neutral-400'"
            title="列表视图"
            @click="handleViewChange('list')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            class="p-1.5 rounded-md transition-colors"
            :class="currentView === 'card' ? 'bg-white shadow-sm text-neutral-700' : 'text-neutral-400'"
            title="卡片视图"
            @click="handleViewChange('card')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        </div>

        <!-- 排序 -->
        <select
          v-model="currentSort"
          class="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          @change="handleSortChange"
        >
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 文章列表容器 -->
    <div
      ref="containerRef"
      class="flex-1 overflow-y-auto"
    >
      <!-- 加载状态 -->
      <div v-if="isLoading && articles.length === 0" class="space-y-4">
        <div v-for="i in 5" :key="i" class="card p-6 animate-pulse">
          <div class="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
          <div class="h-3 bg-neutral-100 rounded w-full mb-2"></div>
          <div class="h-3 bg-neutral-100 rounded w-2/3"></div>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div
        v-else-if="currentView === 'card'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <ArticleCard
          v-for="article in articles"
          :key="article.id"
          :article="article"
          @toggle-star="handleToggleStar"
          @mark-read="handleMarkRead"
          @save-to-obsidian="handleSaveToObsidian"
        />
      </div>

      <!-- 列表视图（带虚拟滚动） -->
      <div v-else class="relative" :style="{ height: `${totalHeight}px` }">
        <div
          class="absolute w-full space-y-4"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <ArticleCard
            v-for="article in visibleArticles"
            :key="article.id"
            :article="article"
            @toggle-star="handleToggleStar"
            @mark-read="handleMarkRead"
            @save-to-obsidian="handleSaveToObsidian"
          />
        </div>
      </div>

      <!-- 加载更多指示器 -->
      <div v-if="isLoading && articles.length > 0" class="flex justify-center py-4">
        <svg class="w-6 h-6 text-primary-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && articles.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <h3 class="text-lg font-medium text-neutral-900 mb-2">暂无文章</h3>
        <p class="text-neutral-500 mb-4">添加 RSS 订阅源开始阅读</p>
        <router-link to="/subscriptions" class="btn-primary inline-flex">
          添加订阅
        </router-link>
      </div>
    </div>
  </div>
</template>
