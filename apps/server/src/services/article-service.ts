/**
 * 文章服务
 * 处理文章的查询、标记已读、星标等操作
 */

import { prisma } from '../db/index.js'
import pkg from '@prisma/client'
const { Prisma } = pkg

// ==================== 类型定义 ====================

export interface ArticleFilter {
  userId: string
  subscriptionId?: string
  categoryId?: string
  isRead?: boolean
  isStarred?: boolean
  search?: string
  startDate?: Date
  endDate?: Date
  hasAiSummary?: boolean
}

export interface ArticleSort {
  field: 'publishedAt' | 'createdAt' | 'title' | 'readProgress'
  order: 'asc' | 'desc'
}

export interface Pagination {
  page: number
  pageSize: number
}

export interface ArticleListResult {
  articles: ArticleResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface ArticleResult {
  id: string
  subscriptionId: string
  title: string
  content: string | null
  contentText: string | null
  summary: string | null
  url: string
  imageUrl: string | null
  author: string | null
  publishedAt: Date | null
  fetchedAt: Date
  isRead: boolean
  isStarred: boolean
  readProgress: number
  readAt: Date | null
  isAiProcessed: boolean
  aiTags: string | null
  sentiment: string | null
  createdAt: Date
  updatedAt: Date
  subscription: {
    id: string
    title: string
    imageUrl: string | null
    siteUrl: string | null
    category?: {
      id: string
      name: string
      color: string | null
    } | null
  }
}

export interface BatchUpdateData {
  isRead?: boolean
  isStarred?: boolean
}

export interface BatchUpdateFilter {
  userId: string
  articleIds?: string[]
  subscriptionId?: string
  categoryId?: string
  isRead?: boolean
  isStarred?: boolean
  olderThan?: Date
}

export interface ArticleStats {
  total: number
  read: number
  unread: number
  starred: number
  today: number
  thisWeek: number
  thisMonth: number
}

export class ArticleError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'ArticleError'
  }
}

// ==================== 文章服务类 ====================

class ArticleService {
  /**
   * 获取文章列表（分页）
   */
  async getList(
    filter: ArticleFilter,
    sort: ArticleSort = { field: 'publishedAt', order: 'desc' },
    pagination: Pagination = { page: 1, pageSize: 20 }
  ): Promise<ArticleListResult> {
    const { page, pageSize } = pagination
    const skip = (page - 1) * pageSize

    // 构建查询条件
    const whereClause = await this.buildWhereClause(filter)

    // 获取总数
    const total = await prisma.article.count({ where: whereClause })

    // 获取文章列表
    const articles = await prisma.article.findMany({
      where: whereClause,
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        [sort.field]: sort.order,
      },
      skip,
      take: pageSize,
    })

    const totalPages = Math.ceil(total / pageSize)

