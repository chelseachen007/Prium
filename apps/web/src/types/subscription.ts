/**
 * 订阅相关类型定义
 * @module types/subscription
 */

/**
 * 订阅状态枚举
 */
export type SubscriptionStatus = 'active' | 'paused' | 'error' | 'deleted'

/**
 * 订阅源类型
 */
export type FeedType = 'rss' | 'atom' | 'rdf' | 'json'

/**
 * 订阅信息接口
 */
export interface Subscription {
  /** 订阅唯一标识符 */
  id: string

  /** 用户ID */
  userId?: string

  /** 订阅标题 */
  title: string

  /** RSS/Atom 订阅源 URL */
  feedUrl: string

  /** 原始网站 URL（可选） */
  siteUrl?: string

  /** 订阅 URL（与 siteUrl 相同） */
  url?: string

  /** 订阅描述（可选） */
  description?: string

  /** 订阅图标/图片 URL（可选） */
  imageUrl?: string

  /** 订阅图标 */
  icon?: string

  /** 所属分类 ID */
  categoryId?: string

  /** 所属分类 */
  category?: {
    id: string
    name: string
    color?: string
  }

  /** 标签列表 */
  tags: string[]

  /** 是否启用 */
  isActive: boolean

  /** 抓取间隔（秒） */
  fetchInterval: number

  /** 最后抓取时间（可选） */
  lastFetchedAt?: Date | string

  /** 最后更新时间 */
  lastUpdated?: Date | string

  /** HTTP Last-Modified 头值（可选） */
  lastModified?: string

  /** HTTP ETag 头值（可选） */
  etag?: string

  /** 连续错误次数 */
  errorCount: number

  /** 最后错误信息（可选） */
  lastError?: string

  /** 未读文章数 */
  unreadCount?: number

  /** 创建时间 */
  createdAt: Date | string

  /** 更新时间 */
  updatedAt: Date | string
}

/**
 * 创建订阅请求接口
 */
export interface CreateSubscriptionRequest {
  feedUrl: string
  title?: string
  siteUrl?: string
  categoryId?: string
  tags?: string[]
  fetchInterval?: number
}

/**
 * 更新订阅请求接口
 */
export interface UpdateSubscriptionRequest {
  title?: string
  categoryId?: string
  tags?: string[]
  isActive?: boolean
  fetchInterval?: number
}

/**
 * 订阅查询选项接口
 */
export interface SubscriptionQueryOptions {
  categoryId?: string
  tag?: string
  isActive?: boolean
  search?: string
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'lastFetchedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 订阅统计信息接口
 */
export interface SubscriptionStats {
  subscriptionId: string
  totalArticles: number
  unreadArticles: number
  starredArticles: number
  savedArticles: number
  lastArticleAt?: Date | string
}

/**
 * 订阅导入结果接口
 */
export interface SubscriptionImportResult {
  imported: number
  failed: number
  skipped: number
  success?: boolean
  errors: Array<{
    feedUrl: string
    error: string
  }>
}
