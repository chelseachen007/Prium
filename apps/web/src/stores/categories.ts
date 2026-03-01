/**
 * 分类状态管理
 * @module stores/categories
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryTreeNode,
  CategoryStats,
  CategorySortBy,
} from '@/types'

/**
 * 分类 Store
 *
 * 使用 Supabase 管理分类列表、当前分类、加载状态和 CRUD 操作
 */
export const useCategoryStore = defineStore('categories', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 分类列表 */
  const categories = ref<Category[]>([])

  /** 当前选中的分类 */
  const currentCategory = ref<Category | null>(null)

  /** 分类统计信息映射 */
  const categoryStats = ref<Map<string, CategoryStats>>(new Map())

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  /** 最后更新时间 */
  const lastUpdated = ref<Date | null>(null)

  /** 排序方式 */
  const sortBy = ref<CategorySortBy>('sortOrder')

  /** 排序方向 */
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // ============================================================================
  // Getters
  // ============================================================================

  /** 分类总数 */
  const count = computed(() => categories.value.length)

  /** 根分类列表（没有父分类的分类） */
  const rootCategories = computed(() => {
    return categories.value.filter((cat) => !cat.parentId)
  })

  /** 分类树结构 */
  const categoryTree = computed((): CategoryTreeNode[] => {
    const buildTree = (parentId: string | null = null): CategoryTreeNode[] => {
      const children = categories.value
        .filter((cat) => cat.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((cat) => ({
          category: cat,
          children: buildTree(cat.id),
          subscriptionCount: categoryStats.value.get(cat.id)?.subscriptionCount || 0,
          unreadCount: categoryStats.value.get(cat.id)?.unreadArticles || 0,
        }))
      return children
    }
    return buildTree(null)
  })

  /** 按排序方式排序后的分类列表 */
  const sortedCategories = computed(() => {
    const result = [...categories.value]

    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy.value) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'sortOrder':
          comparison = a.sortOrder - b.sortOrder
          break
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'subscriptionCount':
          const aCount = categoryStats.value.get(a.id)?.subscriptionCount || 0
          const bCount = categoryStats.value.get(b.id)?.subscriptionCount || 0
          comparison = aCount - bCount
          break
      }

      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  /** 分类 ID 到分类的映射 */
  const categoryMap = computed(() => {
    return new Map(categories.value.map((cat) => [cat.id, cat]))
  })

  /** 获取子分类 */
  const getChildren = computed(() => {
    return (parentId: string): Category[] => {
      return categories.value.filter((cat) => cat.parentId === parentId)
    }
  })

  /** 获取分类路径（从根到当前分类） */
  const getCategoryPath = computed(() => {
    return (categoryId: string): Category[] => {
      const path: Category[] = []
      let current = categoryMap.value.get(categoryId)

      while (current) {
        path.unshift(current)
        current = current.parentId
          ? categoryMap.value.get(current.parentId)
          : undefined
      }

      return path
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 获取分类列表
   */
  async function fetchCategories(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return
      }

      const { data, error: supabaseError } = await supabase
        .from('categories')
        .select('*')
        .eq('userId', user.id)
        .order('sortOrder', { ascending: true })

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      categories.value = data || []
      lastUpdated.value = new Date()
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取分类列表失败'
      error.value = message
      console.error('获取分类列表失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取单个分类详情
   */
  async function fetchCategory(id: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      currentCategory.value = data
      // 更新列表中的分类
      const index = categories.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        categories.value[index] = data
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取分类详情失败'
      error.value = message
      console.error('获取分类详情失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建新分类
   */
  async function createCategory(
    data: CreateCategoryRequest
  ): Promise<Category | null> {
    isLoading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        error.value = '用户未登录'
        return null
      }

      // 获取当前最大排序值
      const maxSortOrder = Math.max(
        0,
        ...categories.value.map((c) => c.sortOrder)
      )

      const { data: category, error: supabaseError } = await supabase
        .from('categories')
        .insert({
          userId: user.id,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          parentId: data.parentId,
          sortOrder: maxSortOrder + 1,
        })
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      categories.value.push(category)
      return category
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建分类失败'
      error.value = message
      console.error('创建分类失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新分类
   */
  async function updateCategory(
    id: string,
    data: UpdateCategoryRequest
  ): Promise<Category | null> {
    isLoading.value = true
    error.value = null

    try {
      const { data: category, error: supabaseError } = await supabase
        .from('categories')
        .update({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      const index = categories.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        categories.value[index] = category
      }
      if (currentCategory.value?.id === id) {
        currentCategory.value = category
      }
      return category
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新分类失败'
      error.value = message
      console.error('更新分类失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 删除分类
   */
  async function deleteCategory(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const { error: supabaseError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      // 删除分类及其所有子分类
      const idsToDelete = new Set<string>()
      idsToDelete.add(id)

      // 递归找到所有子分类
      const findChildren = (parentId: string) => {
        for (const cat of categories.value) {
          if (cat.parentId === parentId) {
            idsToDelete.add(cat.id)
            findChildren(cat.id)
          }
        }
      }
      findChildren(id)

      categories.value = categories.value.filter(
        (c) => !idsToDelete.has(c.id)
      )

      if (currentCategory.value?.id === id) {
        currentCategory.value = null
      }

      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除分类失败'
      error.value = message
      console.error('删除分类失败:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新分类排序顺序
   */
  async function updateSortOrder(
    orders: Array<{ id: string; sortOrder: number }>
  ): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // 批量更新
      for (const { id, sortOrder: newSortOrder } of orders) {
        const { error: supabaseError } = await supabase
          .from('categories')
          .update({ sortOrder: newSortOrder })
          .eq('id', id)

        if (supabaseError) {
          throw new Error(supabaseError.message)
        }
      }

      // 更新本地状态
      for (const { id, sortOrder: newSortOrder } of orders) {
        const category = categories.value.find((c) => c.id === id)
        if (category) {
          category.sortOrder = newSortOrder
        }
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新排序失败'
      error.value = message
      console.error('更新排序失败:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 移动分类到新的父分类下
   */
  async function moveCategory(
    categoryId: string,
    newParentId: string | null
  ): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const { data: category, error: supabaseError } = await supabase
        .from('categories')
        .update({
          parentId: newParentId,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', categoryId)
        .select()
        .single()

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      const index = categories.value.findIndex((c) => c.id === categoryId)
      if (index !== -1) {
        categories.value[index] = category
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '移动分类失败'
      error.value = message
      console.error('移动分类失败:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取分类统计信息
   */
  async function fetchCategoryStats(id: string): Promise<void> {
    try {
      // 获取订阅数量
      const { count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('categoryId', id)

      // 获取该分类下的订阅 ID
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('categoryId', id)

      const subscriptionIds = subscriptions?.map((s) => s.id) || []

      let totalArticles = 0
      let unreadArticles = 0
      let starredArticles = 0

      if (subscriptionIds.length > 0) {
        // 获取文章总数
        const { count: total } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .in('subscriptionId', subscriptionIds)

        // 获取未读数
        const { count: unread } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .in('subscriptionId', subscriptionIds)
          .eq('isRead', false)

        // 获取收藏数
        const { count: starred } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .in('subscriptionId', subscriptionIds)
          .eq('isStarred', true)

        totalArticles = total || 0
        unreadArticles = unread || 0
        starredArticles = starred || 0
      }

      categoryStats.value.set(id, {
        categoryId: id,
        subscriptionCount: subscriptionCount || 0,
        totalArticles,
        unreadArticles,
        starredArticles,
      })
    } catch (e) {
      console.error('获取分类统计信息失败:', e)
    }
  }

  /**
   * 获取所有分类的统计信息
   */
  async function fetchAllCategoryStats(): Promise<void> {
    try {
      for (const category of categories.value) {
        await fetchCategoryStats(category.id)
      }
    } catch (e) {
      console.error('获取分类统计信息失败:', e)
    }
  }

  /**
   * 设置当前分类
   */
  function setCurrentCategory(category: Category | null): void {
    currentCategory.value = category
  }

  /**
   * 设置排序方式
   */
  function setSortBy(by: CategorySortBy): void {
    sortBy.value = by
  }

  /**
   * 设置排序方向
   */
  function setSortOrder(order: 'asc' | 'desc'): void {
    sortOrder.value = order
  }

  /**
   * 根据 ID 获取分类
   */
  function getCategoryById(id: string): Category | undefined {
    return categoryMap.value.get(id)
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * 重置 Store
   */
  function $reset(): void {
    categories.value = []
    currentCategory.value = null
    categoryStats.value = new Map()
    isLoading.value = false
    error.value = null
    lastUpdated.value = null
    sortBy.value = 'sortOrder'
    sortOrder.value = 'asc'
  }

  return {
    // State
    categories,
    currentCategory,
    categoryStats,
    isLoading,
    error,
    lastUpdated,
    sortBy,
    sortOrder,

    // Getters
    count,
    rootCategories,
    categoryTree,
    sortedCategories,
    categoryMap,
    getChildren,
    getCategoryPath,

    // Actions
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    updateSortOrder,
    moveCategory,
    fetchCategoryStats,
    fetchAllCategoryStats,
    setCurrentCategory,
    setSortBy,
    setSortOrder,
    getCategoryById,
    clearError,
    $reset,
  }
})
