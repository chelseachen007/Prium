/**
 * 订阅管理路由
 * 处理订阅的 CRUD、导入导出、刷新等操作
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { subscriptionService, SubscriptionError } from '../services/subscription-service.js'
import { opmlService } from '../lib/opml.js'
import { prisma } from '../db/index.js'
import { randomUUID } from 'node:crypto'

// ==================== Zod 验证 Schema ====================

const createSubscriptionSchema = z.object({
  feedUrl: z.string().trim().url('请输入有效的 URL'),
  categoryId: z.string().optional(),
  refreshInterval: z.number().int().min(5).max(1440).optional(), // 5分钟到24小时
  showImages: z.boolean().optional(),
  fullTextExtract: z.boolean().optional(),
})

const updateSubscriptionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  refreshInterval: z.number().int().min(5).max(1440).optional(),
  showImages: z.boolean().optional(),
  fullTextExtract: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const subscriptionFilterSchema = z.object({
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  hasError: z.boolean().optional(),
  search: z.string().max(100).optional(),
})

const discoverSchema = z.object({
  url: z.string().url('请输入有效的 URL'),
})

const importOpmlSchema = z.object({
  content: z.string().min(1, 'OPML 内容不能为空'),
  autoCreateCategories: z.boolean().default(true),
})

// ==================== 统一响应类型 ====================

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: string[]
  }
}

// ==================== 路由定义 ====================

const subscriptionsRouter = new Hono()

/**
 * GET /api/subscriptions
 * 获取所有订阅
 * 查询参数：categoryId, isActive, hasError, search
 */
subscriptionsRouter.get('/', async (c) => {
  // 模拟用户 ID（实际项目中从认证中间件获取）
  const userId = 'default-user'

  // 解析查询参数
  const query = c.req.query()
  const filter = subscriptionFilterSchema.parse({
    categoryId: query.categoryId,
    isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
    hasError: query.hasError === 'true' ? true : undefined,
    search: query.search,
  })

  const subscriptions = await subscriptionService.getList({
    userId,
    ...filter,
  })

  return c.json<ApiResponse>({
    success: true,
    data: subscriptions,
  })
})

/**
 * GET /api/subscriptions/:id
 * 获取单个订阅详情
 */
subscriptionsRouter.get('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()

  const subscription = await subscriptionService.getById(id, userId)

  if (!subscription) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: '订阅不存在',
        },
      },
      404
    )
  }

  return c.json<ApiResponse>({
    success: true,
    data: subscription,
  })
})

/**
 * POST /api/subscriptions
 * 添加新订阅
 */
subscriptionsRouter.post('/', async (c) => {
  const userId = 'default-user'
  const body = await c.req.json()
  const validatedData = createSubscriptionSchema.parse(body)

  try {
    const subscription = await subscriptionService.create({
      userId,
      ...validatedData,
    })

    return c.json<ApiResponse>(
      {
        success: true,
        data: subscription,
        message: '订阅添加成功',
      },
      201
    )
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode as 400 | 404 | 409
      )
    }
    console.error('Subscription creation failed:', error)
    throw error
  }
})

/**
 * PUT /api/subscriptions/:id
 * 更新订阅
 */
subscriptionsRouter.put('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()
  const body = await c.req.json()
  const validatedData = updateSubscriptionSchema.parse(body)

  try {
    const subscription = await subscriptionService.update(id, userId, validatedData)

    return c.json<ApiResponse>({
      success: true,
      data: subscription,
      message: '订阅更新成功',
    })
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode as 400 | 404 | 409
      )
    }
    throw error
  }
})

/**
 * DELETE /api/subscriptions/:id
 * 删除订阅
 */
subscriptionsRouter.delete('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()

  try {
    await subscriptionService.delete(id, userId)

    return c.json<ApiResponse>({
      success: true,
      message: '订阅已删除',
    })
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode as 400 | 404 | 409
      )
    }
    throw error
  }
})

/**
 * POST /api/subscriptions/discover
 * 从 URL 自动发现 RSS 订阅
 */
subscriptionsRouter.post('/discover', async (c) => {
  const body = await c.req.json()
  const { url } = discoverSchema.parse(body)

  try {
    const feeds = await subscriptionService.discoverFromUrl(url)

    return c.json<ApiResponse>({
      success: true,
      data: feeds,
      message: feeds.length > 0 ? `发现 ${feeds.length} 个订阅` : '未发现订阅',
    })
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode as 400 | 404 | 409
      )
    }
    throw error
  }
})

