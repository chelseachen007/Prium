<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFilterStore } from '@/stores/filters'
import { useCategoryStore } from '@/stores/categories'
import { useSubscriptionStore } from '@/stores/subscriptions'
import type { FilterRule, FilterScope, CreateFilterRuleRequest } from '@rss-reader/shared'
import FilterRuleEditor from '@/components/filter/FilterRuleEditor.vue'

const filterStore = useFilterStore()
const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()

// 当前选中的作用域标签
const activeScope = ref<FilterScope | 'all'>('all')

// 编辑器状态
const showEditor = ref(false)
const editingRule = ref<FilterRule | null>(null)

// 根据作用域过滤规则
const filteredRules = computed(() => {
  if (activeScope.value === 'all') {
    return filterStore.rules
  }
  return filterStore.rulesByScope[activeScope.value]
})

// 作用域标签配置
const scopeTabs = [
  { key: 'all', label: '全部', icon: 'layers' },
  { key: 'global', label: '全局', icon: 'globe' },
  { key: 'category', label: '分类', icon: 'folder' },
  { key: 'subscription', label: '订阅', icon: 'rss' },
] as const

// 动作标签映射
const actionLabels: Record<string, string> = {
  markRead: '标记已读',
  markStarred: '收藏',
  addTag: '添加标签',
  highlight: '高亮',
  pushToInstapaper: '推送到 Instapaper',
  pushToNotion: '推送到 Notion',
  delete: '删除',
}

// 字段标签映射
const fieldLabels: Record<string, string> = {
  title: '标题',
  content: '内容',
  author: '作者',
  url: '链接',
}

// 条件标签映射
const conditionLabels: Record<string, string> = {
  contains: '包含',
  notContains: '不包含',
  equals: '等于',
  notEquals: '不等于',
  startsWith: '开头为',
  endsWith: '结尾为',
  regex: '正则匹配',
}

// 打开新建编辑器
function handleCreate() {
  editingRule.value = null
  showEditor.value = true
}

// 打开编辑编辑器
function handleEdit(rule: FilterRule) {
  editingRule.value = rule
  showEditor.value = true
}

// 保存规则
async function handleSave(data: CreateFilterRuleRequest) {
  if (editingRule.value) {
    await filterStore.updateRule(editingRule.value.id, data)
  } else {
    await filterStore.createRule(data)
  }
  showEditor.value = false
}

// 切换规则状态
async function handleToggle(rule: FilterRule) {
  await filterStore.toggleRule(rule.id)
}

// 删除规则
async function handleDelete(rule: FilterRule) {
  if (confirm(`确定要删除规则 "${rule.name}" 吗？`)) {
    await filterStore.deleteRule(rule.id)
  }
}

// 获取分类名称
function getCategoryName(categoryId: string): string {
  return categoryStore.getCategoryById(categoryId)?.name || '未知分类'
}

// 获取订阅名称
function getSubscriptionName(subscriptionId: string): string {
  const sub = subscriptionStore.subscriptions.find((s) => s.id === subscriptionId)
  return sub?.title || '未知订阅'
}

// 获取作用域显示文本
function getScopeText(rule: FilterRule): string {
  switch (rule.scope) {
    case 'global':
      return '全局'
    case 'category':
      if (rule.categoryIds?.length) {
        return rule.categoryIds.map(getCategoryName).join(', ')
      }
      return '分类'
    case 'subscription':
      if (rule.subscriptionIds?.length) {
        return rule.subscriptionIds.map(getSubscriptionName).join(', ')
      }
      return '订阅'
    default:
      return '未知'
  }
}

// 加载数据
onMounted(async () => {
  await Promise.all([
    filterStore.fetchRules(),
    categoryStore.fetchCategories(),
    subscriptionStore.fetchSubscriptions({ userId: '' }), // userId 从 store 内部获取
  ])
})
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-neutral-900">过滤规则</h2>
        <p class="text-neutral-500 mt-1">
          自动处理新文章，如标记已读、添加标签或推送到外部服务
        </p>
      </div>
      <button @click="handleCreate" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建规则
      </button>
    </div>

    <!-- 作用域标签 -->
    <div class="flex gap-2 border-b border-neutral-200 pb-4">
      <button
        v-for="tab in scopeTabs"
        :key="tab.key"
        @click="activeScope = tab.key"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="
          activeScope === tab.key
            ? 'bg-primary-100 text-primary-700'
            : 'text-neutral-600 hover:bg-neutral-100'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 规则列表 -->
    <div v-if="filterStore.isLoading" class="text-center py-8">
      <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="text-neutral-500 mt-2">加载中...</p>
    </div>

    <div v-else-if="filteredRules.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <p class="text-neutral-500">暂无过滤规则</p>
      <button @click="handleCreate" class="btn-primary mt-4 flex items-center gap-2 mx-auto">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        创建第一条规则
      </button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="rule in filteredRules"
        :key="rule.id"
        class="card p-4 hover:shadow-md transition-shadow"
        :class="{ 'opacity-50': !rule.isEnabled }"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h3 class="font-medium text-neutral-900">{{ rule.name }}</h3>
              <span
                class="px-2 py-0.5 text-xs rounded-full"
                :class="rule.isEnabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'"
              >
                {{ rule.isEnabled ? '已启用' : '已禁用' }}
              </span>
              <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                {{ actionLabels[rule.action] || rule.action }}
              </span>
            </div>

            <p v-if="rule.description" class="text-sm text-neutral-500 mt-1">
              {{ rule.description }}
            </p>

            <div class="flex items-center gap-4 mt-2 text-sm text-neutral-500">
              <span>
                <span class="font-medium">{{ fieldLabels[rule.field] }}</span>
                {{ conditionLabels[rule.condition] }}
                <code class="bg-neutral-100 px-1 rounded">{{ rule.pattern }}</code>
              </span>
              <span class="text-neutral-300">|</span>
              <span>作用于: {{ getScopeText(rule) }}</span>
            </div>

            <div v-if="rule.matchCount > 0" class="text-xs text-neutral-400 mt-2">
              已匹配 {{ rule.matchCount }} 次
              <span v-if="rule.lastMatchedAt">
                · 最后匹配于 {{ new Date(rule.lastMatchedAt).toLocaleString() }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleToggle(rule)"
              class="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              :title="rule.isEnabled ? '禁用' : '启用'"
            >
              <svg v-if="rule.isEnabled" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
            <button
              @click="handleEdit(rule)"
              class="p-2 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-neutral-100"
              title="编辑"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="handleDelete(rule)"
              class="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100"
              title="删除"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 规则编辑器弹窗 -->
    <FilterRuleEditor
      v-if="showEditor"
      :rule="editingRule"
      @close="showEditor = false"
      @save="handleSave"
    />
  </div>
</template>
