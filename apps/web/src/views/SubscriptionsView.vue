<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useCategoryStore } from '@/stores/categories'
import SubscriptionList from '@/components/subscription/SubscriptionList.vue'
import AddSubscription from '@/components/subscription/AddSubscription.vue'
import ImportOPML from '@/components/subscription/ImportOPML.vue'
import EditSubscription from '@/components/subscription/EditSubscription.vue'
import type { Subscription } from '@/types'

const router = useRouter()
const subscriptionStore = useSubscriptionStore()
const categoryStore = useCategoryStore()

// 注入刷新侧边栏的方法
const refreshSidebar = inject<() => void>('refreshSidebar')

// 弹窗状态
const showAddSubscription = ref(false)
const showImportOPML = ref(false)
const showEditSubscription = ref(false)
const editingSubscription = ref<Subscription | null>(null)

// 统计信息
const stats = computed(() => ({
  total: subscriptionStore.subscriptions.length,
  active: subscriptionStore.subscriptions.filter(s => s.isActive).length,
  totalUnread: subscriptionStore.subscriptions.reduce((sum, s) => sum + (s.unreadCount ?? 0), 0),
}))

// 加载数据
const loadData = async () => {
  await Promise.all([
    categoryStore.fetchCategories(),
    subscriptionStore.fetchSubscriptions(),
  ])
}

onMounted(() => {
  loadData()
})

// 添加订阅
const handleAddSubscription = async (data: { url: string; categoryId?: string; autoDiscover: boolean }) => {
  console.log('Add subscription:', data)

  await subscriptionStore.createSubscription({
    feedUrl: data.url,
    categoryId: data.categoryId,
  })

  // 重新加载数据
  await loadData()
}

// 编辑订阅
const handleEdit = (id: string) => {
  const subscription = subscriptionStore.subscriptions.find(s => s.id === id)
  if (subscription) {
    editingSubscription.value = subscription
    showEditSubscription.value = true
  }
}

// 编辑保存完成
const handleEditSaved = () => {
  loadData()
}

// 删除订阅
const handleDelete = async (id: string) => {
  await subscriptionStore.deleteSubscription(id)
  // 刷新侧边栏（分类和未读数）
  refreshSidebar?.()
}

// 切换订阅状态
const handleToggleActive = async (id: string) => {
  const subscription = subscriptionStore.subscriptions.find(s => s.id === id)
  if (!subscription) return

  await subscriptionStore.updateSubscription(id, {
    isActive: !subscription.isActive,
  })
}

// 刷新订阅
const handleRefresh = async (id: string) => {
  console.log('Refresh subscription:', id)
  await subscriptionStore.refreshSubscription(id)
  // 重新加载数据
  await loadData()
}

// 批量删除订阅
const handleBatchDelete = async (ids: string[]) => {
  // 并行删除所有选中的订阅
  await Promise.all(ids.map(id => subscriptionStore.deleteSubscription(id)))
  // 刷新侧边栏（分类和未读数）
  refreshSidebar?.()
}

// 重新排序
const handleReorder = (ids: string[]) => {
  console.log('Reorder subscriptions:', ids)
  // TODO: 调用 API 保存排序
}

// OPML 导入
const handleImportOPML = () => {
  showImportOPML.value = true
}

// 处理 OPML 导入数据
const handleOPMLImport = async (data: { subscriptions: Array<{ title: string; url: string; category?: string }> }) => {
  console.log('Import OPML data:', data)
  // 导入完成后重新加载数据
  await loadData()
  // 刷新侧边栏（分类和未读数）
  refreshSidebar?.()
}

// OPML 导出
const handleExportOPML = async () => {
  console.log('Export OPML')
  const blob = await subscriptionStore.exportSubscriptions()
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscriptions.opml'
    a.click()
    URL.revokeObjectURL(url)
  }
}

// 选择订阅
const handleSelect = (id: string) => {
  router.push({
    name: 'home',
    query: { subscription: id }
  })
}

// 重命名分类
const handleRenameCategory = async (id: string) => {
  const category = categoryStore.categories.find(c => c.id === id)
  if (!category) return

  const newName = prompt('请输入新的分类名称', category.name)
  if (newName && newName !== category.name) {
    await categoryStore.updateCategory(id, { name: newName })
    // 重新加载数据
    await loadData()
    refreshSidebar?.()
  }
}

// 删除分类
const handleDeleteCategory = async (id: string) => {
  await categoryStore.deleteCategory(id)
  // 重新加载数据
  await loadData()
  refreshSidebar?.()
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">订阅管理</h2>
        <p class="text-neutral-500 mt-1">管理你的 RSS 订阅源</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- OPML 导入/导出 -->
        <button class="btn btn-secondary text-sm" @click="handleImportOPML">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入 OPML
        </button>
        <button class="btn btn-secondary text-sm" @click="handleExportOPML">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出 OPML
        </button>
        <!-- 添加订阅 -->
        <button class="btn btn-primary text-sm" @click="showAddSubscription = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加订阅
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">总订阅</div>
        <div class="text-2xl font-bold text-neutral-900">{{ stats.total }}</div>
      </div>
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">活跃订阅</div>
        <div class="text-2xl font-bold text-primary-600">{{ stats.active }}</div>
      </div>
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">未读文章</div>
        <div class="text-2xl font-bold text-warning-500">{{ stats.totalUnread }}</div>
      </div>
    </div>

    <!-- 订阅列表 -->
    <SubscriptionList
      :subscriptions="subscriptionStore.subscriptions"
      :categories="categoryStore.categories"
      :is-loading="subscriptionStore.isLoading"
      @edit="handleEdit"
      @delete="handleDelete"
      @toggle-active="handleToggleActive"
      @refresh="handleRefresh"
      @reorder="handleReorder"
      @batch-delete="handleBatchDelete"
      @select="handleSelect"
      @rename-category="handleRenameCategory"
      @delete-category="handleDeleteCategory"
    />

    <!-- 添加订阅弹窗 -->
    <AddSubscription
      v-model="showAddSubscription"
      :categories="categoryStore.categories"
      @submit="handleAddSubscription"
    />

    <!-- OPML 导入弹窗 -->
    <ImportOPML
      v-model="showImportOPML"
      :categories="categoryStore.categories"
      @import="handleOPMLImport"
    />

    <!-- 编辑订阅弹窗 -->
    <EditSubscription
      v-model="showEditSubscription"
      :subscription="editingSubscription"
      :categories="categoryStore.categories"
      @saved="handleEditSaved"
    />
  </div>
</template>
