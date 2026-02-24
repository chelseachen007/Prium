<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import ArticleList from '@/components/article/ArticleList.vue'
import type { Article, ArticleFilter, ViewMode, SortOption } from '@/types'

const route = useRoute()
const api = useApi()

// 注入刷新侧边栏的方法
const refreshSidebar = inject<() => void>('refreshSidebar')

// 文章数据
const allArticles = ref<Article[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = 20

// 状态
const isLoading = ref(false)
const isLoadingMore = ref(false)
const currentFilter = ref<ArticleFilter>('all')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')
const hasMore = ref(false)
const selectedCategoryId = ref<string>('')
const selectedSubscriptionId = ref<string>('')
const searchQuery = ref<string>('')

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

// 加载文章
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
    }

    if (selectedCategoryId.value) {
      params.categoryId = selectedCategoryId.value
    }

    if (selectedSubscriptionId.value) {
      params.subscriptionId = selectedSubscriptionId.value
    }

    if (currentFilter.value === 'unread') {
      params.isRead = false
    } else if (currentFilter.value === 'starred') {
      params.isStarred = true
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
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
    console.error('Load articles error:', error)
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
      article.isStarred = !article.isStarred
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

// 一键已读 - 标记所有未读文章为已读
const markAllRead = async () => {
  if (!confirm('确定要将所有未读文章标记为已读吗？')) return

  try {
    // 构建批量标记请求参数
    const params: Record<string, unknown> = { isRead: true }
    if (selectedCategoryId.value) {
      params.categoryId = selectedCategoryId.value
    }
    if (selectedSubscriptionId.value) {
      params.subscriptionId = selectedSubscriptionId.value
    }

    const response = await api.post('/articles/batch-read', params)

    if (response.success) {
      // 更新本地状态
      allArticles.value.forEach(article => {
        article.isRead = true
      })
      // 刷新侧边栏未读数
      refreshSidebar?.()
    }
  } catch (error) {
    console.error('Mark all read error:', error)
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

// 监听路由参数变化
watch(() => route.query.category, (categoryId) => {
  selectedCategoryId.value = (categoryId as string) || ''
  selectedSubscriptionId.value = ''
  currentPage.value = 1
  loadArticles()
})

// 监听订阅源参数变化
watch(() => route.query.subscription, (subscriptionId) => {
  selectedSubscriptionId.value = (subscriptionId as string) || ''
  selectedCategoryId.value = ''
  currentPage.value = 1
  loadArticles()
})

// 监听搜索参数变化
watch(() => route.query.search, (query) => {
  searchQuery.value = (query as string) || ''
  currentPage.value = 1
  loadArticles()
})

// 监听过滤条件变化
watch(currentFilter, () => {
  currentPage.value = 1
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
        共 {{ totalCount }} 篇文章
        <span v-if="searchQuery">· 搜索 "{{ searchQuery }}"</span>
        <span v-if="currentFilter === 'unread'">· 未读筛选</span>
        <span v-if="currentFilter === 'starred'">· 收藏筛选</span>
      </p>
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
      @mark-all-read="markAllRead"
    />
  </div>
</template>
