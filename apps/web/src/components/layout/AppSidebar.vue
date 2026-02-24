<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Category } from '@/types'

const route = useRoute()
const router = useRouter()
const api = useApi()

// 侧边栏状态
const isSidebarCollapsed = ref(false)
const isMobileOpen = ref(false)

// 从 API 加载分类列表
const categories = ref<Category[]>([])
const isLoadingCategories = ref(false)

const loadCategories = async () => {
  isLoadingCategories.value = true
  try {
    const response = await api.get<Category[]>('/categories')
    if (response.success && response.data) {
      categories.value = response.data.map(c => ({
        ...c,
        isExpanded: true,
      }))
    }
  } catch (error) {
    console.error('Load categories error:', error)
  } finally {
    isLoadingCategories.value = false
  }
}

onMounted(() => {
  loadCategories()
})

// 暴露刷新方法给父组件
defineExpose({
  loadCategories,
  toggleMobileSidebar,
})

// 导航菜单项
const navItems = computed(() => [
  { path: '/', name: '首页', icon: 'home' },
  { path: '/subscriptions', name: '订阅', icon: 'rss' },
  { path: '/starred', name: '收藏', icon: 'star' },
  { path: '/settings', name: '设置', icon: 'settings' },
])

// 判断当前路由是否激活
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 切换侧边栏
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 切换移动端侧边栏
const toggleMobileSidebar = () => {
  isMobileOpen.value = !isMobileOpen.value
}

// 切换分类展开状态
const toggleCategory = (category: Category) => {
  category.isExpanded = !category.isExpanded
}

// 查看分类下的订阅
const viewCategory = (categoryId: string) => {
  router.push({ path: '/', query: { category: categoryId } })
  isMobileOpen.value = false
}

// 导航到页面
const navigateTo = (path: string) => {
  router.push(path)
  isMobileOpen.value = false
}

// 显示添加订阅弹窗
const emit = defineEmits<{
  (e: 'add-subscription'): void
}>()

const showAddSubscription = () => {
  emit('add-subscription')
}

// 暴露方法给父组件
defineExpose({
  toggleMobileSidebar,
})
</script>

<template>
  <!-- 移动端遮罩 -->
  <div
    v-if="isMobileOpen"
    class="fixed inset-0 bg-black/50 z-40 lg:hidden"
    @click="toggleMobileSidebar"
  ></div>

  <!-- 侧边栏 -->
  <aside
    class="flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 fixed lg:relative z-50 h-full"
    :class="[
      isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
      isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <!-- Logo 区域 -->
    <div class="flex items-center h-16 px-4 border-b border-neutral-200">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </div>
        <span v-if="!isSidebarCollapsed" class="text-lg font-semibold text-neutral-900">
          RSS Reader
        </span>
      </div>
      <!-- 移动端关闭按钮 -->
      <button class="lg:hidden ml-auto p-2 text-neutral-500 hover:text-neutral-700" @click="toggleMobileSidebar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 新建订阅按钮 -->
    <div class="p-3" v-if="!isSidebarCollapsed">
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        @click="showAddSubscription"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建订阅
      </button>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-1">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar-item"
        :class="{ active: isActive(item.path) }"
        @click="isMobileOpen = false"
      >
        <!-- Home Icon -->
        <svg v-if="item.icon === 'home'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <!-- RSS Icon -->
        <svg v-if="item.icon === 'rss'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
        <!-- Star Icon -->
        <svg v-if="item.icon === 'star'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <!-- Settings Icon -->
        <svg v-if="item.icon === 'settings'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span v-if="!isSidebarCollapsed">{{ item.name }}</span>
      </router-link>

      <!-- 分类列表 -->
      <div v-if="!isSidebarCollapsed" class="pt-4 mt-4 border-t border-neutral-200">
        <div class="flex items-center justify-between px-3 mb-2">
          <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">分类</span>
        </div>
        <div v-for="category in categories" :key="category.id" class="mb-1">
          <button
            class="w-full sidebar-item justify-between"
            @click="toggleCategory(category)"
          >
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>{{ category.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 text-xs bg-neutral-100 text-neutral-500 rounded">
                {{ category.unreadCount }}
              </span>
              <svg
                class="w-4 h-4 text-neutral-400 transition-transform"
                :class="{ 'rotate-180': category.isExpanded }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          <!-- 子分类/订阅列表 -->
          <div v-if="category.isExpanded" class="ml-4 mt-1 space-y-1">
            <button
              class="w-full text-left px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
              @click="viewCategory(category.id)"
            >
              查看全部 ({{ category.subscriptionCount }})
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 底部折叠按钮 -->
    <div class="p-3 border-t border-neutral-200 hidden lg:block">
      <button
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        @click="toggleSidebar"
      >
        <svg
          class="w-5 h-5 transition-transform duration-300"
          :class="{ 'rotate-180': isSidebarCollapsed }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span v-if="!isSidebarCollapsed">收起侧边栏</span>
      </button>
    </div>
  </aside>
</template>
