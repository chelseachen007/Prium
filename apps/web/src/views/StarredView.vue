<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import ArticleList from '@/components/article/ArticleList.vue'
import type { Article, ArticleFilter, ViewMode, SortOption } from '@/types'

const route = useRoute()
const api = useApi()

// 文章数据
const allArticles = ref<Article[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = 20

// 状态
const isLoading = ref(false)
const isLoadingMore = ref(false)
const currentFilter = ref<ArticleFilter>('starred')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')
const hasMore = ref(false)

// 提取摘要（清理 contentText 中的元数据）
const extractSummary = (article: any): string => {
  if (article.summary) {
    return article.summary
  }

  const contentText = article.contentText || ''
  if (!contentText) {
    return ''
  }

  // 移除常见的元数据行（书名、作者等）
  const lines = contentText.split('\n')
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim()
    // 过滤掉短行和元数据行
    if (trimmed.length < 10) return false
    if (trimmed.startsWith('书名：') || trimmed.startsWith('作者：') ||
        trimmed.startsWith('出版社：') || trimmed.startsWith('出版年：') ||
        trimmed.startsWith('页数：') || trimmed.startsWith('定价：') ||
        trimmed.startsWith('ISBN：') || trimmed.startsWith('元数据') ||
        trimmed === article.title) {
      return false
    }
    return true
  })

  // 合并并截取
  const cleanText = cleanLines.join(' ').trim()
  return cleanText.length > 200 ? cleanText.substring(0, 200) + '...' : cleanText
}

// 加载收藏文章
const loadArticles = async (loadMore = false) => {
  if (loadMore) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      pageSize,
      isStarred: true,
    }

    const response = await api.get<any[]>('/articles', params)

    if (response.success && response.data) {
      const articles = response.data.map((a: any) => ({
        id: a.id,
        title: a.title,
        summary: extractSummary(a),
        content: a.content,
        source: {
          id: a.subscriptionId,
          name: a.subscription?.title || '未知来源',
          url: a.subscription?.siteUrl || '',
          categoryId: a.subscription?.categoryId,
        },
        author: a.author,
        url: a.url,
        publishedAt: a.publishedAt || a.createdAt,
        readTime: a.readingTime ? `${a.readingTime} 分钟` : undefined,
        isRead: a.isRead,
        isStarred: a.isStarred,
        tags: a.aiTags || [],
        coverImage: a.imageUrl,
      }))

      if (loadMore) {
        allArticles.value = [...allArticles.value, ...articles]
      } else {
        allArticles.value = articles
      }

      totalCount.value = (response as any).total || articles.length
      hasMore.value = (response as any).hasMore || false
    }
  } catch (error) {
    console.error('Load starred articles error:', error)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 过滤后的文章列表（前端排序）
const articles = computed(() => {
  let result = [...allArticles.value]

  // 应用排序
  if (currentSort.value === 'date') {
    result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  } else if (currentSort.value === 'source') {
    result.sort((a, b) => a.source.name.localeCompare(b.source.name))
  } else if (currentSort.value === 'readTime') {
    result.sort((a, b) => {
      const aTime = parseInt(a.readTime || '0')
      const bTime = parseInt(b.readTime || '0')
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
  const article = allArticles.value.find(a => a.id === id)
  if (!article) return

  try {
    const response = await api.put(`/articles/${id}/star`, {
      isStarred: !article.isStarred,
    })

    if (response.success) {
      // 如果取消收藏，从列表中移除
      if (!article.isStarred) {
        allArticles.value = allArticles.value.filter(a => a.id !== id)
        totalCount.value--
      } else {
        article.isStarred = false
      }
    }
  } catch (error) {
    console.error('Toggle star error:', error)
  }
}

// 标记已读
const markRead = async (id: string) => {
  const article = allArticles.value.find(a => a.id === id)
  if (!article || article.isRead) return

  try {
    const response = await api.put(`/articles/${id}/read`, {
      isRead: true,
    })

    if (response.success) {
      article.isRead = true
    }
  } catch (error) {
    console.error('Mark read error:', error)
  }
}

// 保存到 Obsidian
const saveToObsidian = (id: string) => {
  console.log('Save to Obsidian:', id)
  // TODO: 实现 Obsidian 保存功能
}

// 加载更多
const loadMore = () => {
  if (isLoadingMore.value || !hasMore.value) return
  currentPage.value++
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
      <p class="text-neutral-500 mt-1">共 {{ totalCount }} 篇收藏文章</p>
    </div>

    <!-- 统计信息 -->
    <div class="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-card">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-warning-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span class="text-sm font-medium text-neutral-700">{{ totalCount }} 篇收藏</span>
      </div>
    </div>

    <!-- 文章列表 -->
    <ArticleList
      :articles="articles"
      :is-loading="isLoading"
      :has-more="hasMore"
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
