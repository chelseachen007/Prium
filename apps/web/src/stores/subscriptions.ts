/**
 * 订阅状态管理
 * @module stores/subscriptions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryOptions,
  SubscriptionStats,
  SubscriptionImportResult,
} from '@/types'

/**
 * 订阅 Store
 *
 * 使用 Supabase 管理订阅列表、当前订阅、加载状态和 CRUD 操作
 */
export const useSubscriptionStore = defineStore('subscriptions', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 订阅列表 */
  const subscriptions = ref<Subscription[]>([])

  /** 当前选中的订阅 */
  const currentSubscription = ref<Subscription | null>(null)

  /** 订阅统计信息映射 */
  const subscriptionStats = ref<Map<string, SubscriptionStats>>(new Map())

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 是否正在刷新 */
  const isRefreshing = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 最后更新时间 */
  const lastUpdated = ref<Date | null>(null)

  /** 查询选项 */
  const queryOptions = ref<SubscriptionQueryOptions>({})

  // ============================================================================
  // Getters
  // ============================================================================

  /** 活跃的订阅数量 */
  const activeCount = computed(() => {
    return subscriptions.value.filter((sub) => sub.isActive).length
  })

  /** 有错误的订阅列表 */
  const errorSubscriptions = computed(() => {
    return subscriptions.value.filter((sub) => sub.errorCount > 0)
  })

  /** 按分类分组的订阅 */
  const subscriptionsByCategory = computed(() => {
    const grouped = new Map<string | undefined, Subscription[]>()
    for (const sub of subscriptions.value) {
      const list = grouped.get(sub.categoryId) || []
      list.push(sub)
      grouped.set(sub.categoryId, list)
    }
    return grouped
  })

  /** 所有标签列表 */
  const allTags = computed(() => {
    const tagSet = new Set<string>()
    for (const sub of subscriptions.value) {
      for (const tag of sub.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  })

  /** 根据筛选条件过滤的订阅列表 */
  const filteredSubscriptions = computed(() => {
    let result = [...subscriptions.value]
    const options = queryOptions.value

    if (options.categoryId) {
      result = result.filter((sub) => sub.categoryId === options.categoryId)
    }

    if (options.tag) {
      result = result.filter((sub) => sub.tags.includes(options.tag!))
    }

    if (options.isActive !== undefined) {
      result = result.filter((sub) => sub.isActive === options.isActive)
    }

    if (options.search) {
      const search = options.search.toLowerCase()
      result = result.filter(
        (sub) =>
          sub.title.toLowerCase().includes(search) ||
          sub.description?.toLowerCase().includes(search) ||
          sub.feedUrl.toLowerCase().includes(search)
      )
    }

    // 排序
    const sortBy = options.sortBy || 'createdAt'
    const sortOrder = options.sortOrder || 'desc'

    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'lastFetchedAt':
          const aTime = a.lastFetchedAt
            ? new Date(a.lastFetchedAt).getTime()
            : 0
          const bTime = b.lastFetchedAt
            ? new Date(b.lastFetchedAt).getTime()
            : 0
          comparison = aTime - bTime
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 获取订阅列表
   */
  async function fetchSubscriptions(
    options?: SubscriptionQueryOptions
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    if (options) {
      queryOptions.value = options
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return
      }

      let query = supabase
        .from('subscriptions')
        .select('*, category:categories(*)')
        .eq('userId', user.id)

      // 应用筛选条件
      if (options?.categoryId) {
        query = query.eq('categoryId', options.categoryId)
      }

      if (options?.isActive !== undefined) {
        query = query.eq('isActive', options.isActive)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      subscriptions.value = data || []
      lastUpdated.value = new Date()
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取订阅列表失败'
      error.value = message
      console.error('获取订阅列表失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取单个订阅详情
   */
  async function fetchSubscription(id: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('subscriptions')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      currentSubscription.value = data
      // 更新列表中的订阅
      const index = subscriptions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        subscriptions.value[index] = data
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取订阅详情失败'
      error.value = message
      console.error('获取订阅详情失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建新订阅
   */
  async function createSubscription(
    data: CreateSubscriptionRequest
  ): Promise<Subscription | null> {
    isLoading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return null
      }

      const { data: subscription, error: supabaseError } = await supabase
        .from('subscriptions')
        .insert({
          userId: user.id,
          feedUrl: data.feedUrl,
          title: data.title || '',
          siteUrl: data.siteUrl,
          categoryId: data.categoryId,
          isActive: true,
        })
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      subscriptions.value.push(subscription)
      return subscription
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建订阅失败'
      error.value = message
      console.error('创建订阅失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新订阅
   */
  async function updateSubscription(
    id: string,
    data: UpdateSubscriptionRequest
  ): Promise<Subscription | null> {
    isLoading.value = true
    error.value = null

    try {
      const { data: subscription, error: supabaseError } = await supabase
        .from('subscriptions')
        .update({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      const index = subscriptions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        subscriptions.value[index] = subscription
      }
      if (currentSubscription.value?.id === id) {
        currentSubscription.value = subscription
      }
      return subscription
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新订阅失败'
      error.value = message
      console.error('更新订阅失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 删除订阅
   */
  async function deleteSubscription(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const { error: supabaseError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
      if (currentSubscription.value?.id === id) {
        currentSubscription.value = null
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除订阅失败'
      error.value = message
      console.error('删除订阅失败:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新订阅（重新抓取）
   * 注意：RSS 解析需要通过 Edge Function 代理
   */
  async function refreshSubscription(id: string): Promise<boolean> {
    isRefreshing.value = true
    error.value = null

    try {
      const subscription = subscriptions.value.find((s) => s.id === id)
      if (!subscription) {
        error.value = '订阅不存在'
        return false
      }

      // 通过 Edge Function 获取 RSS 并解析
      const response = await fetch(
        `/api/proxy/rss?url=${encodeURIComponent(subscription.feedUrl)}`
      )
      if (!response.ok) {
        throw new Error('获取 RSS 失败')
      }

      const xmlText = await response.text()
      const articles = parseRSSFeed(xmlText)

      // 将新文章插入数据库
      for (const article of articles) {
        await supabase.from('articles').upsert(
          {
            subscriptionId: id,
            title: article.title,
            content: article.content,
            url: article.url,
            imageUrl: article.imageUrl,
            author: article.author,
            publishedAt: article.publishedAt,
          },
          {
            onConflict: 'subscriptionId,url',
          }
        )
      }

      // 更新订阅的最后抓取时间
      await supabase
        .from('subscriptions')
        .update({ lastFetchedAt: new Date().toISOString() })
        .eq('id', id)

      // 重新获取订阅详情
      await fetchSubscription(id)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '刷新订阅失败'
      error.value = message
      console.error('刷新订阅失败:', e)
      return false
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 刷新所有订阅
   */
  async function refreshAllSubscriptions(): Promise<boolean> {
    isRefreshing.value = true
    error.value = null

    try {
      const activeSubscriptions = subscriptions.value.filter((s) => s.isActive)
      await Promise.all(
        activeSubscriptions.map((sub) => refreshSubscription(sub.id))
      )
      await fetchSubscriptions()
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '刷新所有订阅失败'
      error.value = message
      console.error('刷新所有订阅失败:', e)
      return false
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 获取订阅统计信息
   */
  async function fetchSubscriptionStats(id: string): Promise<void> {
    try {
      // 获取文章总数
      const { count: totalCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('subscriptionId', id)

      // 获取未读数
      const { count: unreadCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('subscriptionId', id)
        .eq('isRead', false)

      // 获取收藏数
      const { count: starredCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('subscriptionId', id)
        .eq('isStarred', true)

      subscriptionStats.value.set(id, {
        subscriptionId: id,
        totalArticles: totalCount || 0,
        unreadArticles: unreadCount || 0,
        starredArticles: starredCount || 0,
        savedArticles: 0, // 需要额外查询
      })
    } catch (e) {
      console.error('获取订阅统计信息失败:', e)
    }
  }

  /**
   * 导入订阅（OPML）
   */
  async function importSubscriptions(
    file: File
  ): Promise<SubscriptionImportResult | null> {
    isLoading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return null
      }

      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'application/xml')

      const outlines = doc.querySelectorAll('outline[xmlUrl]')
      const result: SubscriptionImportResult = {
        imported: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      }

      for (const outline of outlines) {
        try {
          const feedUrl = outline.getAttribute('xmlUrl')!
          const title = outline.getAttribute('title') || outline.getAttribute('text') || ''

          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              userId: user.id,
              feedUrl,
              title,
              isActive: true,
            })

          if (insertError) {
            result.failed++
            result.errors.push({ feedUrl, error: `导入 ${title} 失败: ${insertError.message}` })
          } else {
            result.imported++
          }
        } catch (e) {
          result.failed++
          result.errors.push({
            feedUrl: '',
            error: `导入失败: ${e instanceof Error ? e.message : '未知错误'}`,
          })
        }
      }

      // 刷新订阅列表
      await fetchSubscriptions()
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : '导入订阅失败'
      error.value = message
      console.error('导入订阅失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 导出订阅（OPML）
   */
  async function exportSubscriptions(): Promise<Blob | null> {
    try {
      const opml = generateOPML(subscriptions.value)
      return new Blob([opml], { type: 'application/xml' })
    } catch (e) {
      error.value = '导出订阅失败'
      console.error('导出订阅失败:', e)
      return null
    }
  }

  /**
   * 设置当前订阅
   */
  function setCurrentSubscription(subscription: Subscription | null): void {
    currentSubscription.value = subscription
  }

  /**
   * 设置查询选项
   */
  function setQueryOptions(options: SubscriptionQueryOptions): void {
    queryOptions.value = { ...queryOptions.value, ...options }
  }

  /**
   * 重置查询选项
   */
  function resetQueryOptions(): void {
    queryOptions.value = {}
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
    subscriptions.value = []
    currentSubscription.value = null
    subscriptionStats.value = new Map()
    isLoading.value = false
    isRefreshing.value = false
    error.value = null
    lastUpdated.value = null
    queryOptions.value = {}
  }

  return {
    // State
    subscriptions,
    currentSubscription,
    subscriptionStats,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    queryOptions,

    // Getters
    activeCount,
    errorSubscriptions,
    subscriptionsByCategory,
    allTags,
    filteredSubscriptions,

    // Actions
    fetchSubscriptions,
    fetchSubscription,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    refreshSubscription,
    refreshAllSubscriptions,
    fetchSubscriptionStats,
    importSubscriptions,
    exportSubscriptions,
    setCurrentSubscription,
    setQueryOptions,
    resetQueryOptions,
    clearError,
    $reset,
  }
})

/**
 * 解析 RSS Feed
 * 注意：这是一个简化的解析器，完整实现应使用 rss-parser
 */
function parseRSSFeed(xmlText: string): Array<{
  title: string
  content: string
  url: string
  imageUrl?: string
  author?: string
  publishedAt?: string
}> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  const items = doc.querySelectorAll('item')
  const articles: Array<{
    title: string
    content: string
    url: string
    imageUrl?: string
    author?: string
    publishedAt?: string
  }> = []

  items.forEach((item) => {
    const title = item.querySelector('title')?.textContent || ''
    const content =
      item.querySelector('content\\:encoded')?.textContent ||
      item.querySelector('description')?.textContent ||
      ''
    const url = item.querySelector('link')?.textContent || ''
    const author = item.querySelector('author')?.textContent || undefined
    const publishedAt =
      item.querySelector('pubDate')?.textContent ||
      item.querySelector('published')?.textContent ||
      undefined

    // 提取图片
    const contentEncoded = item.querySelector('content\\:encoded')?.textContent || ''
    const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i)
    const imageUrl = imgMatch ? imgMatch[1] : undefined

    if (url) {
      articles.push({
        title,
        content,
        url,
        imageUrl,
        author,
        publishedAt,
      })
    }
  })

  return articles
}

/**
 * 生成 OPML 内容
 */
function generateOPML(subscriptions: Subscription[]): string {
  const outlines = subscriptions
    .map(
      (sub) =>
        `<outline type="rss" text="${escapeXml(sub.title)}" title="${escapeXml(sub.title)}" xmlUrl="${escapeXml(sub.feedUrl)}" htmlUrl="${escapeXml(sub.siteUrl || '')}" />`
    )
    .join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
    ${outlines}
  </body>
</opml>`
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
