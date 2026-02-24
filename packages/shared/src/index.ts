/**
 * @rss-reader/shared
 *
 * RSS Reader 共享类型定义包
 *
 * 这个模块导出了 RSS Reader 应用的所有共享类型定义。
 *
 * @example
 * ```typescript
 * import type { Article, Subscription, Category } from '@rss-reader/shared';
 * import { BUILT_IN_FILTER_TEMPLATES } from '@rss-reader/shared';
 * ```
 *
 * @module @rss-reader/shared
 */

// ============================================================================
// 订阅相关类型
// ============================================================================
export type {
  Subscription,
  SubscriptionStatus,
  FeedType,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryOptions,
  SubscriptionStats,
  SubscriptionImportResult,
} from './types/subscription';

// ============================================================================
// 分类相关类型
// ============================================================================
export type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryTreeNode,
  CategoryStats,
  CategorySortBy,
} from './types/category';

// ============================================================================
// 文章相关类型
// ============================================================================
export type {
  Article,
  ParsedArticle,
  ReadStatus,
  QualityLevel,
  ArticleQueryOptions,
  BatchAction,
  ArticleBatchRequest,
  ArticleBatchResult,
  ArticleContent,
  ArticleStats,
} from './types/article';

// ============================================================================
// Obsidian 相关类型
// ============================================================================
export type {
  ObsidianConfig,
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
} from './types/obsidian';

// ============================================================================
// 过滤规则相关类型
// ============================================================================
export type {
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
} from './types/filter';

export { BUILT_IN_FILTER_TEMPLATES } from './types/filter';

// ============================================================================
// API 相关类型
// ============================================================================
export type {
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
} from './types/api';

// ============================================================================
// 模板相关类型
// ============================================================================
export type {
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
} from './types/template';

export {
  BUILT_IN_TEMPLATE_VARIABLES,
  ARTICLE_TEMPLATE_VARIABLES,
} from './types/template';
