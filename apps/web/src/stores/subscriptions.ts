/**
 * 订阅状态管理
 * @module stores/subscriptions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryOptions,
  SubscriptionStats,
  SubscriptionImportResult,
} from '@rss-reader/shared'
import { useApi, ApiError } from '@/composables/useApi'

/**
 * 订阅 Store
 *
 * 管理订阅列表、当前订阅、加载状态和 CRUD 操作
 *
 * @example
 * ```typescript
 * const subscriptionStore = useSubscriptionStore()
 *
 * // 获取订阅列表
 * await subscriptionStore.fetchSubscriptions()
 *
 * // 创建新订阅
 * await subscriptionStore.createSubscription({ feedUrl: 'https://...' })
 * ```
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
    const grouped = new Map<string, Subscription[]>()
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
      const api = useApi()
      const response = await api.get<Subscription[]>('/subscriptions')

      if (response.success && response.data) {
        subscriptions.value = response.data
        lastUpdated.value = new Date()
      } else {
        error.value = response.error || '获取订阅列表失败'
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取订阅列表时发生错误'
      }
      throw e
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
      const api = useApi()
      const response = await api.get<Subscription>(`/subscriptions/${id}`)

      if (response.success && response.data) {
        currentSubscription.value = response.data
        // 更新列表中的订阅
        const index = subscriptions.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          subscriptions.value[index] = response.data
        }
      } else {
        error.value = response.error || '获取订阅详情失败'
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取订阅详情时发生错误'
      }
      throw e
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
      const api = useApi()
      const response = await api.post<Subscription>('/subscriptions', data)

      if (response.success && response.data) {
        subscriptions.value.push(response.data)
        return response.data
      } else {
        error.value = response.error || '创建订阅失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '创建订阅时发生错误'
      }
      throw e
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
      const api = useApi()
      const response = await api.put<Subscription>(
        `/subscriptions/${id}`,
        data
      )

      if (response.success && response.data) {
        const index = subscriptions.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          subscriptions.value[index] = response.data
        }
        if (currentSubscription.value?.id === id) {
          currentSubscription.value = response.data
        }
        return response.data
      } else {
        error.value = response.error || '更新订阅失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '更新订阅时发生错误'
      }
      throw e
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
      const api = useApi()
      const response = await api.delete(`/subscriptions/${id}`)

      if (response.success) {
        subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
        if (currentSubscription.value?.id === id) {
          currentSubscription.value = null
        }
        return true
      } else {
        error.value = response.error || '删除订阅失败'
        return false
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '删除订阅时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 刷新订阅（重新抓取）
   */
  async function refreshSubscription(id: string): Promise<boolean> {
    isRefreshing.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.post<Subscription>(
        `/subscriptions/${id}/refresh`
      )

      if (response.success && response.data) {
        const index = subscriptions.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          subscriptions.value[index] = response.data
        }
        return true
      } else {
        error.value = response.error || '刷新订阅失败'
        return false
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '刷新订阅时发生错误'
      }
      throw e
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
      const api = useApi()
      const response = await api.post('/subscriptions/refresh-all')

      if (response.success) {
        // 重新获取订阅列表
        await fetchSubscriptions()
        return true
      } else {
        error.value = response.error || '刷新所有订阅失败'
        return false
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '刷新所有订阅时发生错误'
      }
      throw e
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 获取订阅统计信息
   */
  async function fetchSubscriptionStats(id: string): Promise<void> {
    try {
      const api = useApi()
      const response = await api.get<SubscriptionStats>(
        `/subscriptions/${id}/stats`
      )

      if (response.success && response.data) {
        subscriptionStats.value.set(id, response.data)
      }
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
      const formData = new FormData()
      formData.append('file', file)

      const api = useApi()
      const response = await api.post<SubscriptionImportResult>(
        '/subscriptions/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.success && response.data) {
        // 刷新订阅列表
        await fetchSubscriptions()
        return response.data
      } else {
        error.value = response.error || '导入订阅失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '导入订阅时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 导出订阅（OPML）
   */
  async function exportSubscriptions(): Promise<Blob | null> {
    try {
      const api = useApi()
      const response = await api.client.get('/subscriptions/export', {
        responseType: 'blob',
      })
      return response.data
    } catch (e) {
      error.value = '导出订阅失败'
      throw e
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
