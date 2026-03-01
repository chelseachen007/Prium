<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useArticleStore } from '@/stores/articles'
import ArticleList from '@/components/article/ArticleList.vue'
import type { ArticleFilter, ViewMode, SortOption } from '@/types'

const route = useRoute()
const articleStore = useArticleStore()

// 注入刷新侧边栏的方法
const refreshSidebar = inject<() => void>('refreshSidebar')

// 状态
const currentFilter = ref<ArticleFilter>('all')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')
const selectedCategoryId = ref<string>('')
const selectedSubscriptionId = ref<string>('')
const searchQuery = ref<string>('')

// 加载文章
const loadArticles = async (loadMore = false) => {
  const options: Record<string, unknown> = {}

  if (selectedCategoryId.value) {
    options.categoryId = selectedCategoryId.value
  }

  if (selectedSubscriptionId.value) {
    options.subscriptionId = selectedSubscriptionId.value
  }

  if (currentFilter.value === 'unread') {
    options.isRead = false
  } else if (currentFilter.value === 'starred') {
    options.isStarred = true
  }

  if (searchQuery.value) {
    options.search = searchQuery.value
  }

  if (loadMore) {
    await articleStore.loadMore()
  } else {
    await articleStore.fetchArticles(options)
  }
}

// 过滤后的文章列表（前端排序）
const articles = computed(() => {
  let result = [...articleStore.articles]

  // 应用排序
  if (currentSort.value === 'date') {
    result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  } else if (currentSort.value === 'source') {
    result.sort((a, b) => (a.source?.name || '').localeCompare(b.source?.name || ''))
  } else if (currentSort.value === 'readTime') {
    result.sort((a, b) => {
      const aTime = parseInt(String(a.readTime || '0'))
      const bTime = parseInt(String(b.readTime || '0'))
      return aTime - bTime
    })
  }

  return result
})

// 处理过滤变化
const handleFilterChange = (filter: ArticleFilter) => {
  currentFilter.value = filter
}

// 处理视图变化
const handleViewChange = (view: ViewMode) => {
  currentView.value = view
}

// 处理排序变化
const handleSortChange = (sort: SortOption) => {
  currentSort.value = sort
}

// 切换收藏
const toggleStar = async (id: string) => {
  const article = articleStore.articles.find(a => a.id === id)
  if (!article) return

  if (article.isStarred) {
    await articleStore.unstarArticle(id)
  } else {
    await articleStore.starArticle(id)
  }
}

// 标记已读
const markRead = async (id: string) => {
  const article = articleStore.articles.find(a => a.id === id)
  if (!article || article.isRead) return

  await articleStore.markAsRead(id)
}

// 一键已读 - 标记所有未读文章为已读
const markAllRead = async () => {
  if (!confirm('确定要将所有未读文章标记为已读吗？')) return

  const options: { categoryId?: string; subscriptionId?: string } = {}
  if (selectedCategoryId.value) {
    options.categoryId = selectedCategoryId.value
  }
  if (selectedSubscriptionId.value) {
    options.subscriptionId = selectedSubscriptionId.value
  }

  await articleStore.markAllAsRead(options)
  // 刷新侧边栏未读数
  refreshSidebar?.()
}

// 保存到 Obsidian
const saveToObsidian = (id: string) => {
  console.log('Save to Obsidian:', id)
  // TODO: 实现 Obsidian 保存功能
}

// 加载更多
const loadMore = () => {
  if (articleStore.isLoadingMore || !articleStore.hasMore) return
  loadArticles(true)
}

// 监听路由参数变化
watch(() => route.query.category, (categoryId) => {
  selectedCategoryId.value = (categoryId as string) || ''
  selectedSubscriptionId.value = ''
  loadArticles()
})

// 监听订阅源参数变化
watch(() => route.query.subscription, (subscriptionId) => {
  selectedSubscriptionId.value = (subscriptionId as string) || ''
  selectedCategoryId.value = ''
  loadArticles()
})

// 监听搜索参数变化
watch(() => route.query.search, (query) => {
  searchQuery.value = (query as string) || ''
  loadArticles()
})

// 监听过滤条件变化
watch(currentFilter, () => {
  loadArticles()
})

// 初始加载
onMounted(() => {
  loadArticles()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900">
        <span v-if="searchQuery">搜索结果</span>
        <span v-else-if="selectedCategoryId">分类文章</span>
        <span v-else>信息流</span>
      </h2>
      <p class="text-neutral-500 mt-1">
        共 {{ articleStore.pagination.total }} 篇文章
        <span v-if="searchQuery">· 搜索 "{{ searchQuery }}"</span>
        <span v-if="currentFilter === 'unread'">· 未读筛选</span>
        <span v-if="currentFilter === 'starred'">· 收藏筛选</span>
      </p>
    </div>

    <!-- 文章列表 -->
    <ArticleList
      :articles="articles"
      :is-loading="articleStore.isLoading"
      :has-more="articleStore.hasMore"
      @load-more="loadMore"
      @toggle-star="toggleStar"
      @mark-read="markRead"
      @save-to-obsidian="saveToObsidian"
      @filter-change="handleFilterChange"
      @view-change="handleViewChange"
      @sort-change="handleSortChange"
      @mark-all-read="markAllRead"
    />
  </div>
</template>
