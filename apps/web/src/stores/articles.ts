/**
 * 文章状态管理
 * @module stores/articles
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Article,
  ArticleQueryOptions,
  ArticleStats,
  BatchAction,
  ArticleBatchResult,
  PaginatedResponse,
} from '@rss-reader/shared'
import { useApi, ApiError } from '@/composables/useApi'

/**
 * 文章 Store
 *
 * 管理文章列表、当前文章、分页信息、过滤条件和标记操作
 *
 * @example
 * ```typescript
 * const articleStore = useArticleStore()
 *
 * // 获取文章列表
 * await articleStore.fetchArticles()
 *
 * // 标记文章为已读
 * await articleStore.markAsRead('article-id')
 * ```
 */
export const useArticleStore = defineStore('articles', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 文章列表 */
  const articles = ref<Article[]>([])

  /** 当前查看的文章 */
  const currentArticle = ref<Article | null>(null)

  /** 文章统计信息 */
  const stats = ref<ArticleStats | null>(null)

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 是否正在加载更多 */
  const isLoadingMore = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 最后更新时间 */
  const lastUpdated = ref<Date | null>(null)

  /** 分页信息 */
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  /** 过滤条件 */
  const filters = ref<ArticleQueryOptions>({})

  // ============================================================================
  // Getters
  // ============================================================================

  /** 文章总数 */
  const totalCount = computed(() => pagination.value.total)

  /** 未读文章列表 */
  const unreadArticles = computed(() => {
    return articles.value.filter((article) => !article.isRead)
  })

  /** 收藏文章列表 */
  const starredArticles = computed(() => {
    return articles.value.filter((article) => article.isStarred)
  })

  /** 已保存文章列表 */
  const savedArticles = computed(() => {
    return articles.value.filter((article) => article.isSaved)
  })

  /** 当前过滤条件下的文章数量 */
  const filteredCount = computed(() => articles.value.length)

  /** 是否有更多文章 */
  const hasMore = computed(() => pagination.value.hasMore)

  /** 是否有活跃的过滤条件 */
  const hasActiveFilters = computed(() => {
    const f = filters.value
    return !!(
      f.subscriptionId ||
      f.categoryId ||
      f.tag ||
      f.isRead !== undefined ||
      f.isStarred !== undefined ||
      f.isSaved !== undefined ||
      f.search ||
      f.startDate ||
      f.endDate ||
      f.minQualityScore
    )
  })

  /** 文章 ID 到文章的映射 */
  const articleMap = computed(() => {
    return new Map(articles.value.map((article) => [article.id, article]))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 获取文章列表
   */
  async function fetchArticles(
    options?: ArticleQueryOptions,
    resetPage = true
  ): Promise<void> {
    if (resetPage) {
      isLoading.value = true
    } else {
      isLoadingMore.value = true
    }
    error.value = null

    if (options) {
      filters.value = { ...filters.value, ...options }
    }

    try {
      const api = useApi()
      const queryParams: Record<string, unknown> = {
        page: resetPage ? 1 : pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...filters.value,
      }

      // 处理日期参数
      if (filters.value.startDate) {
        queryParams.startDate = filters.value.startDate.toISOString()
      }
      if (filters.value.endDate) {
        queryParams.endDate = filters.value.endDate.toISOString()
      }

      const response = await api.getPaginated<Article>('/articles', queryParams)

      if (response.success) {
        if (resetPage) {
          articles.value = response.data
        } else {
          articles.value = [...articles.value, ...response.data]
        }
        pagination.value = {
          page: response.page,
          pageSize: response.pageSize,
          total: response.total,
          totalPages: response.totalPages || Math.ceil(response.total / response.pageSize),
          hasMore: response.hasMore ?? response.page < (response.totalPages || Math.ceil(response.total / response.pageSize)),
        }
        lastUpdated.value = new Date()
      } else {
        error.value = response.error || '获取文章列表失败'
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取文章列表时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  /**
   * 加载更多文章
   */
  async function loadMore(): Promise<void> {
    if (!hasMore.value || isLoadingMore.value) {
      return
    }

    filters.value.page = pagination.value.page + 1
    await fetchArticles(filters.value, false)
  }

  /**
   * 获取单个文章详情
   */
  async function fetchArticle(id: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.get<Article>(`/articles/${id}`)

      if (response.success && response.data) {
        currentArticle.value = response.data
        // 更新列表中的文章
        const index = articles.value.findIndex((a) => a.id === id)
        if (index !== -1) {
          articles.value[index] = response.data
        }
      } else {
        error.value = response.error || '获取文章详情失败'
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取文章详情时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取文章统计信息
   */
  async function fetchStats(): Promise<void> {
    try {
      const api = useApi()
      const response = await api.get<ArticleStats>('/articles/stats')

      if (response.success && response.data) {
        stats.value = response.data
      }
    } catch (e) {
      console.error('获取文章统计信息失败:', e)
    }
  }

  /**
   * 标记文章为已读
   */
  async function markAsRead(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'markRead')
  }

  /**
   * 标记文章为未读
   */
  async function markAsUnread(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'markUnread')
  }

  /**
   * 收藏文章
   */
  async function starArticle(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'star')
  }

  /**
   * 取消收藏文章
   */
  async function unstarArticle(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'unstar')
  }

  /**
   * 保存文章到 Obsidian
   */
  async function saveArticle(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'save')
  }

  /**
   * 取消保存文章
   */
  async function unsaveArticle(id: string): Promise<boolean> {
    return updateArticleStatus(id, 'unsave')
  }

  /**
   * 更新文章状态的通用方法
   */
  async function updateArticleStatus(
    id: string,
    action: BatchAction
  ): Promise<boolean> {
    try {
      const api = useApi()
      const response = await api.post<Article>(`/articles/${id}/${action}`)

      if (response.success && response.data) {
        // 更新列表中的文章
        const index = articles.value.findIndex((a) => a.id === id)
        if (index !== -1) {
          articles.value[index] = response.data
        }
        // 更新当前文章
        if (currentArticle.value?.id === id) {
          currentArticle.value = response.data
        }
        return true
      }
      return false
    } catch (e) {
      console.error(`更新文章状态失败 (${action}):`, e)
      return false
    }
  }

  /**
   * 批量操作文章
   */
  async function batchAction(
    articleIds: string[],
    action: BatchAction
  ): Promise<ArticleBatchResult | null> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.post<ArticleBatchResult>('/articles/batch', {
        articleIds,
        action,
      })

      if (response.success && response.data) {
        // 更新本地文章状态
        const successIds = new Set(
          response.data.success === response.data.success
            ? articleIds
            : articleIds
        )

        for (const id of successIds) {
          const index = articles.value.findIndex((a) => a.id === id)
          if (index !== -1) {
            const article = articles.value[index]
            switch (action) {
              case 'markRead':
                article.isRead = true
                break
              case 'markUnread':
                article.isRead = false
                break
              case 'star':
                article.isStarred = true
                break
              case 'unstar':
                article.isStarred = false
                break
              case 'save':
                article.isSaved = true
                break
              case 'unsave':
                article.isSaved = false
                break
              case 'delete':
                articles.value.splice(index, 1)
                break
            }
          }
        }

        return response.data
      } else {
        error.value = response.error || '批量操作失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '批量操作时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 标记所有文章为已读
   */
  async function markAllAsRead(options?: {
    subscriptionId?: string
    categoryId?: string
  }): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.post('/articles/mark-all-read', options)

      if (response.success) {
        // 更新本地状态
        for (const article of articles.value) {
          if (
            !options?.subscriptionId ||
            article.subscriptionId === options.subscriptionId
          ) {
            if (
              !options?.categoryId ||
              // 假设文章有 categoryId 属性，如果没有需要通过 subscription 查找
              true
            ) {
              article.isRead = true
            }
          }
        }

        // 刷新统计信息
        await fetchStats()

        return true
      } else {
        error.value = response.error || '标记全部已读失败'
        return false
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '标记全部已读时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 设置当前文章
   */
  function setCurrentArticle(article: Article | null): void {
    currentArticle.value = article
  }

  /**
   * 设置过滤条件
   */
  function setFilters(newFilters: ArticleQueryOptions): void {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * 重置过滤条件
   */
  function resetFilters(): void {
    filters.value = {}
  }

  /**
   * 设置分页大小
   */
  function setPageSize(size: number): void {
    pagination.value.pageSize = size
  }

  /**
   * 跳转到指定页
   */
  async function goToPage(page: number): Promise<void> {
    pagination.value.page = page
    await fetchArticles(filters.value, false)
  }

  /**
   * 刷新文章列表
   */
  async function refresh(): Promise<void> {
    await fetchArticles(filters.value, true)
    await fetchStats()
  }

  /**
   * 根据 ID 获取文章
   */
  function getArticleById(id: string): Article | undefined {
    return articleMap.value.get(id)
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * 重置 Store
   */
  function $reset(): void {
    articles.value = []
    currentArticle.value = null
    stats.value = null
    isLoading.value = false
    isLoadingMore.value = false
    error.value = null
    lastUpdated.value = null
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasMore: false,
    }
    filters.value = {}
  }

  return {
    // State
    articles,
    currentArticle,
    stats,
    isLoading,
    isLoadingMore,
    error,
    lastUpdated,
    pagination,
    filters,

    // Getters
    totalCount,
    unreadArticles,
    starredArticles,
    savedArticles,
    filteredCount,
    hasMore,
    hasActiveFilters,
    articleMap,

    // Actions
    fetchArticles,
    loadMore,
    fetchArticle,
    fetchStats,
    markAsRead,
    markAsUnread,
    starArticle,
    unstarArticle,
    saveArticle,
    unsaveArticle,
    updateArticleStatus,
    batchAction,
    markAllAsRead,
    setCurrentArticle,
    setFilters,
    resetFilters,
    setPageSize,
    goToPage,
    refresh,
    getArticleById,
    clearError,
    $reset,
  }
})
