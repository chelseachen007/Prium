<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AddSubscription from '@/components/subscription/AddSubscription.vue'

// 侧边栏引用
const sidebarRef = ref<InstanceType<typeof AppSidebar> | null>(null)

// 添加订阅弹窗
const showAddSubscription = ref(false)

// 处理添加订阅事件
const handleAddSubscription = () => {
  showAddSubscription.value = true
}

// 处理订阅提交
const handleSubscriptionSubmit = (data: { url: string; categoryId?: string; autoDiscover: boolean }) => {
  console.log('Add subscription:', data)
  // TODO: 调用 API 添加订阅
}

// 处理刷新
const handleRefresh = () => {
  console.log('Refresh')
  // TODO: 刷新数据
}

// 处理搜索
const handleSearch = (query: string) => {
  console.log('Search:', query)
  // TODO: 搜索文章
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarRef.value?.toggleMobileSidebar()
}
</script>

<template>
  <div class="flex h-screen bg-neutral-50">
    <!-- 侧边栏 -->
    <AppSidebar ref="sidebarRef" @add-subscription="handleAddSubscription" />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 头部 -->
      <AppHeader
        @refresh="handleRefresh"
        @search="handleSearch"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- 页面内容 -->
      <div class="flex-1 overflow-y-auto p-4 lg:p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 添加订阅弹窗 -->
    <AddSubscription
      v-model="showAddSubscription"
      @submit="handleSubscriptionSubmit"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
