<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(() => {
  const token = route.query.token as string
  if (token) {
    authStore.setToken(token)
    router.push('/')
  } else {
    router.push('/login?error=no_token')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h2 class="text-xl font-semibold">登录中...</h2>
      <p class="text-gray-500">正在验证您的身份，请稍候。</p>
    </div>
  </div>
</template>
