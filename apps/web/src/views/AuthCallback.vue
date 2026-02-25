<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  const token = route.query.token as string
  const userJson = route.query.user as string

  if (token) {
    authStore.setToken(token)

    // 如果有 user 参数，解析并设置用户信息
    if (userJson) {
      try {
        const user = JSON.parse(decodeURIComponent(userJson))
        authStore.setUser(user)
      } catch (e) {
        console.error('Failed to parse user info:', e)
      }
    }

    router.push('/')
  } else {
    router.push('/login?error=no_token')
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
