/**
 * 认证状态管理
 * @module stores/auth
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { User, Session } from '@supabase/supabase-js'
import type { User as AppUser } from '@/types'

/**
 * 认证 Store
 *
 * 使用 Supabase Auth 管理用户认证状态
 */
export const useAuthStore = defineStore('auth', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** 当前用户 */
  const user = ref<AppUser | null>(null)

  /** Supabase 会话 */
  const session = ref<Session | null>(null)

  /** 是否正在加载 */
  const isLoading = ref(true)

  /** 错误信息 */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /** 是否已认证 */
  const isAuthenticated = computed(() => !!user.value && !!session.value)

  /** 用户 ID */
  const userId = computed(() => user.value?.id)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 初始化认证状态
   * 监听 Supabase Auth 状态变化
   */
  async function initialize(): Promise<void> {
    isLoading.value = true

    try {
      // 获取当前会话
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (currentSession) {
        session.value = currentSession
        user.value = mapSupabaseUser(currentSession.user)
      }

      // 监听认证状态变化
      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        if (newSession?.user) {
          user.value = mapSupabaseUser(newSession.user)
        } else {
          user.value = null
        }
      })
    } catch (e) {
      console.error('初始化认证状态失败:', e)
      error.value = '初始化认证状态失败'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 使用邮箱密码登录
   */
  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (data.session && data.user) {
        session.value = data.session
        user.value = mapSupabaseUser(data.user)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '登录失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 使用邮箱密码注册
   */
  async function register(email: string, password: string, name?: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (data.session && data.user) {
        session.value = data.session
        user.value = mapSupabaseUser(data.user)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '注册失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 使用 GitHub OAuth 登录
   */
  async function loginWithGitHub(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }
      // OAuth 登录会跳转，不需要更新状态
    } catch (e) {
      const message = e instanceof Error ? e.message : 'GitHub 登录失败'
      error.value = message
      isLoading.value = false
      throw new Error(message)
    }
  }

  /**
   * 使用 Google OAuth 登录
   */
  async function loginWithGoogle(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google 登录失败'
      error.value = message
      isLoading.value = false
      throw new Error(message)
    }
  }

  /**
   * 登出
   */
  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.signOut()

      if (authError) {
        throw new Error(authError.message)
      }

      user.value = null
      session.value = null
    } catch (e) {
      const message = e instanceof Error ? e.message : '登出失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 发送密码重置邮件
   */
  async function resetPassword(email: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (authError) {
        throw new Error(authError.message)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '发送重置邮件失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新密码
   */
  async function updatePassword(newPassword: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (authError) {
        throw new Error(authError.message)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新密码失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新用户资料
   */
  async function updateProfile(data: { name?: string; avatar?: string }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          avatar_url: data.avatar,
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }

      // 更新本地用户状态
      if (user.value) {
        user.value = {
          ...user.value,
          name: data.name ?? user.value.name,
          avatar: data.avatar ?? user.value.avatar,
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新资料失败'
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
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
    user.value = null
    session.value = null
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    user,
    session,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    userId,

    // Actions
    initialize,
    login,
    register,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    clearError,
    $reset,
  }
})

/**
 * 将 Supabase 用户映射为应用用户
 */
function mapSupabaseUser(supabaseUser: User): AppUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
    avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
    createdAt: supabaseUser.created_at,
  }
}
