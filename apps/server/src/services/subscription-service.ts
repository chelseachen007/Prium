/**
 * 订阅服务
 * 处理订阅的 CRUD 操作
 */

import { prisma } from '../db/index.js'
import {
  rssParser,
  RSSError,
  type ParsedFeed,
} from '../lib/rss.js'
import {
  feedDiscovery,
  type DiscoveredFeed,
} from '../lib/feed-discovery.js'

// ==================== 类型定义 ====================

export interface CreateSubscriptionData {
  userId: string
  feedUrl: string
  categoryId?: string
  refreshInterval?: number
  showImages?: boolean
  fullTextExtract?: boolean
}

export interface UpdateSubscriptionData {
  title?: string
  categoryId?: string | null
  refreshInterval?: number
  showImages?: boolean
  fullTextExtract?: boolean
  isActive?: boolean
}

export interface SubscriptionFilter {
  userId: string
  categoryId?: string
  isActive?: boolean
  hasError?: boolean
  search?: string
}

export interface SubscriptionResult {
  id: string
  userId: string
  categoryId: string | null
  title: string
  description: string | null
  feedUrl: string
  siteUrl: string | null
  imageUrl: string | null
  isActive: boolean
  lastFetched: Date | null
  fetchError: string | null
  errorCode: string | null
  refreshInterval: number | null
  showImages: boolean
  fullTextExtract: boolean
  createdAt: Date
  updatedAt: Date
  category?: {
    id: string
    name: string
    color: string | null
  } | null
  _count?: {
    articles: number
  }
}

export interface SubscriptionWithStats extends SubscriptionResult {
  articleCount: number
  unreadCount: number
}

export interface RefreshResult {
  subscriptionId: string
  success: boolean
  newArticles: number
  error?: string
}

export interface HealthCheckResult {
  subscriptionId: string
  isHealthy: boolean
  statusCode?: number
  error?: string
  lastChecked: Date
}

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

// ==================== 订阅服务类 ====================