/**
 * POST /api/subscriptions/import
 * OPML 导入
 */
subscriptionsRouter.post('/import', async (c) => {
  const userId = 'default-user'
  const body = await c.req.json()
  const { content, autoCreateCategories } = importOpmlSchema.parse(body)

  try {
    // 解析 OPML
    const importResult = opmlService.import(content)

    if (!importResult.success || importResult.feeds.length === 0) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'IMPORT_FAILED',
            message: '导入失败',
            details: importResult.errors,
          },
        },
        400
      )
    }

    // 自动创建分类
    const categoryMap = new Map<string, string>()
    if (autoCreateCategories && importResult.categories.length > 0) {
      for (const categoryName of importResult.categories) {
        // 检查分类是否已存在
        let category = await prisma.category.findFirst({
          where: { userId, name: categoryName },
        })

        if (!category) {
          category = await prisma.category.create({
            data: {
              id: randomUUID(),
              userId,
              name: categoryName,
              updatedAt: new Date(),
            },
          })
        }

        categoryMap.set(categoryName, category.id)
      }
    }

    // 批量导入订阅
    const results: Array<{
      feed: { title: string; xmlUrl: string }
      success: boolean
      error?: string
    }> = []

    for (const feed of importResult.feeds) {
      try {
        // 检查是否已存在
        const existing = await prisma.subscription.findUnique({
          where: {
            userId_feedUrl: {
              userId,
              feedUrl: feed.xmlUrl,
            },
          },
        })

        if (existing) {
          results.push({
            feed: { title: feed.title, xmlUrl: feed.xmlUrl },
            success: false,
            error: '订阅已存在',
          })
          continue
        }

        // 尝试创建订阅
        await subscriptionService.create({
          userId,
          feedUrl: feed.xmlUrl,
          categoryId: feed.category ? categoryMap.get(feed.category) : undefined,
        })

        results.push({
          feed: { title: feed.title, xmlUrl: feed.xmlUrl },
          success: true,
        })
      } catch (error) {
        results.push({
          feed: { title: feed.title, xmlUrl: feed.xmlUrl },
          success: false,
          error: error instanceof Error ? error.message : '导入失败',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return c.json<ApiResponse>({
      success: true,
      data: {
        total: importResult.totalFeeds,
        imported: successCount,
        failed: results.filter((r) => !r.success).length,
        results,
      },
      message: `成功导入 ${successCount}/${importResult.totalFeeds} 个订阅`,
    })
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'IMPORT_ERROR',
          message: error instanceof Error ? error.message : '导入失败',
        },
      },
      500
    )
  }
})

/**
 * GET /api/subscriptions/export
 * OPML 导出
 */
subscriptionsRouter.get('/export', async (c) => {
  const userId = 'default-user'

  // 获取所有订阅
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  })

  // 生成 OPML
  const opmlContent = opmlService.generateFromSubscriptions(subscriptions, {
    title: 'RSS 订阅导出',
    ownerName: 'RSS Reader User',
  })

  // 设置响应头
  c.header('Content-Type', 'application/xml; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="subscriptions-${new Date().toISOString().split('T')[0]}.opml"`)

  return c.text(opmlContent)
})

/**
 * POST /api/subscriptions/:id/refresh
 * 刷新单个订阅
 */
subscriptionsRouter.post('/:id/refresh', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()

  try {
    const result = await subscriptionService.refresh(id, userId)

    return c.json<ApiResponse>({
      success: result.success,
      data: result,
      message: result.success
        ? `刷新成功，获取 ${result.newArticles} 篇新文章`
        : `刷新失败: ${result.error}`,
    })
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.statusCode as 400 | 404 | 409
      )
    }
    throw error
  }
})

/**
 * POST /api/subscriptions/refresh-all
 * 刷新所有订阅
 */
subscriptionsRouter.post('/refresh-all', async (c) => {
  const userId = 'default-user'

  const results = await subscriptionService.refreshAll(userId)

  const successCount = results.filter((r) => r.success).length
  const totalNewArticles = results.reduce((sum, r) => sum + r.newArticles, 0)

  return c.json<ApiResponse>({
    success: true,
    data: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      newArticles: totalNewArticles,
      results,
    },
    message: `刷新完成: ${successCount}/${results.length} 成功，共获取 ${totalNewArticles} 篇新文章`,
  })
})

export default subscriptionsRouter
