<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Category } from '@/types'

const props = defineProps<{
  modelValue?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: { url: string; categoryId?: string; autoDiscover: boolean }): void
}>()

// 表单数据
const feedUrl = ref('')
const selectedCategoryId = ref<string>('')
const autoDiscover = ref(true)
const isLoading = ref(false)
const discoveredFeeds = ref<Array<{ title: string; url: string }>>([])
const selectedDiscoveredFeed = ref<string>('')
const step = ref<'input' | 'discover' | 'select'>('input')

// 模拟分类数据
const categories = ref<Category[]>([
  { id: '1', name: '前端框架', subscriptionCount: 5, unreadCount: 12 },
  { id: '2', name: '编程语言', subscriptionCount: 3, unreadCount: 8 },
  { id: '3', name: '工具', subscriptionCount: 4, unreadCount: 5 },
  { id: '4', name: '设计', subscriptionCount: 2, unreadCount: 3 },
])

// 显示状态
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// 关闭弹窗
const close = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  feedUrl.value = ''
  selectedCategoryId.value = ''
  autoDiscover.value = true
  discoveredFeeds.value = []
  selectedDiscoveredFeed.value = ''
  step.value = 'input'
}

// 发现 RSS
const discoverFeeds = async () => {
  if (!feedUrl.value) return

  isLoading.value = true
  step.value = 'discover'

  try {
    // 模拟发现 RSS 订阅
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 模拟找到的订阅
    const domain = new URL(feedUrl.value).hostname
    discoveredFeeds.value = [
      { title: `${domain} - RSS`, url: `${feedUrl.value}/rss` },
      { title: `${domain} - Atom`, url: `${feedUrl.value}/atom.xml` },
    ]
    step.value = 'select'
  } catch {
    // 如果 URL 解析失败，直接使用输入的 URL
    discoveredFeeds.value = [{ title: '自定义订阅', url: feedUrl.value }]
    step.value = 'select'
  } finally {
    isLoading.value = false
  }
}

// 选择发现的订阅
const selectDiscoveredFeed = (url: string) => {
  selectedDiscoveredFeed.value = url
}

// 提交订阅
const submit = () => {
  const url = selectedDiscoveredFeed.value || feedUrl.value
  if (!url) return

  emit('submit', {
    url,
    categoryId: selectedCategoryId.value || undefined,
    autoDiscover: autoDiscover.value,
  })

  close()
}

// 监听 URL 变化，自动发现
watch(feedUrl, (newUrl) => {
  if (newUrl && step.value !== 'input') {
    step.value = 'input'
    discoveredFeeds.value = []
    selectedDiscoveredFeed.value = ''
  }
})
</script>

<template>
  <!-- 弹窗遮罩 -->
  <teleport to="body">
    <transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/50" @click="close"></div>

        <!-- 弹窗内容 -->
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
          <!-- 头部 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <h2 class="text-lg font-semibold text-neutral-900">添加订阅</h2>
            <button
              class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 内容区 -->
          <div class="p-6">
            <!-- 步骤 1: 输入 URL -->
            <div v-if="step === 'input'">
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">
                  订阅地址
                </label>
                <div class="relative">
                  <input
                    v-model="feedUrl"
                    type="url"
                    placeholder="输入网站地址或 RSS 链接..."
                    class="input pl-10"
                    autofocus
                  />
                  <svg
                    class="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <p class="mt-1.5 text-xs text-neutral-500">
                  输入网站地址，我们会自动发现可用的 RSS 订阅
                </p>
              </div>

              <!-- 分类选择 -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">
                  分类（可选）
                </label>
                <select v-model="selectedCategoryId" class="input">
                  <option value="">选择分类...</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <!-- 自动发现选项 -->
              <div class="flex items-center gap-2 mb-6">
                <input
                  id="auto-discover"
                  v-model="autoDiscover"
                  type="checkbox"
                  class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <label for="auto-discover" class="text-sm text-neutral-600">
                  自动发现 RSS 订阅
                </label>
              </div>
            </div>

            <!-- 步骤 2: 发现中 -->
            <div v-if="step === 'discover'" class="text-center py-8">
              <svg class="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p class="text-neutral-600">正在发现 RSS 订阅...</p>
            </div>

            <!-- 步骤 3: 选择订阅 -->
            <div v-if="step === 'select'">
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">
                  发现的订阅
                </label>
                <div class="space-y-2">
                  <button
                    v-for="feed in discoveredFeeds"
                    :key="feed.url"
                    class="w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors"
                    :class="selectedDiscoveredFeed === feed.url
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'"
                    @click="selectDiscoveredFeed(feed.url)"
                  >
                    <div
                      class="w-5 h-5 border-2 rounded-full flex items-center justify-center"
                      :class="selectedDiscoveredFeed === feed.url
                        ? 'border-primary-500'
                        : 'border-neutral-300'"
                    >
                      <div
                        v-if="selectedDiscoveredFeed === feed.url"
                        class="w-2.5 h-2.5 bg-primary-500 rounded-full"
                      ></div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-neutral-900">{{ feed.title }}</div>
                      <div class="text-xs text-neutral-500 truncate">{{ feed.url }}</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 分类选择（确认时再次显示） -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">
                  分类（可选）
                </label>
                <select v-model="selectedCategoryId" class="input">
                  <option value="">选择分类...</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <button class="btn-secondary" @click="close">
              取消
            </button>

            <button
              v-if="step === 'input'"
              class="btn-primary"
              :disabled="!feedUrl || isLoading"
              @click="discoverFeeds"
            >
              下一步
            </button>

            <button
              v-if="step === 'select'"
              class="btn-primary"
              :disabled="!selectedDiscoveredFeed"
              @click="submit"
            >
              添加订阅
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
