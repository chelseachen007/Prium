/**
 * 订阅相关类型定义
 * @module types/subscription
 */

/**
 * 订阅状态枚举
 */
export type SubscriptionStatus = 'active' | 'paused' | 'error' | 'deleted';

/**
 * 订阅源类型
 */
export type FeedType = 'rss' | 'atom' | 'rdf' | 'json';

/**
 * 订阅信息接口
 *
 * 表示一个 RSS/Atom 订阅源的完整信息
 *
 * @example
 * ```typescript
 * const subscription: Subscription = {
 *   id: 'sub-001',
 *   title: '技术博客',
 *   feedUrl: 'https://example.com/feed.xml',
 *   categoryId: 'cat-001',
 *   tags: ['技术', '编程'],
 *   isActive: true,
 *   fetchInterval: 3600,
 *   errorCount: 0,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface Subscription {
  /** 订阅唯一标识符 */
  id: string;

  /** 订阅标题 */
  title: string;

  /** RSS/Atom 订阅源 URL */
  feedUrl: string;

  /** 原始网站 URL（可选） */
  siteUrl?: string;

  /** 订阅描述（可选） */
  description?: string;

  /** 订阅图标/图片 URL（可选） */
  imageUrl?: string;

  /** 所属分类 ID */
  categoryId: string;

  /** 标签列表 */
  tags: string[];

  /** 是否启用 */
  isActive: boolean;

  /** 抓取间隔（秒） */
  fetchInterval: number;

  /** 最后抓取时间（可选） */
  lastFetchedAt?: Date;

  /** HTTP Last-Modified 头值，用于增量抓取（可选） */
  lastModified?: string;

  /** HTTP ETag 头值，用于增量抓取（可选） */
  etag?: string;

  /** 连续错误次数 */
  errorCount: number;

  /** 最后错误信息（可选） */
  lastError?: string;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建订阅请求接口
 *
 * 用于创建新订阅时的参数
 */
export interface CreateSubscriptionRequest {
  /** 订阅源 URL */
  feedUrl: string;

  /** 自定义标题（可选，默认使用订阅源中的标题） */
  title?: string;

  /** 所属分类 ID（可选） */
  categoryId?: string;

  /** 标签列表（可选） */
  tags?: string[];

  /** 抓取间隔（秒，可选，默认使用全局设置） */
  fetchInterval?: number;
}

/**
 * 更新订阅请求接口
 *
 * 用于更新订阅信息时的参数
 */
export interface UpdateSubscriptionRequest {
  /** 订阅标题（可选） */
  title?: string;

  /** 所属分类 ID（可选） */
  categoryId?: string;

  /** 标签列表（可选） */
  tags?: string[];

  /** 是否启用（可选） */
  isActive?: boolean;

  /** 抓取间隔（秒，可选） */
  fetchInterval?: number;
}

/**
 * 订阅查询选项接口
 *
 * 用于查询订阅列表时的筛选条件
 */
export interface SubscriptionQueryOptions {
  /** 按分类 ID 筛选（可选） */
  categoryId?: string;

  /** 按标签筛选（可选） */
  tag?: string;

  /** 按状态筛选（可选） */
  isActive?: boolean;

  /** 搜索关键词（可选） */
  search?: string;

  /** 排序字段 */
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'lastFetchedAt';

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 订阅统计信息接口
 *
 * 表示订阅源的统计信息
 */
export interface SubscriptionStats {
  /** 订阅 ID */
  subscriptionId: string;

  /** 文章总数 */
  totalArticles: number;

  /** 未读文章数 */
  unreadArticles: number;

  /** 收藏文章数 */
  starredArticles: number;

  /** 保存文章数 */
  savedArticles: number;

  /** 最后文章发布时间（可选） */
  lastArticleAt?: Date;
}

/**
 * 订阅导入结果接口
 *
 * 表示 OPML 导入的结果
 */
export interface SubscriptionImportResult {
  /** 成功导入数量 */
  imported: number;

  /** 失败数量 */
  failed: number;

  /** 重复跳过数量 */
  skipped: number;

  /** 错误详情列表 */
  errors: Array<{
    feedUrl: string;
    error: string;
  }>;
}
