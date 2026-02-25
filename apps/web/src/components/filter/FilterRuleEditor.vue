<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCategoryStore } from '@/stores/categories'
import { useSubscriptionStore } from '@/stores/subscriptions'
import type {
  FilterRule,
  FilterScope,
  FilterField,
  FilterAction,
  MatchCondition,
  CreateFilterRuleRequest,
} from '@rss-reader/shared'

const props = defineProps<{
  rule: FilterRule | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: CreateFilterRuleRequest]
}>()

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()

// 表单数据
const form = ref({
  name: '',
  description: '',
  isEnabled: true,
  priority: 0,
  field: 'title' as FilterField,
  condition: 'contains' as MatchCondition,
  pattern: '',
  caseSensitive: false,
  action: 'markRead' as FilterAction,
  actionValue: '',
  scope: 'global' as FilterScope,
  subscriptionIds: [] as string[],
  categoryIds: [] as string[],
})

// 监听 rule 变化，初始化表单
watch(
  () => props.rule,
  (rule) => {
    if (rule) {
      form.value = {
        name: rule.name,
        description: rule.description || '',
        isEnabled: rule.isEnabled,
        priority: rule.priority,
        field: rule.field,
        condition: rule.condition,
        pattern: rule.pattern,
        caseSensitive: rule.caseSensitive,
        action: rule.action,
        actionValue: rule.actionValue || '',
        scope: rule.scope,
        subscriptionIds: rule.subscriptionIds || [],
        categoryIds: rule.categoryIds || [],
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// 重置表单
function resetForm() {
  form.value = {
    name: '',
    description: '',
    isEnabled: true,
    priority: 0,
    field: 'title',
    condition: 'contains',
    pattern: '',
    caseSensitive: false,
    action: 'markRead',
    actionValue: '',
    scope: 'global',
    subscriptionIds: [],
    categoryIds: [],
  }
}

// 字段选项
const fieldOptions = [
  { value: 'title', label: '标题' },
  { value: 'content', label: '内容' },
  { value: 'author', label: '作者' },
  { value: 'url', label: '链接' },
]

// 条件选项
const conditionOptions = [
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
  { value: 'equals', label: '等于' },
  { value: 'notEquals', label: '不等于' },
  { value: 'startsWith', label: '开头为' },
  { value: 'endsWith', label: '结尾为' },
  { value: 'regex', label: '正则匹配' },
]

// 动作选项
const actionOptions = [
  { value: 'markRead', label: '标记为已读' },
  { value: 'markStarred', label: '添加到收藏' },
  { value: 'highlight', label: '高亮标记' },
  { value: 'addTag', label: '添加标签' },
  { value: 'pushToInstapaper', label: '推送到 Instapaper' },
  { value: 'pushToNotion', label: '推送到 Notion' },
  { value: 'delete', label: '删除/跳过' },
]

// 作用域选项
const scopeOptions = [
  { value: 'global', label: '全局（所有订阅）' },
  { value: 'category', label: '指定分类' },
  { value: 'subscription', label: '指定订阅' },
]

// 是否需要动作值
const needsActionValue = computed(() => {
  return form.value.action === 'addTag'
})

// 是否需要选择分类
const needsCategorySelect = computed(() => {
  return form.value.scope === 'category'
})

// 是否需要选择订阅
const needsSubscriptionSelect = computed(() => {
  return form.value.scope === 'subscription'
})

// 提交表单
function handleSubmit() {
  const data: CreateFilterRuleRequest = {
    name: form.value.name,
    description: form.value.description || undefined,
    isEnabled: form.value.isEnabled,
    priority: form.value.priority,
    field: form.value.field,
    condition: form.value.condition,
    pattern: form.value.pattern,
    caseSensitive: form.value.caseSensitive,
    action: form.value.action,
    actionValue: needsActionValue.value ? form.value.actionValue : undefined,
    scope: form.value.scope,
    subscriptionIds: needsSubscriptionSelect.value ? form.value.subscriptionIds : undefined,
    categoryIds: needsCategorySelect.value ? form.value.categoryIds : undefined,
  }

  emit('save', data)
}

// 关闭弹窗
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-neutral-900">
          {{ rule ? '编辑规则' : '新建规则' }}
        </h2>
        <button @click="handleClose" class="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- 基本信息 -->
        <div class="space-y-4">
          <h3 class="font-medium text-neutral-900">基本信息</h3>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">规则名称 *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input w-full"
              placeholder="例如：过滤广告文章"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">描述</label>
            <textarea
              v-model="form.description"
              class="input w-full"
              rows="2"
              placeholder="规则描述（可选）"
            ></textarea>
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2">
              <input v-model="form.isEnabled" type="checkbox" class="rounded" />
              <span class="text-sm text-neutral-700">启用此规则</span>
            </label>

            <div class="flex items-center gap-2">
              <label class="text-sm text-neutral-700">优先级:</label>
              <input
                v-model.number="form.priority"
                type="number"
                class="input w-20"
                min="0"
                max="1000"
              />
              <span class="text-xs text-neutral-400">(数值越大优先级越高)</span>
            </div>
          </div>
        </div>

        <!-- 匹配条件 -->
        <div class="space-y-4">
          <h3 class="font-medium text-neutral-900">匹配条件</h3>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">匹配字段</label>
              <select v-model="form.field" class="input w-full">
                <option v-for="opt in fieldOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">匹配条件</label>
              <select v-model="form.condition" class="input w-full">
                <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">匹配模式 *</label>
              <input
                v-model="form.pattern"
                type="text"
                required
                class="input w-full"
                placeholder="输入关键词或正则"
              />
            </div>
          </div>

          <label class="flex items-center gap-2">
            <input v-model="form.caseSensitive" type="checkbox" class="rounded" />
            <span class="text-sm text-neutral-700">区分大小写</span>
          </label>
        </div>

        <!-- 执行动作 -->
        <div class="space-y-4">
          <h3 class="font-medium text-neutral-900">执行动作</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">动作类型</label>
              <select v-model="form.action" class="input w-full">
                <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div v-if="needsActionValue">
              <label class="block text-sm font-medium text-neutral-700 mb-1">标签名称</label>
              <input
                v-model="form.actionValue"
                type="text"
                class="input w-full"
                placeholder="输入标签（多个用逗号分隔）"
              />
            </div>
          </div>
        </div>

        <!-- 应用范围 -->
        <div class="space-y-4">
          <h3 class="font-medium text-neutral-900">应用范围</h3>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">作用范围</label>
            <select v-model="form.scope" class="input w-full">
              <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- 分类选择 -->
          <div v-if="needsCategorySelect">
            <label class="block text-sm font-medium text-neutral-700 mb-1">选择分类</label>
            <div class="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              <label
                v-for="category in categoryStore.categories"
                :key="category.id"
                class="flex items-center gap-2"
              >
                <input
                  v-model="form.categoryIds"
                  type="checkbox"
                  :value="category.id"
                  class="rounded"
                />
                <span class="text-sm">{{ category.name }}</span>
              </label>
              <p v-if="categoryStore.categories.length === 0" class="text-sm text-neutral-400">
                暂无分类
              </p>
            </div>
          </div>

          <!-- 订阅选择 -->
          <div v-if="needsSubscriptionSelect">
            <label class="block text-sm font-medium text-neutral-700 mb-1">选择订阅</label>
            <div class="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              <label
                v-for="sub in subscriptionStore.subscriptions"
                :key="sub.id"
                class="flex items-center gap-2"
              >
                <input
                  v-model="form.subscriptionIds"
                  type="checkbox"
                  :value="sub.id"
                  class="rounded"
                />
                <span class="text-sm">{{ sub.title }}</span>
              </label>
              <p v-if="subscriptionStore.subscriptions.length === 0" class="text-sm text-neutral-400">
                暂无订阅
              </p>
            </div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <button type="button" @click="handleClose" class="btn-secondary">
            取消
          </button>
          <button type="submit" class="btn-primary">
            {{ rule ? '保存修改' : '创建规则' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
