/**
 * 分类相关类型定义
 * @module types/category
 */

/**
 * 分类信息接口
 *
 * 表示订阅的组织分类
 *
 * @example
 * ```typescript
 * const category: Category = {
 *   id: 'cat-001',
 *   name: '技术博客',
 *   description: '技术相关的博客订阅',
 *   color: '#3498db',
 *   icon: 'code',
 *   sortOrder: 1,
 *   parentId: null,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface Category {
  /** 分类唯一标识符 */
  id: string;

  /** 分类名称 */
  name: string;

  /** 分类描述（可选） */
  description?: string;

  /** 分类颜色（十六进制颜色值，可选） */
  color?: string;

  /** 分类图标标识（可选） */
  icon?: string;

  /** 排序顺序 */
  sortOrder: number;

  /** 父分类 ID（用于嵌套分类，可选） */
  parentId?: string | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建分类请求接口
 *
 * 用于创建新分类时的参数
 */
export interface CreateCategoryRequest {
  /** 分类名称 */
  name: string;

  /** 分类描述（可选） */
  description?: string;

  /** 分类颜色（可选） */
  color?: string;

  /** 分类图标标识（可选） */
  icon?: string;

  /** 父分类 ID（可选） */
  parentId?: string;
}

/**
 * 更新分类请求接口
 *
 * 用于更新分类信息时的参数
 */
export interface UpdateCategoryRequest {
  /** 分类名称（可选） */
  name?: string;

  /** 分类描述（可选） */
  description?: string;

  /** 分类颜色（可选） */
  color?: string;

  /** 分类图标标识（可选） */
  icon?: string;

  /** 父分类 ID（可选） */
  parentId?: string | null;

  /** 排序顺序（可选） */
  sortOrder?: number;
}

/**
 * 分类树节点接口
 *
 * 表示带有层级关系的分类树结构
 */
export interface CategoryTreeNode {
  /** 分类信息 */
  category: Category;

  /** 子分类列表 */
  children: CategoryTreeNode[];

  /** 该分类下的订阅数量 */
  subscriptionCount: number;

  /** 该分类下未读文章数量 */
  unreadCount: number;
}

/**
 * 分类统计信息接口
 *
 * 表示分类的统计信息
 */
export interface CategoryStats {
  /** 分类 ID */
  categoryId: string;

  /** 订阅数量 */
  subscriptionCount: number;

  /** 文章总数 */
  totalArticles: number;

  /** 未读文章数 */
  unreadArticles: number;

  /** 收藏文章数 */
  starredArticles: number;
}

/**
 * 分类排序类型
 */
export type CategorySortBy = 'name' | 'sortOrder' | 'createdAt' | 'subscriptionCount';
