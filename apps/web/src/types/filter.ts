/**
 * 过滤规则相关类型定义
 * @module types/filter
 */

/**
 * 过滤动作类型
 */
export type FilterAction =
  | 'markRead'
  | 'markStarred'
  | 'addTag'
  | 'highlight'
  | 'pushToInstapaper'
  | 'pushToNotion'
  | 'delete'

/**
 * 过滤范围类型
 */
export type FilterScope = 'global' | 'category' | 'subscription'

/**
 * 过滤字段类型
 */
export type FilterField = 'title' | 'content' | 'author' | 'url'

/**
 * 匹配条件类型
 */
export type MatchCondition =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan'

/**
 * 过滤规则接口
 */
export interface FilterRule {
  id: string
  userId: string
  name: string
  description?: string
  isEnabled: boolean
  priority: number
  field: FilterField
  condition: MatchCondition
  pattern: string
  caseSensitive: boolean
  action: FilterAction
  actionValue?: string
  scope: FilterScope
  subscriptionIds?: string[]
  categoryIds?: string[]
  matchCount: number
  lastMatchedAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * 创建过滤规则请求接口
 */
export interface CreateFilterRuleRequest {
  name: string
  description?: string
  isEnabled?: boolean
  priority?: number
  field: FilterField
  condition: MatchCondition
  pattern: string
  caseSensitive?: boolean
  action: FilterAction
  actionValue?: string
  scope?: FilterScope
  subscriptionIds?: string[]
  categoryIds?: string[]
}

/**
 * 更新过滤规则请求接口
 */
export interface UpdateFilterRuleRequest {
  name?: string
  description?: string
  isEnabled?: boolean
  priority?: number
  field?: FilterField
  condition?: MatchCondition
  pattern?: string
  caseSensitive?: boolean
  action?: FilterAction
  actionValue?: string
  scope?: FilterScope
  subscriptionIds?: string[]
  categoryIds?: string[]
}

/**
 * 外部服务类型
 */
export type ExternalServiceType = 'instapaper' | 'notion' | 'pocket'

/**
 * 外部服务配置接口
 */
export interface ExternalServiceConfig {
  id: string
  userId: string
  serviceType: ExternalServiceType
  name: string
  isActive: boolean
  lastUsedAt?: Date | string
  usedCount: number
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * 创建外部服务请求接口
 */
export interface CreateExternalServiceRequest {
  serviceType: ExternalServiceType
  name: string
  config: Record<string, unknown>
}

/**
 * 外部服务测试结果接口
 */
export interface ExternalServiceTestResult {
  success: boolean
  error?: string
}

/**
 * 过滤规则统计接口
 */
export interface FilterRuleStats {
  ruleId: string
  matchCount: number
  lastMatchedAt?: Date | string
}
