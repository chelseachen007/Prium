<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  try {
    // Supabase 会自动处理 OAuth 回调
    // 等待认证状态初始化完成
    await authStore.initialize()

    if (authStore.isAuthenticated) {
      router.push('/')
    } else {
      // 如果没有认证成功，等待一小段时间再检查
      setTimeout(() => {
        if (authStore.isAuthenticated) {
          router.push('/')
        } else {
          router.push('/login?error=auth_failed')
        }
      }, 1000)
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    router.push('/login?error=auth_failed')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="text-center">
      <div class="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <h2 class="text-xl font-semibold text-gray-900">登录中...</h2>
      <p class="text-gray-500 mt-2">正在验证您的身份，请稍候。</p>
    </div>
  </div>
</template>
