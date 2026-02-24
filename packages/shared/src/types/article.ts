/**
 * 文章相关类型定义
 * @module types/article
 */

/**
 * 文章阅读状态
 */
export type ReadStatus = 'unread' | 'read' | 'reading';

/**
 * 文章质量等级
 */
export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * 文章信息接口
 *
 * 表示从订阅源抓取的文章内容
 *
 * @example
 * ```typescript
 * const article: Article = {
 *   id: 'art-001',
 *   title: 'TypeScript 5.0 新特性介绍',
 *   content: '<p>文章内容...</p>',
 *   summary: '本文介绍了 TypeScript 5.0 的新特性...',
 *   originalUrl: 'https://example.com/typescript-5',
 *   author: '张三',
 *   publishedAt: new Date('2024-01-15'),
 *   fetchedAt: new Date(),
 *   isRead: false,
 *   isStarred: false,
 *   isSaved: false,
 *   readTime: 5,
 *   subscriptionId: 'sub-001',
 *   tags: ['TypeScript', '编程'],
 *   keywords: ['类型系统', '装饰器'],
 * };
 * ```
 */
export interface Article {
  /** 文章唯一标识符 */
  id: string;

  /** 文章标题 */
  title: string;

  /** 文章 HTML 内容（可选） */
  content?: string;

  /** 文章摘要（可选） */
  summary?: string;

  /** 原文 URL */
  originalUrl: string;

  /** 作者（可选） */
  author?: string;

  /** 发布时间 */
  publishedAt: Date;

  /** 抓取时间 */
  fetchedAt: Date;

  /** 是否已读 */
  isRead: boolean;

  /** 是否收藏 */
  isStarred: boolean;

  /** 是否保存到 Obsidian */
  isSaved: boolean;

  /** 预估阅读时间（分钟，可选） */
  readTime?: number;

  /** 内容哈希值，用于去重（可选） */
  contentHash?: string;

  /** 内容质量评分（0-100，可选） */
  qualityScore?: number;

  /** 所属订阅 ID */
  subscriptionId: string;

  /** 文章标签 */
  tags: string[];

  /** 关键词列表 */
  keywords: string[];
}

/**
 * 创建文章接口
 *
 * 表示从订阅源解析的文章数据
 */
export interface ParsedArticle {
  /** 文章标题 */
  title: string;

  /** 文章 HTML 内容（可选） */
  content?: string;

  /** 文章摘要（可选） */
  summary?: string;

  /** 原文 URL */
  originalUrl: string;

  /** 作者（可选） */
  author?: string;

  /** 发布时间（可选） */
  publishedAt?: Date;

  /** 内容哈希值（可选） */
  contentHash?: string;
}

/**
 * 文章查询选项接口
 *
 * 用于查询文章列表时的筛选条件
 */
export interface ArticleQueryOptions {
  /** 按订阅 ID 筛选（可选） */
  subscriptionId?: string;

  /** 按分类 ID 筛选（可选） */
  categoryId?: string;

  /** 按标签筛选（可选） */
  tag?: string;

  /** 是否已读（可选） */
  isRead?: boolean;

  /** 是否收藏（可选） */
  isStarred?: boolean;

  /** 是否保存（可选） */
  isSaved?: boolean;

  /** 搜索关键词（可选） */
  search?: string;

  /** 开始日期（可选） */
  startDate?: Date;

  /** 结束日期（可选） */
  endDate?: Date;

  /** 最小质量评分（可选） */
  minQualityScore?: number;

  /** 排序字段 */
  sortBy?: 'publishedAt' | 'fetchedAt' | 'title' | 'qualityScore' | 'readTime';

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';

  /** 页码（从 1 开始） */
  page?: number;

  /** 每页数量 */
  pageSize?: number;
}

/**
 * 文章批量操作类型
 */
export type BatchAction = 'markRead' | 'markUnread' | 'star' | 'unstar' | 'save' | 'unsave' | 'delete';

/**
 * 文章批量操作请求接口
 */
export interface ArticleBatchRequest {
  /** 文章 ID 列表 */
  articleIds: string[];

  /** 操作类型 */
  action: BatchAction;
}

/**
 * 文章批量操作结果接口
 */
export interface ArticleBatchResult {
  /** 成功数量 */
  success: number;

  /** 失败数量 */
  failed: number;

  /** 失败的文章 ID 和错误信息 */
  errors: Array<{
    articleId: string;
    error: string;
  }>;
}

/**
 * 文章内容类型
 */
export interface ArticleContent {
  /** 文章 ID */
  articleId: string;

  /** 纯文本内容 */
  textContent: string;

  /** HTML 内容 */
  htmlContent: string;

  /** 阅读模式内容（可选） */
  readableContent?: string;
}

/**
 * 文章统计信息接口
 */
export interface ArticleStats {
  /** 总文章数 */
  total: number;

  /** 未读数 */
  unread: number;

  /** 今日新增数 */
  today: number;

  /** 本周新增数 */
  thisWeek: number;

  /** 收藏数 */
  starred: number;

  /** 保存数 */
  saved: number;
}