class SubscriptionService {
  /**
   * 添加订阅
   * 先验证 feed 有效性，再创建订阅
   */
  async create(data: CreateSubscriptionData): Promise<SubscriptionResult> {
    const { userId, feedUrl, categoryId, ...options } = data

    // 检查是否已存在
    const existing = await prisma.subscription.findUnique({
      where: {
        userId_feedUrl: {
          userId,
          feedUrl,
        },
      },
    })

    if (existing) {
      throw new SubscriptionError(
        '该订阅已存在',
        'SUBSCRIPTION_EXISTS',
        409
      )
    }

    // 验证分类是否存在（如果指定了分类）
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId,
        },
      })

      if (!category) {
        throw new SubscriptionError(
          '分类不存在',
          'CATEGORY_NOT_FOUND',
          404
        )
      }
    }

    // 获取并解析 feed
    let parsedFeed: ParsedFeed
    try {
      const result = await rssParser.parse(feedUrl)
      if (result.notModified || !result.feed) {
        throw new SubscriptionError(
          '无法获取 Feed 内容',
          'FEED_NOT_ACCESSIBLE'
        )
      }
      parsedFeed = result.feed
    } catch (error) {
      if (error instanceof RSSError) {
        throw new SubscriptionError(
          `Feed 验证失败: ${error.message}`,
          'FEED_VALIDATION_FAILED'
        )
      }
      if (error instanceof SubscriptionError) {
        throw error
      }
      throw new SubscriptionError(
        'Feed 解析失败',
        'FEED_PARSE_ERROR'
      )
    }

    // 创建订阅
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        categoryId: categoryId || null,
        title: parsedFeed.title,
        description: parsedFeed.description,
        feedUrl: parsedFeed.feedUrl,
        siteUrl: parsedFeed.siteUrl,
        imageUrl: parsedFeed.imageUrl,
        isActive: true,
        lastFetched: new Date(),
        refreshInterval: options.refreshInterval || null,
        showImages: options.showImages ?? true,
        fullTextExtract: options.fullTextExtract ?? false,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    // 创建文章
    if (parsedFeed.articles.length > 0) {
      await this.createArticles(subscription.id, parsedFeed.articles)
    }

    return this.toResult(subscription)
  }

  /**
   * 更新订阅
   */
  async update(
    subscriptionId: string,
    userId: string,
    data: UpdateSubscriptionData
  ): Promise<SubscriptionResult> {
    // 检查订阅是否存在
    const existing = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    })

    if (!existing) {
      throw new SubscriptionError(
        '订阅不存在',
        'SUBSCRIPTION_NOT_FOUND',
        404
      )
    }

    // 验证分类（如果指定了分类）
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      })

      if (!category) {
        throw new SubscriptionError(
          '分类不存在',
          'CATEGORY_NOT_FOUND',
          404
        )
      }
    }

    // 更新订阅
    const subscription = await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        ...data,
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return this.toResult(subscription)
  }

  /**
   * 删除订阅
   */
  async delete(subscriptionId: string, userId: string): Promise<void> {
    // 检查订阅是否存在
    const existing = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    })

    if (!existing) {
      throw new SubscriptionError(
        '订阅不存在',
        'SUBSCRIPTION_NOT_FOUND',
        404
      )
    }

    // 删除订阅（级联删除文章）
    await prisma.subscription.delete({
      where: {
        id: subscriptionId,
      },
    })
  }

  /**
   * 获取单个订阅
   */
  async getById(
    subscriptionId: string,
    userId: string
  ): Promise<SubscriptionWithStats | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    })

    if (!subscription) {
      return null
    }

    // 获取未读数量
    const unreadCount = await prisma.article.count({
      where: {
        subscriptionId,
        isRead: false,
      },
    })

    return {
      ...this.toResult(subscription),
      articleCount: subscription._count.articles,
      unreadCount,
    }
  }

  /**
   * 获取订阅列表
   */
  async getList(filter: SubscriptionFilter): Promise<SubscriptionWithStats[]> {
    const { userId, categoryId, isActive, hasError, search } = filter

    const whereClause: {
      userId: string
      categoryId?: string | null
      isActive?: boolean
      OR?: Array<{
        fetchError?: { not: string | null }
        errorCode?: { not: string | null }
      }>
      AND?: Array<{
        title?: { contains: string }
        description?: { contains: string }
      }>
    } = {
      userId,
    }

    if (categoryId !== undefined) {
      whereClause.categoryId = categoryId
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive
    }

    if (hasError) {
      whereClause.OR = [
        { fetchError: { not: null } },
        { errorCode: { not: null } },
      ]
    }

    if (search) {
      // SQLite 不支持模式匹配，使用 contains
      // 注意：Prisma 的 SQLite 限制，需要分开处理
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 获取每个订阅的未读数量
    const subscriptionIds = subscriptions.map((s) => s.id)
    const unreadCounts = await prisma.article.groupBy({
      by: ['subscriptionId'],
      where: {
        subscriptionId: { in: subscriptionIds },
        isRead: false,
      },
      _count: true,
    })

    const unreadMap = new Map(
      unreadCounts.map((item) => [item.subscriptionId, item._count])
    )

    // 如果有搜索条件，在内存中过滤
    let filteredSubscriptions = subscriptions
    if (search) {
      const searchLower = search.toLowerCase()
      filteredSubscriptions = subscriptions.filter(
        (s) =>
          s.title.toLowerCase().includes(searchLower) ||
          (s.description?.toLowerCase().includes(searchLower) ?? false)
      )
    }

    return filteredSubscriptions.map((sub) => ({
      ...this.toResult(sub),
      articleCount: sub._count.articles,
      unreadCount: unreadMap.get(sub.id) || 0,
    }))
  }

  /**
   * 刷新订阅（获取新文章）
   */
  async refresh(subscriptionId: string, userId: string): Promise<RefreshResult> {
    // 检查订阅是否存在
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    })

    if (!subscription) {
      throw new SubscriptionError(
        '订阅不存在',
        'SUBSCRIPTION_NOT_FOUND',
        404
      )
    }

    try {
      // 获取 feed
      const result = await rssParser.parse(subscription.feedUrl, {
        lastModified: subscription.lastFetched?.toISOString(),
      })

      // 如果未修改
      if (result.notModified) {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            lastFetched: new Date(),
            fetchError: null,
            errorCode: null,
          },
        })

        return {
          subscriptionId,
          success: true,
          newArticles: 0,
        }
      }

      if (!result.feed) {
        throw new Error('无法获取 Feed 内容')
      }

      // 获取已存在的文章 URL
      const existingArticles = await prisma.article.findMany({
        where: {
          subscriptionId,
        },
        select: {
          url: true,
        },
      })

      const existingUrls = new Set(existingArticles.map((a) => a.url))

      // 过滤出新文章
      const newArticles = result.feed.articles.filter(
        (article) => !existingUrls.has(article.url)
      )

      // 创建新文章
      let createdCount = 0
      if (newArticles.length > 0) {
        createdCount = await this.createArticles(subscriptionId, newArticles)
      }

      // 更新订阅信息
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          title: result.feed.title,
          description: result.feed.description,
          siteUrl: result.feed.siteUrl,
          imageUrl: result.feed.imageUrl,
          lastFetched: new Date(),
          fetchError: null,
          errorCode: null,
        },
      })

      return {
        subscriptionId,
        success: true,
        newArticles: createdCount,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '刷新失败'

      // 更新错误信息
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          lastFetched: new Date(),
          fetchError: errorMessage,
          errorCode: error instanceof RSSError ? error.code : 'REFRESH_ERROR',
        },
      })

      return {
        subscriptionId,
        success: false,
        newArticles: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * 批量刷新订阅
   */
  async refreshAll(userId: string): Promise<RefreshResult[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        showImages: true, // Just to add a differentiator for uniqueness if needed, but the block is unique enough
      },
      select: {
        id: true,
      },
    })

    const results: RefreshResult[] = []

    // 并行刷新，但限制并发数
    const batchSize = 5
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map((sub) => this.refresh(sub.id, userId))
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * 健康检查
   */
  async healthCheck(subscriptionId: string): Promise<HealthCheckResult> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        feedUrl: true,
        lastFetched: true,
      },
    })

    if (!subscription) {
      return {
        subscriptionId,
        isHealthy: false,
        error: '订阅不存在',
        lastChecked: new Date(),
      }
    }

    try {
      const response = await fetch(subscription.feedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'RSS-Reader/1.0',
        },
      })

      return {
        subscriptionId,
        isHealthy: response.ok,
        statusCode: response.status,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        subscriptionId,
        isHealthy: false,
        error: error instanceof Error ? error.message : '健康检查失败',
        lastChecked: new Date(),
      }
    }
  }

  /**
   * 从 URL 发现订阅
   */
  async discoverFromUrl(url: string): Promise<DiscoveredFeed[]> {
    try {
      const result = await feedDiscovery.discoverFromUrl(url)
      return result.feeds
    } catch (error) {
      throw new SubscriptionError(
        `发现订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'DISCOVERY_FAILED'
      )
    }
  }

  /**
   * 创建文章
   * 只导入最近一个月的文章
   */
  private async createArticles(
    subscriptionId: string,
    articles: Array<{
      guid: string
      title: string
      url: string
      content: string | null
      contentText: string | null
      author: string | null
      publishedAt: Date | null
      imageUrl: string | null
      contentHash: string
      readingTime: number
      categories: string[]
    }>
  ): Promise<number> {
    let createdCount = 0

    // 只保留最近一个月的文章
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const recentArticles = articles.filter((article) => {
      if (!article.publishedAt) return true // 如果没有日期，保留
      return new Date(article.publishedAt) >= oneMonthAgo
    })

    console.log(`过滤文章: 总数 ${articles.length}, 最近一个月 ${recentArticles.length}`)

    for (const article of recentArticles) {
      try {
        // 检查是否已存在（通过 URL）
        const existing = await prisma.article.findFirst({
          where: {
            subscriptionId,
            url: article.url,
          },
        })

        if (existing) {
          continue // 跳过已存在的文章
        }

        await prisma.article.create({
          data: {
            subscriptionId,
            title: article.title,
            content: article.content,
            contentText: article.contentText,
            url: article.url,
            author: article.author,
            publishedAt: article.publishedAt,
            imageUrl: article.imageUrl,
          },
        })
        createdCount++
      } catch (error) {
        // 忽略重复文章或其他错误
        console.error(`创建文章失败: ${article.title}`, error)
      }
    }

    return createdCount
  }

  /**
   * 转换为结果格式
   */
  private toResult(
    subscription: {
      id: string
      userId: string
      categoryId: string | null
      title: string
      description: string | null
      feedUrl: string
      siteUrl: string | null
      imageUrl: string | null
      isActive: boolean
      lastFetched: Date | null
      fetchError: string | null
      errorCode: string | null
      refreshInterval: number | null
      showImages: boolean
      fullTextExtract: boolean
      createdAt: Date
      updatedAt: Date
      category?: {
        id: string
        name: string
        color: string | null
      } | null
      _count?: {
        articles: number
      }
    }
  ): SubscriptionResult {
    return {
      id: subscription.id,
      userId: subscription.userId,
      categoryId: subscription.categoryId,
      title: subscription.title,
      description: subscription.description,
      feedUrl: subscription.feedUrl,
      siteUrl: subscription.siteUrl,
      imageUrl: subscription.imageUrl,
      isActive: subscription.isActive,
      lastFetched: subscription.lastFetched,
      fetchError: subscription.fetchError,
      errorCode: subscription.errorCode,
      refreshInterval: subscription.refreshInterval,
      showImages: subscription.showImages,
      fullTextExtract: subscription.fullTextExtract,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      category: subscription.category,
      _count: subscription._count,
    }
  }
}

// 导出单例
export const subscriptionService = new SubscriptionService()
