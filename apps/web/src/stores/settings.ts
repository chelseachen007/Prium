/**
 * 设置状态管理
 * @module stores/settings
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '@/composables/useSupabase'

/**
 * 主题类型
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 文章列表视图模式
 */
export type ViewMode = 'list' | 'card' | 'compact'

/**
 * 显示设置接口
 */
export interface DisplaySettings {
  /** 文章列表视图模式 */
  viewMode: ViewMode

  /** 每页显示文章数 */
  articlesPerPage: number

  /** 是否显示文章摘要 */
  showSummary: boolean

  /** 是否显示文章图片 */
  showImages: boolean

  /** 是否显示文章作者 */
  showAuthor: boolean

  /** 是否显示阅读时间 */
  showReadTime: boolean

  /** 是否默认展开文章内容 */
  expandArticle: boolean

  /** 文章内容字体大小 */
  fontSize: 'small' | 'medium' | 'large'

  /** 文章内容字体 */
  fontFamily: string
}

/**
 * 阅读设置接口
 */
export interface ReadingSettings {
  /** 是否自动标记已读 */
  autoMarkRead: boolean

  /** 滚动到底部时标记已读 */
  scrollMarkRead: boolean

  /** 自动进入下一篇未读文章 */
  autoNextArticle: boolean

  /** 默认显示原始内容还是阅读模式 */
  defaultContentMode: 'original' | 'readable'
}

/**
 * 通知设置接口
 */
export interface NotificationSettings {
  /** 是否启用桌面通知 */
  enabled: boolean

  /** 新文章通知 */
  newArticles: boolean

  /** 每日摘要通知 */
  dailyDigest: boolean

  /** 通知时间（小时） */
  digestTime: number
}

/**
 * 同步设置接口
 */
export interface SyncSettings {
  /** 自动刷新间隔（分钟，0 表示禁用） */
  autoRefreshInterval: number

  /** 是否在启动时刷新 */
  refreshOnStartup: boolean

  /** 后台同步 */
  backgroundSync: boolean
}

/**
 * 设置 Store
 *
 * 管理主题设置和显示设置，使用 localStorage 持久化
 */
