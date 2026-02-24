<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 搜索相关
const searchQuery = ref('')
const isSearchFocused = ref(false)

// 主题相关
const currentTheme = ref<'light' | 'dark' | 'system'>('system')

// 刷新状态
const isRefreshing = ref(false)

// 用户菜单
const isUserMenuOpen = ref(false)

// 发出事件
const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'search', query: string): void
  (e: 'toggle-sidebar'): void
}>()

// 页面标题
const pageTitle = computed(() => {
  return (route.meta.title as string) || 'RSS Reader'
})

// 刷新
const handleRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  emit('refresh')
  // 模拟刷新延迟
  setTimeout(() => {
    isRefreshing.value = false
  }, 1500)
}

// 搜索
const handleSearch = () => {
  emit('search', searchQuery.value)
}

// 切换主题
const toggleTheme = () => {
  const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
  const currentIndex = themes.indexOf(currentTheme.value)
  currentTheme.value = themes[(currentIndex + 1) % themes.length]

  // 应用主题
  if (currentTheme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (currentTheme.value === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // 跟随系统
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// 获取主题图标
const themeIcon = computed(() => {
  switch (currentTheme.value) {
    case 'dark':
      return 'moon'
    case 'light':
      return 'sun'
    default:
      return 'system'
  }
})

// 切换侧边栏
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

// 用户操作
const handleUserAction = (action: string) => {
  isUserMenuOpen.value = false
  console.log('User action:', action)
}
</script>

<template>
  <header class="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 lg:px-6">
    <!-- 左侧 -->
    <div class="flex items-center gap-4">
      <!-- 移动端菜单按钮 -->
      <button
        class="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        @click="toggleSidebar"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 class="text-lg font-semibold text-neutral-900 hidden sm:block">
        {{ pageTitle }}
      </h1>
    </div>

    <!-- 右侧工具栏 -->
    <div class="flex items-center gap-2 sm:gap-4">
      <!-- 搜索框 -->
      <div class="relative" :class="{ 'w-64': isSearchFocused }">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文章..."
          class="w-40 sm:w-64 pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
          :class="{ 'w-48 sm:w-72': isSearchFocused }"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
          @keyup.enter="handleSearch"
        />
        <svg
          class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <!-- 搜索快捷键提示 -->
        <kbd class="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-neutral-400 bg-neutral-100 border border-neutral-200 rounded">
          /
        </kbd>
      </div>

      <!-- 刷新按钮 -->
      <button
        class="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        :class="{ 'animate-spin': isRefreshing }"
        title="刷新"
        :disabled="isRefreshing"
        @click="handleRefresh"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <!-- 主题切换 -->
      <button
        class="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        title="切换主题"
        @click="toggleTheme"
      >
        <!-- Sun Icon -->
        <svg v-if="themeIcon === 'sun'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon Icon -->
        <svg v-if="themeIcon === 'moon'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <!-- System Icon -->
        <svg v-if="themeIcon === 'system'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </button>

      <!-- 用户菜单 -->
      <div class="relative">
        <button
          class="flex items-center gap-2 p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <svg class="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- 用户下拉菜单 -->
        <transition name="dropdown">
          <div
            v-if="isUserMenuOpen"
            class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50"
          >
            <div class="px-4 py-2 border-b border-neutral-100">
              <p class="text-sm font-medium text-neutral-900">用户</p>
              <p class="text-xs text-neutral-500">user@example.com</p>
            </div>
            <a href="#" class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50" @click.prevent="handleUserAction('profile')">
              个人资料
            </a>
            <a href="#" class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50" @click.prevent="handleUserAction('settings')">
              设置
            </a>
            <hr class="my-2 border-neutral-100" />
            <a href="#" class="block px-4 py-2 text-sm text-error-600 hover:bg-error-50" @click.prevent="handleUserAction('logout')">
              退出登录
            </a>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
