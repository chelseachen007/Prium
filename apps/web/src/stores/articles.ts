/**
 * 文章状态管理
 * @module stores/articles
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type {
  Article,
  ArticleQueryOptions,
  ArticleStats,
  BatchAction,
  ArticleBatchResult,
} from '@/types'

/**
 * 文章 Store
 *
 * 使用 Supabase 管理文章列表、当前文章、分页信息、过滤条件和标记操作
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
      f.isRead !== undefined ||
      f.isStarred !== undefined ||
      f.search ||
      f.startDate ||
      f.endDate
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return
      }

      const page = resetPage ? 1 : pagination.value.page
      const pageSize = pagination.value.pageSize
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 构建查询
      let query = supabase
        .from('articles')
        .select(
          '*, subscription:subscriptions(id, title, imageUrl)',
          { count: 'exact' }
        )
        .range(from, to)

      // 应用过滤条件
      if (filters.value.subscriptionId) {
        query = query.eq('subscriptionId', filters.value.subscriptionId)
      }

      if (filters.value.isRead !== undefined) {
        query = query.eq('isRead', filters.value.isRead)
      }

      if (filters.value.isStarred !== undefined) {
        query = query.eq('isStarred', filters.value.isStarred)
      }

      if (filters.value.search) {
        query = query.or(
          `title.ilike.%${filters.value.search}%,content.ilike.%${filters.value.search}%`
        )
      }

      if (filters.value.startDate) {
        query = query.gte(
          'publishedAt',
          filters.value.startDate instanceof Date
            ? filters.value.startDate.toISOString()
            : filters.value.startDate
        )
      }

      if (filters.value.endDate) {
        query = query.lte(
          'publishedAt',
          filters.value.endDate instanceof Date
            ? filters.value.endDate.toISOString()
            : filters.value.endDate
        )
      }

      // 排序
      query = query.order('publishedAt', { ascending: false })

      const { data, error: supabaseError, count } = await query

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      if (resetPage) {
        articles.value = data || []
      } else {
        articles.value = [...articles.value, ...(data || [])]
      }

      const totalPages = Math.ceil((count || 0) / pageSize)
      pagination.value = {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      }
      lastUpdated.value = new Date()
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取文章列表失败'
      error.value = message
      console.error('获取文章列表失败:', e)
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

    pagination.value.page++
    await fetchArticles(filters.value, false)
  }

  /**
   * 获取单个文章详情
   */
  async function fetchArticle(id: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('articles')
        .select(
          '*, subscription:subscriptions(id, title, imageUrl, siteUrl)'
        )
        .eq('id', id)
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      currentArticle.value = data
      // 更新列表中的文章
      const index = articles.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        articles.value[index] = data
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取文章详情失败'
      error.value = message
      console.error('获取文章详情失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取文章统计信息
   */
  async function fetchStats(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // 获取用户的所有订阅
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('userId', user.id)

      const subscriptionIds = subscriptions?.map((s) => s.id) || []

      if (subscriptionIds.length === 0) {
        stats.value = {
          total: 0,
          totalArticles: 0,
          unread: 0,
          unreadArticles: 0,
          readArticles: 0,
          today: 0,
          thisWeek: 0,
          starred: 0,
          starredArticles: 0,
          saved: 0,
        }
        return
      }

      // 获取文章总数
      const { count: totalCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('subscriptionId', subscriptionIds)

      // 获取已读数
      const { count: readCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('subscriptionId', subscriptionIds)
        .eq('isRead', true)

      // 获取未读数
      const { count: unreadCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('subscriptionId', subscriptionIds)
        .eq('isRead', false)

      // 获取收藏数
      const { count: starredCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('subscriptionId', subscriptionIds)
        .eq('isStarred', true)

      stats.value = {
        total: totalCount || 0,
        totalArticles: totalCount || 0,
        unread: unreadCount || 0,
        unreadArticles: unreadCount || 0,
        readArticles: readCount || 0,
        today: 0, // 需要额外查询
        thisWeek: 0, // 需要额外查询
        starred: starredCount || 0,
        starredArticles: starredCount || 0,
        saved: 0, // 需要额外查询
      }
    } catch (e) {
      console.error('获取文章统计信息失败:', e)
    }
  }

  /**
   * 标记文章为已读
   */
  async function markAsRead(id: string): Promise<boolean> {
    return updateArticleField(id, 'isRead', true)
  }

  /**
   * 标记文章为未读
   */
  async function markAsUnread(id: string): Promise<boolean> {
    return updateArticleField(id, 'isRead', false)
  }

  /**
   * 收藏文章
   */
  async function starArticle(id: string): Promise<boolean> {
    return updateArticleField(id, 'isStarred', true)
  }

  /**
   * 取消收藏文章
   */
  async function unstarArticle(id: string): Promise<boolean> {
    return updateArticleField(id, 'isStarred', false)
  }

  /**
   * 更新文章字段的通用方法
   */
  async function updateArticleField(
    id: string,
    field: 'isRead' | 'isStarred',
    value: boolean
  ): Promise<boolean> {
    try {
      const { error: supabaseError } = await supabase
        .from('articles')
        .update({ [field]: value })
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      // 更新本地状态
      const index = articles.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        articles.value[index] = { ...articles.value[index], [field]: value }
      }
      if (currentArticle.value?.id === id) {
        currentArticle.value = { ...currentArticle.value, [field]: value }
      }

      return true
    } catch (e) {
      console.error(`更新文章状态失败 (${field}):`, e)
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
      let updateData: Record<string, unknown> = {}

      switch (action) {
        case 'markRead':
          updateData = { isRead: true }
          break
        case 'markUnread':
          updateData = { isRead: false }
          break
        case 'star':
          updateData = { isStarred: true }
          break
        case 'unstar':
          updateData = { isStarred: false }
          break
        case 'delete':
          // 删除操作
          const { error: deleteError } = await supabase
            .from('articles')
            .delete()
            .in('id', articleIds)

          if (deleteError) {
            throw new Error(deleteError.message)
          }

          // 从本地列表中移除
          articles.value = articles.value.filter(
            (a) => !articleIds.includes(a.id)
          )

          return {
            success: articleIds.length,
            failed: 0,
            errors: [],
          }
      }

      // 执行批量更新
      const { error: updateError } = await supabase
        .from('articles')
        .update(updateData)
        .in('id', articleIds)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // 更新本地状态
      for (const id of articleIds) {
        const index = articles.value.findIndex((a) => a.id === id)
        if (index !== -1) {
          articles.value[index] = {
            ...articles.value[index],
            ...updateData,
          }
        }
      }

      return {
        success: articleIds.length,
        failed: 0,
        errors: [],
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '批量操作失败'
      error.value = message
      console.error('批量操作失败:', e)
      return null
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return false
      }

      // 获取用户的订阅 ID 列表
      let subscriptionQuery = supabase
        .from('subscriptions')
        .select('id')
        .eq('userId', user.id)

      if (options?.categoryId) {
        subscriptionQuery = subscriptionQuery.eq('categoryId', options.categoryId)
      }

      const { data: subscriptions } = await subscriptionQuery
      const subscriptionIds = subscriptions?.map((s) => s.id) || []

      if (subscriptionIds.length === 0) {
        return true
      }

      // 批量更新文章
      let updateQuery = supabase
        .from('articles')
        .update({ isRead: true })
        .in('subscriptionId', subscriptionIds)
        .eq('isRead', false)

      if (options?.subscriptionId) {
        updateQuery = updateQuery.eq('subscriptionId', options.subscriptionId)
      }

      const { error: updateError } = await updateQuery

      if (updateError) {
        throw new Error(updateError.message)
      }

      // 更新本地状态
      for (const article of articles.value) {
        if (
          !options?.subscriptionId ||
          article.subscriptionId === options.subscriptionId
        ) {
          if (
            !options?.categoryId ||
            subscriptionIds.includes(article.subscriptionId)
          ) {
            article.isRead = true
          }
        }
      }

      // 刷新统计信息
      await fetchStats()

      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '标记全部已读失败'
      error.value = message
      console.error('标记全部已读失败:', e)
      return false
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
    updateArticleField,
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
