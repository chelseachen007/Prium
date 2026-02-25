/**
 * 过滤规则状态管理
 * @module stores/filters
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FilterRule,
  FilterScope,
  CreateFilterRuleRequest,
  UpdateFilterRuleRequest,
  ExternalServiceConfig,
  CreateExternalServiceRequest,
  ExternalServiceTestResult,
} from '@rss-reader/shared'
import { useApi, ApiError } from '@/composables/useApi'

/**
 * 过滤规则 Store
 *
 * 管理过滤规则列表、外部服务配置和 CRUD 操作
 */
export const useFilterStore = defineStore('filters', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 过滤规则列表 */
  const rules = ref<FilterRule[]>([])

  /** 外部服务列表 */
  const externalServices = ref<ExternalServiceConfig[]>([])

  /** 当前编辑的规则 */
  const currentRule = ref<FilterRule | null>(null)

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 最后更新时间 */
  const lastUpdated = ref<Date | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /** 规则总数 */
  const ruleCount = computed(() => rules.value.length)

  /** 激活的规则数量 */
  const activeRuleCount = computed(
    () => rules.value.filter((r) => r.isEnabled).length
  )

  /** 按作用域分组的规则 */
  const rulesByScope = computed(() => {
    const grouped: Record<FilterScope, FilterRule[]> = {
      global: [],
      category: [],
      subscription: [],
    }

    for (const rule of rules.value) {
      grouped[rule.scope].push(rule)
    }

    return grouped
  })

  /** 已配置的外部服务类型 */
  const configuredServiceTypes = computed(() =>
    externalServices.value.map((s) => s.serviceType)
  )

  /** 获取启用的外部服务 */
  const activeExternalServices = computed(() =>
    externalServices.value.filter((s) => s.isActive)
  )

  // ============================================================================
  // Actions - 过滤规则
  // ============================================================================

  /**
   * 获取过滤规则列表
   */
  async function fetchRules(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.get<FilterRule[]>('/filter-rules')

      if (response.success && response.data) {
        rules.value = response.data
        lastUpdated.value = new Date()
      } else {
        error.value = response.error || '获取过滤规则失败'
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取过滤规则时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取单个规则详情
   */
  async function fetchRule(id: string): Promise<FilterRule | null> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.get<FilterRule>(`/filter-rules/${id}`)

      if (response.success && response.data) {
        currentRule.value = response.data
        // 更新列表中的规则
        const index = rules.value.findIndex((r) => r.id === id)
        if (index !== -1) {
          rules.value[index] = response.data
        }
        return response.data
      } else {
        error.value = response.error || '获取规则详情失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '获取规则详情时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建过滤规则
   */
  async function createRule(data: CreateFilterRuleRequest): Promise<FilterRule | null> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.post<FilterRule>('/filter-rules', data)

      if (response.success && response.data) {
        rules.value.push(response.data)
        return response.data
      } else {
        error.value = response.error || '创建过滤规则失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '创建过滤规则时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新过滤规则
   */
  async function updateRule(id: string, data: UpdateFilterRuleRequest): Promise<FilterRule | null> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.put<FilterRule>(`/filter-rules/${id}`, data)

      if (response.success && response.data) {
        const index = rules.value.findIndex((r) => r.id === id)
        if (index !== -1) {
          rules.value[index] = response.data
        }
        if (currentRule.value?.id === id) {
          currentRule.value = response.data
        }
        return response.data
      } else {
        error.value = response.error || '更新过滤规则失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '更新过滤规则时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 删除过滤规则
   */
  async function deleteRule(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.delete(`/filter-rules/${id}`)

      if (response.success) {
        rules.value = rules.value.filter((r) => r.id !== id)
        if (currentRule.value?.id === id) {
          currentRule.value = null
        }
        return true
      } else {
        error.value = response.error || '删除过滤规则失败'
        return false
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '删除过滤规则时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切换规则启用状态
   */
  async function toggleRule(id: string): Promise<boolean> {
    const rule = rules.value.find((r) => r.id === id)
    if (!rule) return false

    try {
      const api = useApi()
      const response = await api.post<{ id: string; isActive: boolean }>(`/filter-rules/${id}/toggle`)

      if (response.success && response.data) {
        const index = rules.value.findIndex((r) => r.id === id)
        if (index !== -1) {
          rules.value[index].isEnabled = response.data.isActive
        }
        return true
      }
      return false
    } catch (e) {
      console.error('切换规则状态失败:', e)
      return false
    }
  }

  /**
   * 调整规则优先级
   */
  async function reorderRules(orders: Array<{ id: string; priority: number }>): Promise<boolean> {
    try {
      const api = useApi()
      const response = await api.post('/filter-rules/reorder', { orders })

      if (response.success) {
        // 更新本地状态
        for (const { id, priority } of orders) {
          const rule = rules.value.find((r) => r.id === id)
          if (rule) {
            rule.priority = priority
          }
        }
        return true
      }
      return false
    } catch (e) {
      console.error('调整优先级失败:', e)
      return false
    }
  }

  // ============================================================================
  // Actions - 外部服务
  // ============================================================================

  /**
   * 获取外部服务列表
   */
  async function fetchExternalServices(): Promise<void> {
    try {
      const api = useApi()
      const response = await api.get<ExternalServiceConfig[]>('/external-services')

      if (response.success && response.data) {
        externalServices.value = response.data
      }
    } catch (e) {
      console.error('获取外部服务列表失败:', e)
    }
  }

  /**
   * 创建外部服务配置
   */
  async function createExternalService(
    data: CreateExternalServiceRequest
  ): Promise<ExternalServiceConfig | null> {
    isLoading.value = true
    error.value = null

    try {
      const api = useApi()
      const response = await api.post<ExternalServiceConfig>('/external-services', data)

      if (response.success && response.data) {
        externalServices.value.push(response.data)
        return response.data
      } else {
        error.value = response.error || '创建外部服务失败'
        return null
      }
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
      } else {
        error.value = '创建外部服务时发生错误'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新外部服务配置
   */
  async function updateExternalService(
    id: string,
    data: { name?: string; isActive?: boolean }
  ): Promise<ExternalServiceConfig | null> {
    try {
      const api = useApi()
      const response = await api.put<ExternalServiceConfig>(`/external-services/${id}`, data)

      if (response.success && response.data) {
        const index = externalServices.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          externalServices.value[index] = response.data
        }
        return response.data
      }
      return null
    } catch (e) {
      console.error('更新外部服务失败:', e)
      return null
    }
  }

  /**
   * 删除外部服务配置
   */
  async function deleteExternalService(id: string): Promise<boolean> {
    try {
      const api = useApi()
      const response = await api.delete(`/external-services/${id}`)

      if (response.success) {
        externalServices.value = externalServices.value.filter((s) => s.id !== id)
        return true
      }
      return false
    } catch (e) {
      console.error('删除外部服务失败:', e)
      return false
    }
  }

  /**
   * 测试外部服务连接
   */
  async function testExternalService(id: string): Promise<ExternalServiceTestResult> {
    try {
      const api = useApi()
      const response = await api.post<ExternalServiceTestResult>(`/external-services/${id}/test`)

      if (response.success && response.data) {
        return response.data
      }
      return { success: false, error: response.error || '测试失败' }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '测试失败' }
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * 根据 ID 获取规则
   */
  function getRuleById(id: string): FilterRule | undefined {
    return rules.value.find((r) => r.id === id)
  }

  /**
   * 设置当前编辑的规则
   */
  function setCurrentRule(rule: FilterRule | null): void {
    currentRule.value = rule
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
    rules.value = []
    externalServices.value = []
    currentRule.value = null
    isLoading.value = false
    error.value = null
    lastUpdated.value = null
  }

  return {
    // State
    rules,
    externalServices,
    currentRule,
    isLoading,
    error,
    lastUpdated,

    // Getters
    ruleCount,
    activeRuleCount,
    rulesByScope,
    configuredServiceTypes,
    activeExternalServices,

    // Actions - Rules
    fetchRules,
    fetchRule,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,

    // Actions - External Services
    fetchExternalServices,
    createExternalService,
    updateExternalService,
    deleteExternalService,
    testExternalService,

    // Utility
    getRuleById,
    setCurrentRule,
    clearError,
    $reset,
  }
})
