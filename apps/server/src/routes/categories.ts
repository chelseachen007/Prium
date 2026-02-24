/**
 * 分类管理路由
 * 处理分类的 CRUD 和排序操作
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db/index.js'

// ==================== Zod 验证 Schema ====================

const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称最长50个字符'),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '请输入有效的颜色值').optional().nullable(),
  icon: z.string().max(50).optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
})

const reorderCategoriesSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1, '排序数据不能为空'),
})

// ==================== 统一响应类型 ====================

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

// ==================== 错误类 ====================

class CategoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'CategoryError'
  }
}

// ==================== 分类结果类型 ====================

interface CategoryResult {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  subscriptionCount: number
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

// ==================== 路由定义 ====================

const categoriesRouter = new Hono()

/**
 * GET /api/categories
 * 获取所有分类
 */
categoriesRouter.get('/', async (c) => {
  const userId = 'default-user'

  const categories = await prisma.category.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  // 获取每个分类的未读文章数
  const categoriesWithStats = await Promise.all(
    categories.map(async (category): Promise<CategoryResult> => {
      const subscriptions = await prisma.subscription.findMany({
        where: { categoryId: category.id },
        select: { id: true },
      })

      const subscriptionIds = subscriptions.map((s) => s.id)

      const unreadCount = subscriptionIds.length > 0
        ? await prisma.article.count({
          where: {
            subscriptionId: { in: subscriptionIds },
            isRead: false,
          },
        })
        : 0

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        sortOrder: category.sortOrder,
        subscriptionCount: category._count.subscriptions,
        unreadCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      }
    })
  )

  return c.json<ApiResponse<CategoryResult[]>>({
    success: true,
    data: categoriesWithStats,
  })
})

/**
 * GET /api/categories/:id
 * 获取单个分类详情
 */
categoriesRouter.get('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()

  const category = await prisma.category.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  })

  if (!category) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
        },
      },
      404
    )
  }

  // 获取该分类下的订阅 ID
  const subscriptions = await prisma.subscription.findMany({
    where: { categoryId: id },
    select: { id: true },
  })

  const subscriptionIds = subscriptions.map((s) => s.id)

  // 获取未读数
  const unreadCount = subscriptionIds.length > 0
    ? await prisma.article.count({
      where: {
        subscriptionId: { in: subscriptionIds },
        isRead: false,
      },
    })
    : 0

  const result: CategoryResult = {
    id: category.id,
    name: category.name,
    description: category.description,
    color: category.color,
    icon: category.icon,
    sortOrder: category.sortOrder,
    subscriptionCount: category._count.subscriptions,
    unreadCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }

  return c.json<ApiResponse<CategoryResult>>({
    success: true,
    data: result,
  })
})

/**
 * POST /api/categories
 * 创建分类
 */
categoriesRouter.post('/', async (c) => {
  const userId = 'default-user'
  const body = await c.req.json()
  const validatedData = createCategorySchema.parse(body)

  try {
    // 检查名称是否重复
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: validatedData.name,
      },
    })

    if (existing) {
      throw new CategoryError('分类名称已存在', 'CATEGORY_NAME_EXISTS', 409)
    }

    // 获取当前最大排序值
    const maxSortOrder = await prisma.category.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    })

    const sortOrder = (maxSortOrder._max.sortOrder || 0) + 1

    const category = await prisma.category.create({
      data: {
        userId,
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        icon: validatedData.icon,
        sortOrder,
      },
    })

    const result: CategoryResult = {
      ...category,
      subscriptionCount: 0,
      unreadCount: 0,
    }

    return c.json<ApiResponse<CategoryResult>>(
      {
        success: true,
        data: result,
        message: '分类创建成功',
      },
      201
    )
  } catch (error) {
    if (error instanceof CategoryError) {
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
 * PUT /api/categories/:id
 * 更新分类
 */
categoriesRouter.put('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()
  const body = await c.req.json()
  const validatedData = updateCategorySchema.parse(body)

  try {
    // 检查分类是否存在
    const existing = await prisma.category.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new CategoryError('分类不存在', 'CATEGORY_NOT_FOUND', 404)
    }

    // 如果更新名称，检查是否重复
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          userId,
          name: validatedData.name,
          id: { not: id },
        },
      })

      if (duplicate) {
        throw new CategoryError('分类名称已存在', 'CATEGORY_NAME_EXISTS', 409)
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    // 获取订阅数量
    const subscriptionCount = await prisma.subscriptions.count({
      where: { categoryId: id },
    })

    const result: CategoryResult = {
      ...category,
      subscriptionCount,
      unreadCount: 0, // 更新时不需要计算未读数
    }

    return c.json<ApiResponse<CategoryResult>>({
      success: true,
      data: result,
      message: '分类更新成功',
    })
  } catch (error) {
    if (error instanceof CategoryError) {
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
 * DELETE /api/categories/:id
 * 删除分类
 */
categoriesRouter.delete('/:id', async (c) => {
  const userId = 'default-user'
  const { id } = c.req.param()

  try {
    // 检查分类是否存在
    const existing = await prisma.category.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    })

    if (!existing) {
      throw new CategoryError('分类不存在', 'CATEGORY_NOT_FOUND', 404)
    }

    // 将该分类下的订阅的分类设为 null
    await prisma.subscription.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    })

    // 删除分类
    await prisma.category.delete({
      where: { id },
    })

    return c.json<ApiResponse<{ affectedSubscriptions: number }>>({
      success: true,
      message: '分类已删除',
      data: {
        affectedSubscriptions: existing._count.subscriptions,
      },
    })
  } catch (error) {
    if (error instanceof CategoryError) {
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
 * PUT /api/categories/reorder
 * 重新排序分类
 */
categoriesRouter.put('/reorder', async (c) => {
  const userId = 'default-user'
  const body = await c.req.json()
  const { orders } = reorderCategoriesSchema.parse(body)

  try {
    // 验证所有分类都属于该用户
    const categoryIds = orders.map((o) => o.id)
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        userId,
      },
      select: { id: true },
    })

    const existingIds = new Set(categories.map((cat) => cat.id))
    const invalidIds = categoryIds.filter((catId) => !existingIds.has(catId))

    if (invalidIds.length > 0) {
      throw new CategoryError(
        `部分分类不存在: ${invalidIds.join(', ')}`,
        'CATEGORIES_NOT_FOUND',
        404
      )
    }

    // 批量更新排序
    await prisma.$transaction(
      orders.map((order) =>
        prisma.category.update({
          where: { id: order.id },
          data: { sortOrder: order.sortOrder },
        })
      )
    )

    return c.json<ApiResponse>({
      success: true,
      message: '分类排序已更新',
    })
  } catch (error) {
    if (error instanceof CategoryError) {
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

export default categoriesRouter
