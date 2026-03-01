<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useArticleStore } from '@/stores/articles'
import ArticleList from '@/components/article/ArticleList.vue'
import type { ArticleFilter, ViewMode, SortOption } from '@/types'

const articleStore = useArticleStore()

// 状态
const currentFilter = ref<ArticleFilter>('starred')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')

// 加载收藏文章
const loadArticles = async (loadMore = false) => {
  const options = { isStarred: true }

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
    // 取消收藏后从列表中移除
    await loadArticles()
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

// 初始加载
onMounted(() => {
  loadArticles()
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900">收藏</h2>
      <p class="text-neutral-500 mt-1">共 {{ articleStore.pagination.total }} 篇收藏文章</p>
    </div>

    <!-- 统计信息 -->
    <div class="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-card">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-warning-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span class="text-sm font-medium text-neutral-700">{{ articleStore.pagination.total }} 篇收藏</span>
      </div>
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
    />
  </div>
</template>
