/**
 * UI 状态管理
 * @module stores/ui
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 当前视图类型
 */
export type CurrentView =
  | 'home'
  | 'all'
  | 'unread'
  | 'starred'
  | 'saved'
  | 'category'
  | 'subscription'
  | 'search'

/**
 * 侧边栏状态
 */
export interface SidebarState {
  /** 是否展开 */
  isExpanded: boolean
  /** 当前宽度 */
  width: number
  /** 是否正在调整大小 */
  isResizing: boolean
}

/**
 * 模态框状态
 */
export interface ModalState {
  /** 是否可见 */
  isVisible: boolean
  /** 模态框类型 */
  type: string | null
  /** 模态框数据 */
  data?: Record<string, unknown>
}

/**
 * Toast 通知
 */
export interface ToastNotification {
  /** 通知 ID */
  id: string
  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error'
  /** 通知标题 */
  title?: string
  /** 通知内容 */
  message: string
  /** 显示时长（毫秒，0 表示不自动关闭） */
  duration: number
  /** 创建时间 */
  createdAt: Date
}

/**
 * 确认对话框选项
 */
export interface ConfirmDialogOptions {
  /** 标题 */
  title: string
  /** 内容 */
  message: string
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 确认按钮类型 */
  confirmType?: 'primary' | 'danger' | 'warning'
  /** 是否显示取消按钮 */
  showCancel?: boolean
}

/**
 * UI Store
 *
 * 管理 UI 状态，包括侧边栏、当前视图、模态框和通知
 *
 * @example
 * ```typescript
 * const uiStore = useUIStore()
 *
 * // 切换侧边栏
 * uiStore.toggleSidebar()
 *
 * // 显示 Toast
 * uiStore.showToast({ message: '操作成功', type: 'success' })
 *
 * // 显示确认对话框
 * const result = await uiStore.showConfirm({
 *   title: '确认删除',
 *   message: '确定要删除这个订阅吗？'
 * })
 * ```
 */
