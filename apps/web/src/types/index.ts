/**
 * 本地类型定义
 * @module types
 *
 * 注意：主要的共享类型定义来自 @rss-reader/shared 包
 * 这里定义的是前端特有的本地类型
 */

// ============================================================================
// 重新导出共享类型（方便统一导入）
// ============================================================================

export type {
  // 订阅相关
  Subscription as SharedSubscription,
  SubscriptionStatus,
  FeedType,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryOptions,
  SubscriptionStats,
  SubscriptionImportResult,
  // 分类相关
  Category as SharedCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryTreeNode,
  CategoryStats,
  CategorySortBy,
  // 文章相关
  Article as SharedArticle,
  ParsedArticle,
  ReadStatus,
  QualityLevel,
  ArticleQueryOptions,
  BatchAction,
  ArticleBatchRequest,
  ArticleBatchResult,
  ArticleContent,
  ArticleStats,
  // Obsidian 相关
  ObsidianConfig as SharedObsidianConfig,
  ObsidianConnectionStatus,
  ObsidianNote,
  SyncStatus,
  CreateObsidianNoteRequest,
  UpdateObsidianNoteRequest,
  ObsidianSyncResult,
  ObsidianVaultInfo,
  ObsidianProperty,
  ObsidianLinkType,
  ObsidianLink,
  ObsidianTemplateContext,
  ObsidianPluginConfig,
  // 过滤规则相关
  FilterRule,
  FilterType,
  FilterField,
  MatchCondition,
  CreateFilterRuleRequest,
  UpdateFilterRuleRequest,
  FilterResult,
  FilterGroup,
  FilterTemplate,
  FilterStats,
  // API 相关
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorResponse,
  BatchOperationResult,
  SearchRequest,
  SearchResult,
  HttpMethod,
  ApiRequestConfig,
  WebSocketMessage,
  WebSocketEventType,
  NotificationMessage,
  // 模板相关
  Template,
  TemplateVariable,
  TemplateVariableType,
  TemplateCategory,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateRenderContext,
  TemplateRenderOptions,
  TemplateRenderResult,
  TemplateVariableGroup,
  TemplateValidationResult,
} from '@rss-reader/shared'

export { BUILT_IN_FILTER_TEMPLATES } from '@rss-reader/shared'
export {
  BUILT_IN_TEMPLATE_VARIABLES,
  ARTICLE_TEMPLATE_VARIABLES,
} from '@rss-reader/shared'

// ============================================================================
// 前端本地类型（用于 UI 显示和本地状态）
// ============================================================================

/**
 * 文章来源（前端显示用）
 */
export interface ArticleSource {
  id: string
  name: string
  url: string
  favicon?: string
  categoryId?: string
}

/**
 * 文章类型（前端显示用）
 */
export interface Article {
  id: string
  title: string
  content: string
  summary: string
  source: ArticleSource
  author?: string
  url: string
  publishedAt: string
  updatedAt?: string
  readTime?: string
  isRead: boolean
  isStarred: boolean
  tags?: string[]
  coverImage?: string
}

/**
 * 订阅类型（前端显示用）
 */
export interface Subscription {
  id: string
  title: string
  url: string
  description?: string
  category?: string
  categoryId?: string
  icon?: string
  articleCount: number
  unreadCount: number
  lastUpdated: string
  isActive: boolean
}

/**
 * 分类类型（前端显示用）
 */
export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  subscriptionCount: number
  unreadCount: number
  isExpanded?: boolean
}

/**
 * Obsidian 配置（前端设置用）
 */
export interface ObsidianConfig {
  enabled: boolean
  vaultPath: string
  folderPath: string
  fileNameTemplate: string
  autoSync: boolean
  includeImages: boolean
  includeMetadata: boolean
  tagFormat: string
}

/**
 * 保存到 Obsidian 的类型
 */
export type SaveType = 'full' | 'summary' | 'inspiration'

/**
 * 保存到 Obsidian 的选项
 */
export interface SaveToObsidianOptions {
  articleId: string
  saveType: SaveType
  folder: string
  template?: string
  customContent?: string
}

/**
 * Obsidian 模板
 */
export interface ObsidianTemplate {
  id: string
  name: string
  content: string
  isDefault: boolean
}

// ============================================================================
// 搜索和过滤类型
// ============================================================================

/**
 * 文章过滤类型
 */
export type ArticleFilter = 'all' | 'unread' | 'starred'

/**
 * 视图模式
 */
export type ViewMode = 'list' | 'card'

/**
 * 排序选项
 */
export type SortOption = 'date' | 'source' | 'readTime'

/**
 * 文章查询参数
 */
export interface ArticleQuery {
  filter: ArticleFilter
  sort: SortOption
  search?: string
  categoryId?: string
  subscriptionId?: string
  page?: number
  limit?: number
}

// ============================================================================
// UI 状态类型
// ============================================================================

/**
 * Toast 消息
 */
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}