    return {
      articles: articles.map((article) => this.toResult(article)),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    }
  }

  /**
   * 获取单篇文章
   */
  async getById(articleId: string, userId: string): Promise<ArticleResult | null> {
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        subscription: {
          userId,
        },
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            userId: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!article) {
      return null
    }

    return this.toResult(article)
  }

  /**
   * 标记文章已读/未读
   */
  async markRead(
    articleId: string,
    userId: string,
    isRead: boolean
  ): Promise<ArticleResult> {
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        subscription: {
          userId,
        },
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!article) {
      throw new ArticleError('文章不存在', 'ARTICLE_NOT_FOUND', 404)
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
        updatedAt: new Date(),
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    return this.toResult(updated)
  }

  /**
   * 星标/取消星标文章
   */
  async toggleStar(
    articleId: string,
    userId: string,
    isStarred: boolean
  ): Promise<ArticleResult> {
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        subscription: {
          userId,
        },
      },
    })

    if (!article) {
      throw new ArticleError('文章不存在', 'ARTICLE_NOT_FOUND', 404)
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        isStarred,
        updatedAt: new Date(),
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    return this.toResult(updated)
  }

  /**
   * 更新阅读进度
   */
  async updateProgress(
    articleId: string,
    userId: string,
    progress: number
  ): Promise<ArticleResult> {
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        subscription: {
          userId,
        },
      },
    })

    if (!article) {
      throw new ArticleError('文章不存在', 'ARTICLE_NOT_FOUND', 404)
    }

    // 确保进度在 0-1 之间
    const clampedProgress = Math.max(0, Math.min(1, progress))

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        readProgress: clampedProgress,
        // 如果进度超过 90%，自动标记为已读
        ...(clampedProgress >= 0.9 && !article.isRead
          ? { isRead: true, readAt: new Date() }
          : {}),
        updatedAt: new Date(),
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    return this.toResult(updated)
  }

  /**
   * 批量标记已读/未读
   */
  async batchUpdate(
    filter: BatchUpdateFilter,
    data: BatchUpdateData
  ): Promise<{ count: number }> {
    const whereClause = await this.buildBatchWhereClause(filter)

    const result = await prisma.article.updateMany({
      where: whereClause,
      data: {
        ...data,
        ...(data.isRead !== undefined ? { readAt: data.isRead ? new Date() : null } : {}),
        updatedAt: new Date(),
      },
    })

    return { count: result.count }
  }

  /**
   * 批量删除文章
   */
  async batchDelete(
    userId: string,
    articleIds: string[]
  ): Promise<{ count: number }> {
    // 只能删除属于用户的文章
    const result = await prisma.article.deleteMany({
      where: {
        id: { in: articleIds },
        subscription: {
          userId,
        },
      },
    })

    return { count: result.count }
  }

  /**
   * 获取上一篇文章
   */
  async getPrevious(
    articleId: string,
    userId: string,
    filter?: ArticleFilter
  ): Promise<ArticleResult | null> {
    const currentArticle = await this.getById(articleId, userId)
    if (!currentArticle) return null

    const whereClause = await this.buildWhereClause({
      ...filter,
      userId,
    })

    const article = await prisma.article.findFirst({
      where: {
        ...whereClause,
        publishedAt: {
          lt: currentArticle.publishedAt || new Date(),
        },
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    })

    return article ? this.toResult(article) : null
  }

  /**
   * 获取下一篇文章
   */
  async getNext(
    articleId: string,
    userId: string,
    filter?: ArticleFilter
  ): Promise<ArticleResult | null> {
    const currentArticle = await this.getById(articleId, userId)
    if (!currentArticle) return null

    const whereClause = await this.buildWhereClause({
      ...filter,
      userId,
    })

    const article = await prisma.article.findFirst({
      where: {
        ...whereClause,
        publishedAt: {
          gt: currentArticle.publishedAt || new Date(),
        },
      },
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        publishedAt: 'asc',
      },
    })

    return article ? this.toResult(article) : null
  }

  /**
   * 获取文章统计
   */
  async getStats(userId: string): Promise<ArticleStats> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      total,
      read,
      unread,
      starred,
      today,
      thisWeek,
      thisMonth,
    ] = await Promise.all([
      // 总数
      prisma.article.count({
        where: { subscription: { userId } },
      }),
      // 已读
      prisma.article.count({
        where: { subscription: { userId }, isRead: true },
      }),
      // 未读
      prisma.article.count({
        where: { subscription: { userId }, isRead: false },
      }),
      // 星标
      prisma.article.count({
        where: { subscription: { userId }, isStarred: true },
      }),
      // 今日
      prisma.article.count({
        where: {
          subscription: { userId },
          createdAt: { gte: todayStart },
        },
      }),
      // 本周
      prisma.article.count({
        where: {
          subscription: { userId },
          createdAt: { gte: weekStart },
        },
      }),
      // 本月
      prisma.article.count({
        where: {
          subscription: { userId },
          createdAt: { gte: monthStart },
        },
      }),
    ])

    return {
      total,
      read,
      unread,
      starred,
      today,
      thisWeek,
      thisMonth,
    }
  }

  /**
   * 搜索文章
   */
  async search(
    userId: string,
    query: string,
    pagination: Pagination = { page: 1, pageSize: 20 }
  ): Promise<ArticleListResult> {
    const { page, pageSize } = pagination
    const skip = (page - 1) * pageSize

    // SQLite 的全文搜索限制，使用 contains
    // 注意：这在大数据量下性能可能不佳
    const whereClause: Prisma.ArticleWhereInput = {
      subscription: { userId },
      OR: [
        { title: { contains: query } },
        { contentText: { contains: query } },
        { author: { contains: query } },
      ],
    }

    const total = await prisma.article.count({ where: whereClause })

    const articles = await prisma.article.findMany({
      where: whereClause,
      include: {
        subscription: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            siteUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      skip,
      take: pageSize,
    })

    const totalPages = Math.ceil(total / pageSize)

    return {
      articles: articles.map((article) => this.toResult(article)),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    }
  }

  /**
   * 构建查询条件
   */
  private async buildWhereClause(
    filter: ArticleFilter
  ): Promise<Prisma.ArticleWhereInput> {
    const {
      userId,
      subscriptionId,
      categoryId,
      isRead,
      isStarred,
      search,
      startDate,
      endDate,
      hasAiSummary,
    } = filter

    const whereClause: Prisma.ArticleWhereInput = {
      subscription: {
        userId,
        ...(categoryId ? { categoryId } : {}),
      },
    }

    if (subscriptionId) {
      whereClause.subscriptionId = subscriptionId
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead
    }

    if (isStarred !== undefined) {
      whereClause.isStarred = isStarred
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { contentText: { contains: search } },
      ]
    }

    if (startDate || endDate) {
      whereClause.publishedAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    }

    if (hasAiSummary !== undefined) {
      whereClause.summary = hasAiSummary ? { not: null } : null
    }

    return whereClause
  }

  /**
   * 构建批量操作查询条件
   */
  private async buildBatchWhereClause(
    filter: BatchUpdateFilter
  ): Promise<Prisma.ArticleWhereInput> {
    const {
      userId,
      articleIds,
      subscriptionId,
      categoryId,
      isRead,
      isStarred,
      olderThan,
    } = filter

    const whereClause: Prisma.ArticleWhereInput = {
      subscription: {
        userId,
        ...(categoryId ? { categoryId } : {}),
      },
    }

    if (articleIds && articleIds.length > 0) {
      whereClause.id = { in: articleIds }
    }

    if (subscriptionId) {
      whereClause.subscriptionId = subscriptionId
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead
    }

    if (isStarred !== undefined) {
      whereClause.isStarred = isStarred
    }

    if (olderThan) {
      whereClause.publishedAt = { lt: olderThan }
    }

    return whereClause
  }

  /**
   * 转换为结果格式
   */
  private toResult(
    article: {
      id: string
      subscriptionId: string
      title: string
      content: string | null
      contentText: string | null
      summary: string | null
      url: string
      imageUrl: string | null
      author: string | null
      publishedAt: Date | null
      fetchedAt: Date
      isRead: boolean
      isStarred: boolean
      readProgress: number
      readAt: Date | null
      isAiProcessed: boolean
      aiTags: string | null
      sentiment: string | null
      createdAt: Date
      updatedAt: Date
      subscription: {
        id: string
        title: string
        imageUrl: string | null
        siteUrl: string | null
        category?: {
          id: string
          name: string
          color: string | null
        } | null
      }
    }
  ): ArticleResult {
    return {
      id: article.id,
      subscriptionId: article.subscriptionId,
      title: article.title,
      content: article.content,
      contentText: article.contentText,
      summary: article.summary,
      url: article.url,
      imageUrl: article.imageUrl,
      author: article.author,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      isRead: article.isRead,
      isStarred: article.isStarred,
      readProgress: article.readProgress,
      readAt: article.readAt,
      isAiProcessed: article.isAiProcessed,
      aiTags: article.aiTags,
      sentiment: article.sentiment,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      subscription: {
        id: article.subscription.id,
        title: article.subscription.title,
        imageUrl: article.subscription.imageUrl,
        siteUrl: article.subscription.siteUrl,
        category: article.subscription.category,
      },
    }
  }
}

// 导出单例
export const articleService = new ArticleService()
