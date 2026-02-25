<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import SubscriptionList from '@/components/subscription/SubscriptionList.vue'
import AddSubscription from '@/components/subscription/AddSubscription.vue'
import ImportOPML from '@/components/subscription/ImportOPML.vue'
import EditSubscription from '@/components/subscription/EditSubscription.vue'
import type { Subscription, Category } from '@/types'

const api = useApi()
const router = useRouter()

// 注入刷新侧边栏的方法
const refreshSidebar = inject<() => void>('refreshSidebar')

// 弹窗状态
const showAddSubscription = ref(false)
const showImportOPML = ref(false)
const showEditSubscription = ref(false)
const editingSubscription = ref<Subscription | null>(null)

// 订阅数据
const subscriptions = ref<Subscription[]>([])

// 分类数据
const categories = ref<Category[]>([])

// 加载状态
const isLoading = ref(false)

// 统计信息
const stats = computed(() => ({
  total: subscriptions.value.length,
  active: subscriptions.value.filter(s => s.isActive).length,
  totalUnread: subscriptions.value.reduce((sum, s) => sum + s.unreadCount, 0),
}))

// 加载数据
const loadData = async () => {
  isLoading.value = true
  try {
    // 并行加载分类和订阅
    const [categoriesRes, subscriptionsRes] = await Promise.all([
      api.get<Category[]>('/categories'),
      api.get<Subscription[]>('/subscriptions'),
    ])

    if (categoriesRes.success && categoriesRes.data) {
      categories.value = categoriesRes.data
    }

    if (subscriptionsRes.success && subscriptionsRes.data) {
      subscriptions.value = subscriptionsRes.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        url: s.feedUrl,
        description: s.description,
        category: s.category?.name,
        categoryId: s.categoryId,
        articleCount: s._count?.articles || s.articleCount || 0,
        unreadCount: s.unreadCount || 0,
        lastUpdated: s.lastFetched || s.createdAt,
        isActive: s.isActive,
      }))
    }
  } catch (error) {
    console.error('Load data error:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

// 添加订阅
const handleAddSubscription = async (data: { url: string; categoryId?: string; autoDiscover: boolean }) => {
  console.log('Add subscription:', data)

  try {
    const response = await api.post('/subscriptions', {
      feedUrl: data.url,
      categoryId: data.categoryId || undefined,
    })

    if (response.success) {
      // 重新加载数据
      await loadData()
    }
  } catch (error) {
    console.error('Add subscription error:', error)
  }
}

// 编辑订阅
const handleEdit = (id: string) => {
  const subscription = subscriptions.value.find(s => s.id === id)
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
  try {
    const response = await api.delete(`/subscriptions/${id}`)
    if (response.success) {
      subscriptions.value = subscriptions.value.filter(s => s.id !== id)
      // 刷新侧边栏（分类和未读数）
      refreshSidebar?.()
    }
  } catch (error) {
    console.error('Delete subscription error:', error)
  }
}

// 切换订阅状态
const handleToggleActive = async (id: string) => {
  const subscription = subscriptions.value.find(s => s.id === id)
  if (!subscription) return

  try {
    const response = await api.put(`/subscriptions/${id}`, {
      isActive: !subscription.isActive,
    })
    if (response.success) {
      subscription.isActive = !subscription.isActive
    }
  } catch (error) {
    console.error('Toggle subscription error:', error)
  }
}

// 刷新订阅
const handleRefresh = async (id: string) => {
  const subscription = subscriptions.value.find(s => s.id === id)
  if (!subscription) return

  console.log('Refresh subscription:', id)

  // 显示刷新中的状态
  const originalTitle = subscription.title
  subscription.title = '刷新中...'

  try {
    const response = await api.post(`/subscriptions/${id}/refresh`)
    if (response.success) {
      console.log(`刷新成功，获取 ${response.data?.newArticles || 0} 篇新文章`)
      // 重新加载数据
      await loadData()
    }
  } catch (error) {
    console.error('Refresh subscription error:', error)
    subscription.title = originalTitle
  }
}

// 批量删除订阅
const handleBatchDelete = async (ids: string[]) => {
  try {
    // 并行删除所有选中的订阅
    await Promise.all(ids.map(id => api.delete(`/subscriptions/${id}`)))
    // 重新加载数据
    await loadData()
    // 刷新侧边栏（分类和未读数）
    refreshSidebar?.()
  } catch (error) {
    console.error('Batch delete subscriptions error:', error)
  }
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
}

// OPML 导出
const handleExportOPML = () => {
  console.log('Export OPML')
  // TODO: 实现 OPML 导出
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
  const category = categories.value.find(c => c.id === id)
  if (!category) return

  const newName = prompt('请输入新的分类名称', category.name)
  if (newName && newName !== category.name) {
    try {
      const response = await api.put(`/categories/${id}`, { name: newName })
      if (response.success) {
        // 重新加载数据
        await loadData()
        refreshSidebar?.()
      }
    } catch (error) {
      console.error('Rename category error:', error)
    }
  }
}

// 删除分类
const handleDeleteCategory = async (id: string) => {
  try {
    const response = await api.delete(`/categories/${id}`)
    if (response.success) {
      // 重新加载数据
      await loadData()
      refreshSidebar?.()
    }
  } catch (error) {
    console.error('Delete category error:', error)
  }
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
      :subscriptions="subscriptions"
      :categories="categories"
      :is-loading="isLoading"
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
      @submit="handleAddSubscription"
    />

    <!-- OPML 导入弹窗 -->
    <ImportOPML
      v-model="showImportOPML"
      :categories="categories"
      @import="handleOPMLImport"
    />

    <!-- 编辑订阅弹窗 -->
    <EditSubscription
      v-model="showEditSubscription"
      :subscription="editingSubscription"
      :categories="categories"
      @saved="handleEditSaved"
    />
  </div>
</template>
