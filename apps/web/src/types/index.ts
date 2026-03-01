/**
 * 类型定义入口文件
 * @module types
 */

// 订阅相关类型
export * from './subscription'
// 文章相关类型
export * from './article'
// 分类相关类型
export * from './category'
// 过滤规则相关类型
export * from './filter'
// API 相关类型
export * from './api'

// ============================================================================
// 用户类型
// ============================================================================

/**
 * 用户接口
 */
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt?: string
}

// ============================================================================
// OPML 相关类型
// ============================================================================

/**
 * OPML 大纲接口
 */
export interface OpmlOutline {
  text: string
  title?: string
  type?: string
  xmlUrl?: string
  htmlUrl?: string
  outline?: OpmlOutline[]
}

/**
 * OPML 文档接口
 */
export interface Opml {
  version: string
  head?: {
    title?: string
    dateCreated?: string
    dateModified?: string
  }
  body: {
    outline: OpmlOutline[]
  }
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

/**
 * 保存类型
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