export const useUIStore = defineStore('ui', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 侧边栏状态 */
  const sidebar = ref<SidebarState>({
    isExpanded: true,
    width: 280,
    isResizing: false,
  })

  /** 移动端侧边栏是否显示 */
  const isMobileSidebarOpen = ref(false)

  /** 当前视图 */
  const currentView = ref<CurrentView>('home')

  /** 当前视图参数 */
  const currentViewParams = ref<Record<string, string>>({})

  /** 模态框状态 */
  const modal = ref<ModalState>({
    isVisible: false,
    type: null,
    data: undefined,
  })

  /** Toast 通知列表 */
  const toasts = ref<ToastNotification[]>([])

  /** 确认对话框状态 */
  const confirmDialog = ref<{
    isVisible: boolean
    options: ConfirmDialogOptions
    resolve: ((value: boolean) => void) | null
  }>({
    isVisible: false,
    options: {
      title: '',
      message: '',
    },
    resolve: null,
  })

  /** 是否正在全局加载 */
  const isGlobalLoading = ref(false)

  /** 全局加载文本 */
  const globalLoadingText = ref('')

  /** 阅读面板是否展开 */
  const isReadingPanelOpen = ref(false)

  /** 阅读面板宽度 */
  const readingPanelWidth = ref(500)

  /** 是否全屏阅读 */
  const isFullscreenReading = ref(false)

  /** 搜索面板是否打开 */
  const isSearchPanelOpen = ref(false)

  /** 搜索关键词 */
  const searchQuery = ref('')

  // ============================================================================
  // Getters
  // ============================================================================

  /** 是否有活动的模态框 */
  const hasActiveModal = computed(() => modal.value.isVisible)

  /** 是否有活动的确认对话框 */
  const hasActiveConfirmDialog = computed(() => confirmDialog.value.isVisible)

  /** 是否有任何浮层打开 */
  const hasAnyOverlay = computed(() => {
    return (
      hasActiveModal.value ||
      hasActiveConfirmDialog.value ||
      isMobileSidebarOpen.value ||
      isSearchPanelOpen.value
    )
  })

  /** Toast 数量 */
  const toastCount = computed(() => toasts.value.length)

  // ============================================================================
  // Actions
  // ============================================================================

  // ============ 侧边栏操作 ============

  /**
   * 切换侧边栏展开/折叠
   */
  function toggleSidebar(): void {
    sidebar.value.isExpanded = !sidebar.value.isExpanded
  }

  /**
   * 展开侧边栏
   */
  function expandSidebar(): void {
    sidebar.value.isExpanded = true
  }

  /**
   * 折叠侧边栏
   */
  function collapseSidebar(): void {
    sidebar.value.isExpanded = false
  }

  /**
   * 设置侧边栏宽度
   */
  function setSidebarWidth(width: number): void {
    sidebar.value.width = Math.min(Math.max(width, 200), 500)
  }

  /**
   * 开始调整侧边栏大小
   */
  function startResizingSidebar(): void {
    sidebar.value.isResizing = true
  }

  /**
   * 结束调整侧边栏大小
   */
  function stopResizingSidebar(): void {
    sidebar.value.isResizing = false
  }

  /**
   * 切换移动端侧边栏
   */
  function toggleMobileSidebar(): void {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value
  }

  /**
   * 打开移动端侧边栏
   */
  function openMobileSidebar(): void {
    isMobileSidebarOpen.value = true
  }

  /**
   * 关闭移动端侧边栏
   */
  function closeMobileSidebar(): void {
    isMobileSidebarOpen.value = false
  }

  // ============ 视图操作 ============

  /**
   * 设置当前视图
   */
  function setCurrentView(
    view: CurrentView,
    params?: Record<string, string>
  ): void {
    currentView.value = view
    currentViewParams.value = params || {}
  }

  /**
   * 导航到首页
   */
  function navigateToHome(): void {
    setCurrentView('home')
  }

  /**
   * 导航到所有文章
   */
  function navigateToAll(): void {
    setCurrentView('all')
  }

  /**
   * 导航到未读文章
   */
  function navigateToUnread(): void {
    setCurrentView('unread')
  }

  /**
   * 导航到收藏
   */
  function navigateToStarred(): void {
    setCurrentView('starred')
  }

  /**
   * 导航到已保存
   */
  function navigateToSaved(): void {
    setCurrentView('saved')
  }

  /**
   * 导航到分类
   */
  function navigateToCategory(categoryId: string): void {
    setCurrentView('category', { categoryId })
  }

  /**
   * 导航到订阅
   */
  function navigateToSubscription(subscriptionId: string): void {
    setCurrentView('subscription', { subscriptionId })
  }

  /**
   * 导航到搜索
   */
  function navigateToSearch(query: string): void {
    searchQuery.value = query
    setCurrentView('search', { query })
  }

  // ============ 模态框操作 ============

  /**
   * 打开模态框
   */
  function openModal(type: string, data?: Record<string, unknown>): void {
    modal.value = {
      isVisible: true,
      type,
      data,
    }
  }

  /**
   * 关闭模态框
   */
  function closeModal(): void {
    modal.value = {
      isVisible: false,
      type: null,
      data: undefined,
    }
  }

  /**
   * 打开添加订阅模态框
   */
  function openAddSubscriptionModal(categoryId?: string): void {
    openModal('add-subscription', categoryId ? { categoryId } : undefined)
  }

  /**
   * 打开添加分类模态框
   */
  function openAddCategoryModal(parentId?: string): void {
    openModal('add-category', parentId ? { parentId } : undefined)
  }

  /**
   * 打开编辑订阅模态框
   */
  function openEditSubscriptionModal(subscriptionId: string): void {
    openModal('edit-subscription', { subscriptionId })
  }

  /**
   * 打开编辑分类模态框
   */
  function openEditCategoryModal(categoryId: string): void {
    openModal('edit-category', { categoryId })
  }

  /**
   * 打开导入订阅模态框
   */
  function openImportModal(): void {
    openModal('import-subscriptions')
  }

  /**
   * 打开 Obsidian 设置模态框
   */
  function openObsidianSettingsModal(): void {
    openModal('obsidian-settings')
  }

  // ============ Toast 通知操作 ============

  /**
   * 添加 Toast 通知
   */
  function showToast(notification: {
    type?: 'info' | 'success' | 'warning' | 'error'
    title?: string
    message: string
    duration?: number
  }): string {
    const id = crypto.randomUUID()
    const toast: ToastNotification = {
      id,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      duration: notification.duration ?? 5000,
      createdAt: new Date(),
    }

    toasts.value.push(toast)

    // 自动移除
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  /**
   * 移除 Toast 通知
   */
  function removeToast(id: string): void {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * 清除所有 Toast 通知
   */
  function clearAllToasts(): void {
    toasts.value = []
  }

  /**
   * 显示成功通知
   */
  function showSuccess(message: string, title?: string): string {
    return showToast({ type: 'success', message, title })
  }

  /**
   * 显示错误通知
   */
  function showError(message: string, title?: string): string {
    return showToast({ type: 'error', message, title })
  }

  /**
   * 显示警告通知
   */
  function showWarning(message: string, title?: string): string {
    return showToast({ type: 'warning', message, title })
  }

  /**
   * 显示信息通知
   */
  function showInfo(message: string, title?: string): string {
    return showToast({ type: 'info', message, title })
  }

  // ============ 确认对话框操作 ============

  /**
   * 显示确认对话框
   */
  function showConfirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      confirmDialog.value = {
        isVisible: true,
        options: {
          ...options,
          confirmText: options.confirmText || '确认',
          cancelText: options.cancelText || '取消',
          confirmType: options.confirmType || 'primary',
          showCancel: options.showCancel ?? true,
        },
        resolve,
      }
    })
  }

  /**
   * 确认对话框 - 确认
   */
  function confirmDialogConfirm(): void {
    if (confirmDialog.value.resolve) {
      confirmDialog.value.resolve(true)
    }
    confirmDialog.value = {
      isVisible: false,
      options: { title: '', message: '' },
      resolve: null,
    }
  }

  /**
   * 确认对话框 - 取消
   */
  function confirmDialogCancel(): void {
    if (confirmDialog.value.resolve) {
      confirmDialog.value.resolve(false)
    }
    confirmDialog.value = {
      isVisible: false,
      options: { title: '', message: '' },
      resolve: null,
    }
  }

  // ============ 全局加载操作 ============

  /**
   * 显示全局加载
   */
  function showGlobalLoading(text = '加载中...'): void {
    isGlobalLoading.value = true
    globalLoadingText.value = text
  }

  /**
   * 隐藏全局加载
   */
  function hideGlobalLoading(): void {
    isGlobalLoading.value = false
    globalLoadingText.value = ''
  }

  // ============ 阅读面板操作 ============

  /**
   * 打开阅读面板
   */
  function openReadingPanel(): void {
    isReadingPanelOpen.value = true
  }

  /**
   * 关闭阅读面板
   */
  function closeReadingPanel(): void {
    isReadingPanelOpen.value = false
    isFullscreenReading.value = false
  }

  /**
   * 设置阅读面板宽度
   */
  function setReadingPanelWidth(width: number): void {
    readingPanelWidth.value = Math.min(Math.max(width, 300), 800)
  }

  /**
   * 切换全屏阅读
   */
  function toggleFullscreenReading(): void {
    isFullscreenReading.value = !isFullscreenReading.value
  }

  // ============ 搜索操作 ============

  /**
   * 打开搜索面板
   */
  function openSearchPanel(): void {
    isSearchPanelOpen.value = true
  }

  /**
   * 关闭搜索面板
   */
  function closeSearchPanel(): void {
    isSearchPanelOpen.value = false
  }

  /**
   * 切换搜索面板
   */
  function toggleSearchPanel(): void {
    isSearchPanelOpen.value = !isSearchPanelOpen.value
  }

  /**
   * 设置搜索关键词
   */
  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  /**
   * 关闭所有浮层
   */
  function closeAllOverlays(): void {
    if (hasActiveModal.value) {
      closeModal()
    }
    if (hasActiveConfirmDialog.value) {
      confirmDialogCancel()
    }
    isMobileSidebarOpen.value = false
    isSearchPanelOpen.value = false
  }

  /**
   * 重置 Store
   */
  function $reset(): void {
    sidebar.value = {
      isExpanded: true,
      width: 280,
      isResizing: false,
    }
    isMobileSidebarOpen.value = false
    currentView.value = 'home'
    currentViewParams.value = {}
    modal.value = {
      isVisible: false,
      type: null,
      data: undefined,
    }
    toasts.value = []
    confirmDialog.value = {
      isVisible: false,
      options: { title: '', message: '' },
      resolve: null,
    }
    isGlobalLoading.value = false
    globalLoadingText.value = ''
    isReadingPanelOpen.value = false
    readingPanelWidth.value = 500
    isFullscreenReading.value = false
    isSearchPanelOpen.value = false
    searchQuery.value = ''
  }

  return {
    // State
    sidebar,
    isMobileSidebarOpen,
    currentView,
    currentViewParams,
    modal,
    toasts,
    confirmDialog,
    isGlobalLoading,
    globalLoadingText,
    isReadingPanelOpen,
    readingPanelWidth,
    isFullscreenReading,
    isSearchPanelOpen,
    searchQuery,

    // Getters
    hasActiveModal,
    hasActiveConfirmDialog,
    hasAnyOverlay,
    toastCount,

    // Actions - Sidebar
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    setSidebarWidth,
    startResizingSidebar,
    stopResizingSidebar,
    toggleMobileSidebar,
    openMobileSidebar,
    closeMobileSidebar,

    // Actions - View
    setCurrentView,
    navigateToHome,
    navigateToAll,
    navigateToUnread,
    navigateToStarred,
    navigateToSaved,
    navigateToCategory,
    navigateToSubscription,
    navigateToSearch,

    // Actions - Modal
    openModal,
    closeModal,
    openAddSubscriptionModal,
    openAddCategoryModal,
    openEditSubscriptionModal,
    openEditCategoryModal,
    openImportModal,
    openObsidianSettingsModal,

    // Actions - Toast
    showToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Actions - Confirm Dialog
    showConfirm,
    confirmDialogConfirm,
    confirmDialogCancel,

    // Actions - Global Loading
    showGlobalLoading,
    hideGlobalLoading,

    // Actions - Reading Panel
    openReadingPanel,
    closeReadingPanel,
    setReadingPanelWidth,
    toggleFullscreenReading,

    // Actions - Search
    openSearchPanel,
    closeSearchPanel,
    toggleSearchPanel,
    setSearchQuery,

    // Actions - Utility
    closeAllOverlays,
    $reset,
  }
})
