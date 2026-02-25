/**
 * 过滤规则路由
 */

import { Hono } from 'hono'
import { prisma } from '../db/index.js'
import { filterService } from '../services/filter-service.js'
import type {
  CreateFilterRuleRequest,
  UpdateFilterRuleRequest,
  FilterRule,
  FilterScope,
} from '@rss-reader/shared'

const app = new Hono()

/**
 * 获取所有过滤规则
 */
app.get('/', async (c) => {
  try {
    // TODO: 从 session 获取用户 ID
    const userId = 'default-user'

    const rules = await prisma.filterRule.findMany({
      where: { userId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // 转换为前端格式
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
      scope: determineScope(rule),
      subscriptionIds: rule.subscriptionIds ? JSON.parse(rule.subscriptionIds) : undefined,
      categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : undefined,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }))

    return c.json({
      success: true,
      data: typedRules,
    })
  } catch (error) {
    console.error('获取过滤规则失败:', error)
    return c.json({
      success: false,
      error: '获取过滤规则失败',
    }, 500)
  }
})

/**
 * 获取单个过滤规则
 */
app.get('/:id', async (c) => {
  try {
    const userId = 'default-user'
    const ruleId = c.req.param('id')

    const rule = await prisma.filterRule.findFirst({
      where: { id: ruleId, userId },
    })

    if (!rule) {
      return c.json({ success: false, error: '规则不存在' }, 404)
    }

    const typedRule: FilterRule = {
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
      scope: determineScope(rule),
      subscriptionIds: rule.subscriptionIds ? JSON.parse(rule.subscriptionIds) : undefined,
      categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : undefined,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }

    return c.json({
      success: true,
      data: typedRule,
    })
  } catch (error) {
    console.error('获取过滤规则失败:', error)
    return c.json({
      success: false,
      error: '获取过滤规则失败',
    }, 500)
  }
})

/**
 * 创建过滤规则
 */
app.post('/', async (c) => {
  try {
    const userId = 'default-user'
    const data: CreateFilterRuleRequest = await c.req.json()

    // 根据范围确定字段
    const scope = data.scope || 'global'
    const applyToAll = scope === 'global'
    const subscriptionIds = data.subscriptionIds ? JSON.stringify(data.subscriptionIds) : null
    const categoryIds = data.categoryIds ? JSON.stringify(data.categoryIds) : null

    const rule = await prisma.filterRule.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        isActive: data.isEnabled ?? true,
        priority: data.priority ?? 0,
        fieldType: data.field,
        matchType: data.condition,
        pattern: data.pattern,
        caseSensitive: data.caseSensitive ?? false,
        action: data.action,
        actionValue: data.actionValue || null,
        applyToAll,
        subscriptionIds,
        categoryIds,
      },
    })

    // 清除缓存
    filterService.clearCache(userId)

    const typedRule: FilterRule = {
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
      scope: determineScope(rule),
      subscriptionIds: rule.subscriptionIds ? JSON.parse(rule.subscriptionIds) : undefined,
      categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : undefined,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }

    return c.json({
      success: true,
      data: typedRule,
    })
  } catch (error) {
    console.error('创建过滤规则失败:', error)
    return c.json({
      success: false,
      error: '创建过滤规则失败',
    }, 500)
  }
})

/**
 * 更新过滤规则
 */