export const useSettingsStore = defineStore('settings', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 主题模式 */
  const theme = ref<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'system'
  )

  /** 显示设置 */
  const displaySettings = ref<DisplaySettings>({
    viewMode: (localStorage.getItem('viewMode') as ViewMode) || 'list',
    articlesPerPage: parseInt(localStorage.getItem('articlesPerPage') || '20'),
    showSummary: localStorage.getItem('showSummary') !== 'false',
    showImages: localStorage.getItem('showImages') !== 'false',
    showAuthor: localStorage.getItem('showAuthor') !== 'false',
    showReadTime: localStorage.getItem('showReadTime') !== 'false',
    expandArticle: localStorage.getItem('expandArticle') === 'true',
    fontSize: (localStorage.getItem('fontSize') as 'small' | 'medium' | 'large') || 'medium',
    fontFamily: localStorage.getItem('fontFamily') || 'system-ui',
  })

  /** 阅读设置 */
  const readingSettings = ref<ReadingSettings>({
    autoMarkRead: localStorage.getItem('autoMarkRead') !== 'false',
    scrollMarkRead: localStorage.getItem('scrollMarkRead') === 'true',
    autoNextArticle: localStorage.getItem('autoNextArticle') === 'true',
    defaultContentMode: (localStorage.getItem('defaultContentMode') as 'original' | 'readable') || 'original',
  })

  /** 通知设置 */
  const notificationSettings = ref<NotificationSettings>({
    enabled: localStorage.getItem('notificationEnabled') === 'true',
    newArticles: localStorage.getItem('notifyNewArticles') === 'true',
    dailyDigest: localStorage.getItem('notifyDailyDigest') === 'true',
    digestTime: parseInt(localStorage.getItem('digestTime') || '9'),
  })

  /** 同步设置 */
  const syncSettings = ref<SyncSettings>({
    autoRefreshInterval: parseInt(localStorage.getItem('autoRefreshInterval') || '30'),
    refreshOnStartup: localStorage.getItem('refreshOnStartup') !== 'false',
    backgroundSync: localStorage.getItem('backgroundSync') === 'true',
  })

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /** 是否为深色模式 */
  const isDarkMode = computed(() => {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  // ============================================================================
  // Watchers - 持久化设置到 localStorage
  // ============================================================================

  watch(theme, (value) => {
    localStorage.setItem('theme', value)
    applyTheme(value)
  })

  watch(displaySettings, (value) => {
    localStorage.setItem('viewMode', value.viewMode)
    localStorage.setItem('articlesPerPage', String(value.articlesPerPage))
    localStorage.setItem('showSummary', String(value.showSummary))
    localStorage.setItem('showImages', String(value.showImages))
    localStorage.setItem('showAuthor', String(value.showAuthor))
    localStorage.setItem('showReadTime', String(value.showReadTime))
    localStorage.setItem('expandArticle', String(value.expandArticle))
    localStorage.setItem('fontSize', value.fontSize)
    localStorage.setItem('fontFamily', value.fontFamily)
  }, { deep: true })

  watch(readingSettings, (value) => {
    localStorage.setItem('autoMarkRead', String(value.autoMarkRead))
    localStorage.setItem('scrollMarkRead', String(value.scrollMarkRead))
    localStorage.setItem('autoNextArticle', String(value.autoNextArticle))
    localStorage.setItem('defaultContentMode', value.defaultContentMode)
  }, { deep: true })

  watch(notificationSettings, (value) => {
    localStorage.setItem('notificationEnabled', String(value.enabled))
    localStorage.setItem('notifyNewArticles', String(value.newArticles))
    localStorage.setItem('notifyDailyDigest', String(value.dailyDigest))
    localStorage.setItem('digestTime', String(value.digestTime))
  }, { deep: true })

  watch(syncSettings, (value) => {
    localStorage.setItem('autoRefreshInterval', String(value.autoRefreshInterval))
    localStorage.setItem('refreshOnStartup', String(value.refreshOnStartup))
    localStorage.setItem('backgroundSync', String(value.backgroundSync))
  }, { deep: true })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 应用主题
   */
  function applyTheme(mode: ThemeMode): void {
    let isDark = mode === 'dark'

    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  /**
   * 设置主题
   */
  function setTheme(mode: ThemeMode): void {
    theme.value = mode
  }

  /**
   * 切换主题
   */
  function toggleTheme(): void {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = modes.indexOf(theme.value)
    theme.value = modes[(currentIndex + 1) % modes.length]
  }

  /**
   * 更新显示设置
   */
  function updateDisplaySettings(settings: Partial<DisplaySettings>): void {
    displaySettings.value = { ...displaySettings.value, ...settings }
  }

  /**
   * 更新阅读设置
   */
  function updateReadingSettings(settings: Partial<ReadingSettings>): void {
    readingSettings.value = { ...readingSettings.value, ...settings }
  }

  /**
   * 更新通知设置
   */
  function updateNotificationSettings(settings: Partial<NotificationSettings>): void {
    notificationSettings.value = { ...notificationSettings.value, ...settings }

    // 如果启用通知，请求权限
    if (settings.enabled && 'Notification' in window) {
      Notification.requestPermission()
    }
  }

  /**
   * 更新同步设置
   */
  function updateSyncSettings(settings: Partial<SyncSettings>): void {
    syncSettings.value = { ...syncSettings.value, ...settings }
  }

  /**
   * 同步设置到 Supabase
   */
  async function syncSettingsToServer(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false

      const { error: supabaseError } = await supabase
        .from('user_preferences')
        .upsert({
          userId: user.id,
          displaySettings: displaySettings.value,
          readingSettings: readingSettings.value,
          notificationSettings: notificationSettings.value,
          syncSettings: syncSettings.value,
          updatedAt: new Date().toISOString(),
        })

      if (supabaseError) {
        throw new Error(supabaseError.message)
      }

      return true
    } catch (e) {
      console.error('同步设置失败:', e)
      return false
    }
  }

  /**
   * 从 Supabase 加载设置
   */
  async function loadSettingsFromServer(): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error: supabaseError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('userId', user.id)
        .single()

      if (supabaseError && supabaseError.code !== 'PGRST116') {
        throw new Error(supabaseError.message)
      }

      if (data) {
        if (data.displaySettings) {
          displaySettings.value = {
            ...displaySettings.value,
            ...data.displaySettings,
          }
        }
        if (data.readingSettings) {
          readingSettings.value = {
            ...readingSettings.value,
            ...data.readingSettings,
          }
        }
        if (data.notificationSettings) {
          notificationSettings.value = {
            ...notificationSettings.value,
            ...data.notificationSettings,
          }
        }
        if (data.syncSettings) {
          syncSettings.value = {
            ...syncSettings.value,
            ...data.syncSettings,
          }
        }
      }
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '加载设置失败'
      error.value = message
      console.error('加载设置失败:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重置所有设置
   */
  function resetAllSettings(): void {
    theme.value = 'system'
    displaySettings.value = {
      viewMode: 'list',
      articlesPerPage: 20,
      showSummary: true,
      showImages: true,
      showAuthor: true,
      showReadTime: true,
      expandArticle: false,
      fontSize: 'medium',
      fontFamily: 'system-ui',
    }
    readingSettings.value = {
      autoMarkRead: true,
      scrollMarkRead: false,
      autoNextArticle: false,
      defaultContentMode: 'original',
    }
    notificationSettings.value = {
      enabled: false,
      newArticles: false,
      dailyDigest: false,
      digestTime: 9,
    }
    syncSettings.value = {
      autoRefreshInterval: 30,
      refreshOnStartup: true,
      backgroundSync: false,
    }
  }

  /**
   * 初始化设置
   */
  async function initialize(): Promise<void> {
    // 应用主题
    applyTheme(theme.value)

    // 监听系统主题变化
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (theme.value === 'system') {
          applyTheme('system')
        }
      })

    // 从服务器加载设置
    await loadSettingsFromServer()
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
    theme.value = 'system'
    isLoading.value = false
    error.value = null
    resetAllSettings()
  }

  return {
    // State
    theme,
    displaySettings,
    readingSettings,
    notificationSettings,
    syncSettings,
    isLoading,
    error,

    // Getters
    isDarkMode,

    // Actions
    setTheme,
    toggleTheme,
    updateDisplaySettings,
    updateReadingSettings,
    updateNotificationSettings,
    updateSyncSettings,
    syncSettingsToServer,
    loadSettingsFromServer,
    resetAllSettings,
    initialize,
    clearError,
    $reset,
  }
})
