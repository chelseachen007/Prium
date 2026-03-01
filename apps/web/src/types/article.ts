/**
 * 文章相关类型定义
 * @module types/article
 */

/**
 * 文章阅读状态
 */
export type ReadStatus = 'unread' | 'read' | 'reading'

/**
 * 文章质量等级
 */
export type QualityLevel = 'low' | 'medium' | 'high'

/**
 * 文章信息接口
 */
export interface Article {
  /** 文章唯一标识符 */
  id: string

  /** 文章标题 */
  title: string

  /** 文章 HTML 内容（可选） */
  content?: string

  /** 文章摘要（可选） */
  summary?: string

  /** 原文 URL */
  url: string

  /** 图片 URL（可选） */
  imageUrl?: string

  /** 封面图片（可选，与 imageUrl 相同） */
  coverImage?: string

  /** 作者（可选） */
  author?: string

  /** 发布时间 */
  publishedAt: Date | string

  /** 抓取时间 */
  fetchedAt?: Date | string

  /** 是否已读 */
  isRead: boolean

  /** 是否收藏 */
  isStarred: boolean

  /** 是否保存 */
  isSaved: boolean

  /** 预估阅读时间（分钟，可选） */
  readTime?: number

  /** 阅读时间文本（可选） */
  readingTime?: number

  /** 内容哈希值（可选） */
  contentHash?: string

  /** 内容质量评分（0-100，可选） */
  qualityScore?: number

  /** 所属订阅 ID */
  subscriptionId: string

  /** 文章标签 */
  tags: string[]

  /** AI 标签 */
  aiTags?: string[]

  /** 关键词列表 */
  keywords?: string[]

  /** 文章来源信息 */
  source?: {
    id: string
    name: string
    url: string
    categoryId?: string
    favicon?: string
  }

  /** 阅读时间文本 */
  readTimeText?: string
}

/**
 * 创建文章接口
 */
export interface ParsedArticle {
  title: string
  content?: string
  summary?: string
  description?: string
  url: string
  originalUrl?: string
  imageUrl?: string
  author?: string
  publishedAt?: string
  contentHash?: string
}

/**
 * 文章查询选项接口
 */
export interface ArticleQueryOptions {
  subscriptionId?: string
  categoryId?: string
  tag?: string
  isRead?: boolean
  isStarred?: boolean
  isSaved?: boolean
  search?: string
  startDate?: Date
  endDate?: Date
  minQualityScore?: number
  sortBy?: 'publishedAt' | 'fetchedAt' | 'title' | 'qualityScore' | 'readTime'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/**
 * 文章批量操作类型
 */
export type BatchAction = 'markRead' | 'markUnread' | 'star' | 'unstar' | 'save' | 'unsave' | 'delete'

/**
 * 文章批量操作请求接口
 */
export interface ArticleBatchRequest {
  articleIds: string[]
  action: BatchAction
}

/**
 * 文章批量操作结果接口
 */
export interface ArticleBatchResult {
  success: number
  failed: number
  errors: Array<{
    articleId: string
    error: string
  }>
}

/**
 * 文章统计信息接口
 */
export interface ArticleStats {
  total: number
  totalArticles?: number
  unread: number
  unreadArticles?: number
  readArticles?: number
  today: number
  thisWeek: number
  starred: number
  starredArticles?: number
  saved: number
}
