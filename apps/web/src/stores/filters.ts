/**
 * 过滤规则状态管理
 * @module stores/filters
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type {
  FilterRule,
  FilterScope,
  CreateFilterRuleRequest,
  UpdateFilterRuleRequest,
  ExternalServiceConfig,
  CreateExternalServiceRequest,
  ExternalServiceTestResult,
} from '@/types'

/**
 * 过滤规则 Store
 *
 * 使用 Supabase 管理过滤规则列表、外部服务配置和 CRUD 操作
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return
      }

      const { data, error: supabaseError } = await supabase
        .from('filter_rules')
        .select('*')
        .eq('userId', user.id)
        .order('priority', { ascending: true })

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      rules.value = data || []
      lastUpdated.value = new Date()
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取过滤规则失败'
      error.value = message
      console.error('获取过滤规则失败:', e)
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
      const { data, error: supabaseError } = await supabase
        .from('filter_rules')
        .select('*')
        .eq('id', id)
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      currentRule.value = data
      // 更新列表中的规则
      const index = rules.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        rules.value[index] = data
      }
      return data
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取规则详情失败'
      error.value = message
      console.error('获取规则详情失败:', e)
      return null
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return null
      }

      // 获取当前最大优先级
      const maxPriority = Math.max(0, ...rules.value.map((r) => r.priority))

      const { data: rule, error: supabaseError } = await supabase
        .from('filter_rules')
        .insert({
          userId: user.id,
          name: data.name,
          description: data.description,
          isEnabled: data.isEnabled ?? true,
          priority: data.priority ?? maxPriority + 1,
          field: data.field,
          condition: data.condition,
          pattern: data.pattern,
          caseSensitive: data.caseSensitive ?? false,
          action: data.action,
          actionValue: data.actionValue,
          scope: data.scope ?? 'global',
          subscriptionIds: data.subscriptionIds,
          categoryIds: data.categoryIds,
          matchCount: 0,
        })
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      rules.value.push(rule)
      return rule
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建过滤规则失败'
      error.value = message
      console.error('创建过滤规则失败:', e)
      return null
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
      const { data: rule, error: supabaseError } = await supabase
        .from('filter_rules')
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

      const index = rules.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        rules.value[index] = rule
      }
      if (currentRule.value?.id === id) {
        currentRule.value = rule
      }
      return rule
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新过滤规则失败'
      error.value = message
      console.error('更新过滤规则失败:', e)
      return null
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
      const { error: supabaseError } = await supabase
        .from('filter_rules')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      rules.value = rules.value.filter((r) => r.id !== id)
      if (currentRule.value?.id === id) {
        currentRule.value = null
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除过滤规则失败'
      error.value = message
      console.error('删除过滤规则失败:', e)
      return false
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
      const { error: supabaseError } = await supabase
        .from('filter_rules')
        .update({ isEnabled: !rule.isEnabled })
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      const index = rules.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        rules.value[index].isEnabled = !rules.value[index].isEnabled
      }
      return true
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
      // 批量更新
      for (const { id, priority } of orders) {
        const { error: supabaseError } = await supabase
          .from('filter_rules')
          .update({ priority })
          .eq('id', id)

        if (supabaseError) {
          throw new Error(supabaseError.message)
        }
      }

      // 更新本地状态
      for (const { id, priority } of orders) {
        const rule = rules.value.find((r) => r.id === id)
        if (rule) {
          rule.priority = priority
        }
      }
      return true
    } catch (e) {
      console.error('调整优先级失败:', e)
      return false
    }
  }

  /**
   * 对文章应用过滤规则
   * 在客户端执行过滤逻辑
   */
  function applyRules(article: {
    title: string
    content?: string
    author?: string
    url: string
    subscriptionId: string
    categoryId?: string
  }): Array<{ rule: FilterRule; action: FilterRule['action'] }> {
    const matchedRules: Array<{ rule: FilterRule; action: FilterRule['action'] }> = []

    for (const rule of rules.value) {
      if (!rule.isEnabled) continue

      // 检查作用域
      if (rule.scope === 'subscription' && rule.subscriptionIds?.length) {
        if (!rule.subscriptionIds.includes(article.subscriptionId)) continue
      }
      if (rule.scope === 'category' && rule.categoryIds?.length) {
        if (!article.categoryId || !rule.categoryIds.includes(article.categoryId)) continue
      }

      // 获取要匹配的字段值
      let fieldValue = ''
      switch (rule.field) {
        case 'title':
          fieldValue = article.title
          break
        case 'content':
          fieldValue = article.content || ''
          break
        case 'author':
          fieldValue = article.author || ''
          break
        case 'url':
          fieldValue = article.url
          break
      }

      // 执行匹配
      let isMatch = false
      const pattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase()
      const value = rule.caseSensitive ? fieldValue : fieldValue.toLowerCase()

      switch (rule.condition) {
        case 'contains':
          isMatch = value.includes(pattern)
          break
        case 'notContains':
          isMatch = !value.includes(pattern)
          break
        case 'equals':
          isMatch = value === pattern
          break
        case 'notEquals':
          isMatch = value !== pattern
          break
        case 'startsWith':
          isMatch = value.startsWith(pattern)
          break
        case 'endsWith':
          isMatch = value.endsWith(pattern)
          break
        case 'regex':
          try {
            const regex = new RegExp(rule.pattern, rule.caseSensitive ? '' : 'i')
            isMatch = regex.test(fieldValue)
          } catch {
            isMatch = false
          }
          break
      }

      if (isMatch) {
        matchedRules.push({ rule, action: rule.action })

        // 更新匹配计数
        incrementMatchCount(rule.id)
      }
    }

    return matchedRules
  }

  /**
   * 增加规则匹配计数
   */
  async function incrementMatchCount(ruleId: string): Promise<void> {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (!rule) return

    try {
      await supabase
        .from('filter_rules')
        .update({
          matchCount: rule.matchCount + 1,
          lastMatchedAt: new Date().toISOString(),
        })
        .eq('id', ruleId)

      rule.matchCount++
      rule.lastMatchedAt = new Date().toISOString()
    } catch (e) {
      console.error('更新匹配计数失败:', e)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: supabaseError } = await supabase
        .from('external_services')
        .select('*')
        .eq('userId', user.id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      externalServices.value = data || []
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return null
      }

      const { data: service, error: supabaseError } = await supabase
        .from('external_services')
        .insert({
          userId: user.id,
          serviceType: data.serviceType,
          name: data.name,
          isActive: true,
          usedCount: 0,
        })
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      externalServices.value.push(service)
      return service
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建外部服务失败'
      error.value = message
      console.error('创建外部服务失败:', e)
      return null
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
      const { data: service, error: supabaseError } = await supabase
        .from('external_services')
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

      const index = externalServices.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        externalServices.value[index] = service
      }
      return service
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
      const { error: supabaseError } = await supabase
        .from('external_services')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      externalServices.value = externalServices.value.filter((s) => s.id !== id)
      return true
    } catch (e) {
      console.error('删除外部服务失败:', e)
      return false
    }
  }

  /**
   * 测试外部服务连接
   * 注意：实际测试需要在 Edge Function 中执行
   */
  async function testExternalService(id: string): Promise<ExternalServiceTestResult> {
    try {
      const response = await fetch(`/api/external-services/${id}/test`, {
        method: 'POST',
      })

      if (!response.ok) {
        return { success: false, error: '测试失败' }
      }

      const result = await response.json()
      return result
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
    applyRules,

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
