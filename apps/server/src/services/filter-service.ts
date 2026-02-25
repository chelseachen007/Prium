/**
 * 过滤服务
 * 处理文章过滤规则的应用和匹配
 */

import { prisma } from '../db/index.js'
import type {
  FilterRule,
  FilterContext,
  FilterResult,
  MatchCondition,
} from '@rss-reader/shared'

/**
 * 规则缓存项
 */
interface CachedRules {
  rules: FilterRule[]
  cachedAt: number
}

/**
 * 过滤服务类
 * 管理过滤规则的缓存、匹配和执行
 */
class FilterService {
  /** 规则缓存（按用户ID） */
  private ruleCache: Map<string, CachedRules> = new Map()

  /** 缓存 TTL（5分钟） */
  private readonly CACHE_TTL = 5 * 60 * 1000

  /**
   * 获取用户的激活规则
   * 带缓存机制
   */
  private async getActiveRules(userId: string): Promise<FilterRule[]> {
    const now = Date.now()
    const cached = this.ruleCache.get(userId)

    // 检查缓存是否有效
    if (cached && now - cached.cachedAt < this.CACHE_TTL) {
      return cached.rules
    }

    // 从数据库获取规则
    const rules = await prisma.filterRule.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        priority: 'desc',
      },
    })

    // 转换为 FilterRule 类型
    const typedRules: FilterRule[] = rules.map((rule) => ({
      id: rule.id,
      userId: rule.userId,
      name: rule.name,
      description: rule.description || undefined,
      isEnabled: rule.isActive,
      priority: rule.priority,
      field: rule.fieldType as FilterRule['field'],
      condition: rule.matchType as FilterRule['condition'],
      pattern: rule.pattern,
      caseSensitive: rule.caseSensitive,
      action: rule.action as FilterRule['action'],
      actionValue: rule.actionValue || undefined,
      scope: this.determineScope(rule),
      subscriptionIds: rule.subscriptionIds ? JSON.parse(rule.subscriptionIds) : undefined,
      categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : undefined,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }))

    // 更新缓存
    this.ruleCache.set(userId, {
      rules: typedRules,
      cachedAt: now,
    })

    return typedRules
  }

  /**
   * 确定规则的作用域
   */
  private determineScope(rule: {
    applyToAll: boolean
    subscriptionIds: string | null
    categoryIds: string | null
  }): FilterRule['scope'] {
    if (rule.categoryIds) {
      return 'category'
    }
    if (rule.subscriptionIds) {
      return 'subscription'
    }
    return 'global'
  }

  /**
   * 清除规则缓存
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.ruleCache.delete(userId)
    } else {
      this.ruleCache.clear()
    }
  }

  /**
   * 应用过滤规则到文章
   */
  async applyFilters(
    userId: string,
    context: FilterContext
  ): Promise<FilterResult> {
    const result: FilterResult = {
      shouldSkip: false,
      isRead: false,
      isStarred: false,
      isHighlighted: false,
      tags: [],
      matchedRuleIds: [],
      externalActions: [],
      isFiltered: false,
    }

    // 获取用户规则
    const rules = await this.getActiveRules(userId)

    // 按优先级执行规则
    for (const rule of rules) {
      // 检查作用域是否匹配
      if (!this.matchesScope(rule, context)) {
        continue
      }

      // 检查条件是否匹配
      if (this.matchesCondition(rule, context)) {
        result.isFiltered = true
        result.matchedRuleIds.push(rule.id)

        // 执行动作
        this.applyAction(rule, result)

        // 更新规则统计
        await this.updateRuleStats(rule.id)

        // 如果是删除动作，直接返回
        if (rule.action === 'delete') {
          result.shouldSkip = true
          break
        }
      }
    }

    return result
  }

  /**
   * 检查规则作用域是否匹配
   */
  private matchesScope(rule: FilterRule, context: FilterContext): boolean {
    switch (rule.scope) {
      case 'global':
        return true

      case 'subscription':
        if (!rule.subscriptionIds || rule.subscriptionIds.length === 0) {
          return true
        }
        return rule.subscriptionIds.includes(context.subscriptionId)

      case 'category':
        if (!rule.categoryIds || rule.categoryIds.length === 0) {
          return true
        }
        return context.categoryId
          ? rule.categoryIds.includes(context.categoryId)
          : false

      default:
        return false
    }
  }

  /**
   * 检查条件是否匹配
   */
  private matchesCondition(rule: FilterRule, context: FilterContext): boolean {
    // 获取要匹配的字段值
    const fieldValue = this.getFieldValue(rule.field, context)
    if (fieldValue === null || fieldValue === undefined) {
      return false
    }

    const pattern = rule.pattern
    const value = rule.caseSensitive ? fieldValue : fieldValue.toLowerCase()
    const testPattern = rule.caseSensitive ? pattern : pattern.toLowerCase()

    return this.testCondition(rule.condition, value, testPattern)
  }

  /**
   * 获取字段值
   */
  private getFieldValue(
    field: FilterRule['field'],
    context: FilterContext
  ): string | null {
    switch (field) {
      case 'title':
        return context.title
      case 'content':
        return context.contentText || context.content || null
      case 'author':
        return context.author || null
      case 'url':
        return context.url
      default:
        return null
    }
  }

  /**
   * 测试条件
   */
  private testCondition(
    condition: MatchCondition,
    value: string,
    pattern: string
  ): boolean {
    switch (condition) {
      case 'contains':
        return value.includes(pattern)

      case 'notContains':
        return !value.includes(pattern)

      case 'equals':
        return value === pattern

      case 'notEquals':
        return value !== pattern

      case 'startsWith':
        return value.startsWith(pattern)

      case 'endsWith':
        return value.endsWith(pattern)

      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i')
          return regex.test(value)
        } catch {
          console.error(`Invalid regex pattern: ${pattern}`)
          return false
        }

      case 'greaterThan': {
        const num = parseFloat(pattern)
        const val = parseFloat(value)
        return !isNaN(num) && !isNaN(val) && val > num
      }

      case 'lessThan': {
        const num = parseFloat(pattern)
        const val = parseFloat(value)
        return !isNaN(num) && !isNaN(val) && val < num
      }

      default:
        return false
    }
  }

  /**
   * 应用动作到结果
   */
  private applyAction(rule: FilterRule, result: FilterResult): void {
    switch (rule.action) {
      case 'markRead':
        result.isRead = true
        break

      case 'markStarred':
        result.isStarred = true
        break

      case 'highlight':
        result.isHighlighted = true
        break

      case 'addTag':
        if (rule.actionValue) {
          // 支持多个标签（逗号分隔）
          const tags = rule.actionValue.split(',').map((t: string) => t.trim())
          for (const tag of tags) {
            if (tag && !result.tags.includes(tag)) {
              result.tags.push(tag)
            }
          }
        }
        break

      case 'pushToInstapaper':
      case 'pushToNotion':
        result.externalActions.push({
          action: rule.action,
          value: rule.actionValue,
          ruleId: rule.id,
          ruleName: rule.name,
        })
        break

      case 'delete':
        result.shouldSkip = true
        break
    }
  }

  /**
   * 更新规则统计
   */
  private async updateRuleStats(ruleId: string): Promise<void> {
    try {
      await prisma.filterRule.update({
        where: { id: ruleId },
        data: {
          matchCount: { increment: 1 },
          lastMatchedAt: new Date(),
        },
      })
    } catch (error) {
      console.error(`Failed to update rule stats for ${ruleId}:`, error)
    }
  }

  /**
   * 批量应用过滤规则
   */
  async applyFiltersBatch(
    userId: string,
    contexts: FilterContext[]
  ): Promise<Map<string, FilterResult>> {
    const results = new Map<string, FilterResult>()

    for (const context of contexts) {
      const result = await this.applyFilters(userId, context)
      results.set(context.url, result)
    }

    return results
  }

  /**
   * 获取规则统计
   */
  async getRuleStats(ruleId: string): Promise<{
    matchCount: number
    lastMatchedAt: Date | null
  }> {
    const rule = await prisma.filterRule.findUnique({
      where: { id: ruleId },
      select: { matchCount: true, lastMatchedAt: true },
    })

    return {
      matchCount: rule?.matchCount || 0,
      lastMatchedAt: rule?.lastMatchedAt || null,
    }
  }
}

// 导出单例
export const filterService = new FilterService()
