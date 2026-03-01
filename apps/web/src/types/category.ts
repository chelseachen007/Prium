/**
 * 分类相关类型定义
 * @module types/category
 */

/**
 * 分类信息接口
 */
export interface Category {
  /** 分类唯一标识符 */
  id: string

  /** 用户ID */
  userId?: string

  /** 分类名称 */
  name: string

  /** 分类描述（可选） */
  description?: string

  /** 分类颜色（可选） */
  color?: string

  /** 分类图标标识（可选） */
  icon?: string

  /** 排序顺序 */
  sortOrder: number

  /** 父分类 ID（可选） */
  parentId?: string | null

  /** 创建时间 */
  createdAt: Date | string

  /** 更新时间 */
  updatedAt: Date | string

  /** UI 状态：是否展开 */
  isExpanded?: boolean

  /** 未读文章数 */
  unreadCount?: number

  /** 订阅数量 */
  subscriptionCount?: number

  /** 订阅列表 */
  subscriptions?: Array<{
    id: string
    title: string
    unreadCount: number
  }>
}

/**
 * 创建分类请求接口
 */
export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  parentId?: string
}

/**
 * 更新分类请求接口
 */
export interface UpdateCategoryRequest {
  name?: string
  description?: string
  color?: string
  icon?: string
  parentId?: string | null
  sortOrder?: number
}

/**
 * 分类树节点接口
 */
export interface CategoryTreeNode {
  category: Category
  children: CategoryTreeNode[]
  subscriptionCount: number
  unreadCount: number
}

/**
 * 分类统计信息接口
 */
export interface CategoryStats {
  categoryId: string
  subscriptionCount: number
  totalArticles: number
  unreadArticles: number
  starredArticles: number
}

/**
 * 分类排序类型
 */
export type CategorySortBy = 'name' | 'sortOrder' | 'createdAt' | 'subscriptionCount'