app.put('/:id', async (c) => {
  try {
    const userId = 'default-user'
    const ruleId = c.req.param('id')
    const data: UpdateFilterRuleRequest = await c.req.json()

    // 检查规则是否存在
    const existing = await prisma.filterRule.findFirst({
      where: { id: ruleId, userId },
    })

    if (!existing) {
      return c.json({ success: false, error: '规则不存在' }, 404)
    }

    // 构建更新数据
    const updateData: {
      name?: string
      description?: string | null
      isActive?: boolean
      priority?: number
      fieldType?: string
      matchType?: string
      pattern?: string
      caseSensitive?: boolean
      action?: string
      actionValue?: string | null
      applyToAll?: boolean
      subscriptionIds?: string | null
      categoryIds?: string | null
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.isEnabled !== undefined) updateData.isActive = data.isEnabled
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.field !== undefined) updateData.fieldType = data.field
    if (data.condition !== undefined) updateData.matchType = data.condition
    if (data.pattern !== undefined) updateData.pattern = data.pattern
    if (data.caseSensitive !== undefined) updateData.caseSensitive = data.caseSensitive
    if (data.action !== undefined) updateData.action = data.action
    if (data.actionValue !== undefined) updateData.actionValue = data.actionValue || null

    // 处理范围
    if (data.scope !== undefined) {
      updateData.applyToAll = data.scope === 'global'
    }
    if (data.subscriptionIds !== undefined) {
      updateData.subscriptionIds = data.subscriptionIds ? JSON.stringify(data.subscriptionIds) : null
    }
    if (data.categoryIds !== undefined) {
      updateData.categoryIds = data.categoryIds ? JSON.stringify(data.categoryIds) : null
    }

    const rule = await prisma.filterRule.update({
      where: { id: ruleId },
      data: updateData,
    })

    // 清除缓存
    filterService.clearCache(userId)

    const typedRule: FilterRule = {
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
      scope: determineScope(rule),
      subscriptionIds: rule.subscriptionIds ? JSON.parse(rule.subscriptionIds) : undefined,
      categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : undefined,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt || undefined,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }

    return c.json({
      success: true,
      data: typedRule,
    })
  } catch (error) {
    console.error('更新过滤规则失败:', error)
    return c.json({
      success: false,
      error: '更新过滤规则失败',
    }, 500)
  }
})

/**
 * 删除过滤规则
 */
app.delete('/:id', async (c) => {
  try {
    const userId = 'default-user'
    const ruleId = c.req.param('id')

    // 检查规则是否存在
    const existing = await prisma.filterRule.findFirst({
      where: { id: ruleId, userId },
    })

    if (!existing) {
      return c.json({ success: false, error: '规则不存在' }, 404)
    }

    await prisma.filterRule.delete({
      where: { id: ruleId },
    })

    // 清除缓存
    filterService.clearCache(userId)

    return c.json({
      success: true,
      data: { id: ruleId },
    })
  } catch (error) {
    console.error('删除过滤规则失败:', error)
    return c.json({
      success: false,
      error: '删除过滤规则失败',
    }, 500)
  }
})

/**
 * 调整规则优先级
 */
app.post('/reorder', async (c) => {
  try {
    const userId = 'default-user'
    const { orders } = await c.req.json() as { orders: Array<{ id: string; priority: number }> }

    // 批量更新优先级
    for (const { id, priority } of orders) {
      await prisma.filterRule.updateMany({
        where: { id, userId },
        data: { priority },
      })
    }

    // 清除缓存
    filterService.clearCache(userId)

    return c.json({
      success: true,
      data: { updated: orders.length },
    })
  } catch (error) {
    console.error('调整优先级失败:', error)
    return c.json({
      success: false,
      error: '调整优先级失败',
    }, 500)
  }
})

/**
 * 获取规则统计
 */
app.get('/stats', async (c) => {
  try {
    const userId = 'default-user'

    const rules = await prisma.filterRule.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        matchCount: true,
        lastMatchedAt: true,
        isActive: true,
      },
    })

    const stats = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      matchCount: rule.matchCount,
      lastMatchedAt: rule.lastMatchedAt,
      isActive: rule.isActive,
    }))

    return c.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('获取统计失败:', error)
    return c.json({
      success: false,
      error: '获取统计失败',
    }, 500)
  }
})

/**
 * 切换规则启用状态
 */
app.post('/:id/toggle', async (c) => {
  try {
    const userId = 'default-user'
    const ruleId = c.req.param('id')

    const existing = await prisma.filterRule.findFirst({
      where: { id: ruleId, userId },
    })

    if (!existing) {
      return c.json({ success: false, error: '规则不存在' }, 404)
    }

    const rule = await prisma.filterRule.update({
      where: { id: ruleId },
      data: { isActive: !existing.isActive },
    })

    // 清除缓存
    filterService.clearCache(userId)

    return c.json({
      success: true,
      data: { id: rule.id, isActive: rule.isActive },
    })
  } catch (error) {
    console.error('切换规则状态失败:', error)
    return c.json({
      success: false,
      error: '切换规则状态失败',
    }, 500)
  }
})

/**
 * 确定规则范围
 */
function determineScope(rule: {
  applyToAll: boolean
  subscriptionIds: string | null
  categoryIds: string | null
}): FilterScope {
  if (rule.categoryIds) {
    return 'category'
  }
  if (rule.subscriptionIds) {
    return 'subscription'
  }
  return 'global'
}

export default app
