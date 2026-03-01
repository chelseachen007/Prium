<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Category } from '@/types'

const props = defineProps<{
  modelValue?: boolean
  categories?: Category[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'import', data: { subscriptions: Array<{ title: string; url: string; category?: string }> }): void
}>()

const api = useApi()

// 状态
const step = ref<'upload' | 'preview' | 'importing' | 'done'>('upload')
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const parsedSubscriptions = ref<Array<{ title: string; url: string; category?: string; selected: boolean }>>([])
const defaultCategoryId = ref<string>('')
const isLoading = ref(false)
const importProgress = ref(0)
const importResult = ref<{ success: number; failed: number; skipped: number } | null>(null)
const isDragging = ref(false)

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
  step.value = 'upload'
  selectedFile.value = null
  parsedSubscriptions.value = []
  defaultCategoryId.value = ''
  isLoading.value = false
  importProgress.value = 0
  importResult.value = null
}

// 触发文件选择
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event | DragEvent) => {
  let file: File | undefined

  // 处理拖拽事件
  if (event instanceof DragEvent && event.dataTransfer) {
    file = event.dataTransfer.files[0]
  }
  // 处理 input 事件
  else if (event.target instanceof HTMLInputElement) {
    file = event.target.files?.[0]
  }

  if (!file) return

  // 验证文件类型
  const validTypes = ['.opml', '.xml']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  if (!validTypes.includes(fileExt)) {
    alert('请上传 .opml 或 .xml 格式的文件')
    return
  }

  selectedFile.value = file
  isLoading.value = true

  try {
    // 读取文件内容
    const content = await file.text()

    // 解析 OPML
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/xml')

    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      alert('XML 解析错误，请检查文件格式')
      isLoading.value = false
      return
    }

    // 查找所有 outline 元素（RSS 订阅）
    const outlines = doc.querySelectorAll('outline[xmlUrl], outline[type="rss"]')

    if (outlines.length === 0) {
      // 尝试其他选择器
      const allOutlines = doc.querySelectorAll('outline')
      const feedOutlines = Array.from(allOutlines).filter(o =>
        o.getAttribute('xmlUrl') || o.getAttribute('type') === 'rss'
      )

      if (feedOutlines.length === 0) {
        alert('未找到有效的 RSS 订阅，请检查 OPML 文件格式')
        isLoading.value = false
        return
      }

      parsedSubscriptions.value = feedOutlines.map(outline => ({
        title: outline.getAttribute('title') || outline.getAttribute('text') || 'Unknown',
        url: outline.getAttribute('xmlUrl') || '',
        category: outline.getAttribute('category') || outline.parentElement?.getAttribute('text') || undefined,
        selected: true,
      }))
    } else {
      parsedSubscriptions.value = Array.from(outlines).map(outline => ({
        title: outline.getAttribute('title') || outline.getAttribute('text') || 'Unknown',
        url: outline.getAttribute('xmlUrl') || '',
        category: outline.getAttribute('category') || outline.parentElement?.getAttribute('text') || undefined,
        selected: true,
      }))
    }

    // 过滤掉没有 URL 的项
    parsedSubscriptions.value = parsedSubscriptions.value.filter(s => s.url)

    if (parsedSubscriptions.value.length > 0) {
      step.value = 'preview'
    } else {
      alert('未找到有效的 RSS 订阅链接')
    }
  } catch (error) {
    console.error('Parse OPML error:', error)
    alert('解析 OPML 文件失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isLoading.value = false
  }

  // 清空 input 以便再次选择同一文件
  if (event.target instanceof HTMLInputElement) {
    event.target.value = ''
  }
}

// 处理拖拽放下
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  handleFileSelect(event)
}

// 切换订阅选择状态
const toggleSubscription = (index: number) => {
  parsedSubscriptions.value[index].selected = !parsedSubscriptions.value[index].selected
}

// 全选/取消全选
const toggleAll = () => {
  const allSelected = parsedSubscriptions.value.every(s => s.selected)
  parsedSubscriptions.value.forEach(s => s.selected = !allSelected)
}

// 获取选中的订阅数量
const selectedCount = computed(() => parsedSubscriptions.value.filter(s => s.selected).length)

// 开始导入
const startImport = async () => {
  step.value = 'importing'
  isLoading.value = true
  importProgress.value = 0

  const selectedSubscriptions = parsedSubscriptions.value.filter(s => s.selected)
  const total = selectedSubscriptions.length

  let success = 0
  let failed = 0
  let skipped = 0

  // 获取所有分类名称
  const categoryNames = new Set<string>()
  selectedSubscriptions.forEach(sub => {
    if (sub.category) {
      categoryNames.add(sub.category)
    }
  })

  // 创建分类映射表（名称 -> ID）
  const categoryMap = new Map<string, string>()

  // 先处理分类：获取现有分类，创建不存在的分类
  try {
    // 获取现有分类
    const categoriesRes = await api.get<any[]>('/categories')
    const existingCategories = categoriesRes.data || []

    // 建立现有分类映射
    existingCategories.forEach((cat: any) => {
      categoryMap.set(cat.name, cat.id)
    })

    // 创建不存在的分类
    for (const categoryName of categoryNames) {
      if (!categoryMap.has(categoryName)) {
        try {
          const createRes = await api.post<{ id: string }>('/categories', {
            name: categoryName,
          })
          if (createRes.success && createRes.data) {
            categoryMap.set(categoryName, createRes.data.id)
            console.log(`创建分类: ${categoryName}`)
          }
        } catch (err) {
          console.error(`创建分类失败: ${categoryName}`, err)
        }
      }
    }
  } catch (err) {
    console.error('获取分类失败:', err)
  }

  // 逐个导入订阅到数据库
  for (let i = 0; i < total; i++) {
    const sub = selectedSubscriptions[i]

    try {
      // 确定分类 ID：优先使用订阅自带的分类，其次使用默认分类
      let categoryId = sub.category ? categoryMap.get(sub.category) : undefined
      if (!categoryId && defaultCategoryId.value) {
        categoryId = defaultCategoryId.value
      }

      // 调用后端 API 添加订阅
      await api.post('/subscriptions', {
        feedUrl: sub.url,
        title: sub.title,
        categoryId: categoryId || undefined,
      })

      success++
    } catch (error) {
      const err = error as any
      console.error('Import subscription error:', err)
      
      // 检查是否是重复订阅
      if (err.code === 'SUBSCRIPTION_EXISTS' || err.message?.includes('已存在')) {
        skipped++
      } else {
        failed++
      }
    }

    importProgress.value = Math.round(((i + 1) / total) * 100)

    // 短暂延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  importResult.value = { success, failed, skipped }
  step.value = 'done'
  isLoading.value = false

  // 发出导入事件（通知父组件刷新列表）
  emit('import', {
    subscriptions: selectedSubscriptions.map(s => ({
      title: s.title,
      url: s.url,
      category: s.category,
    })),
  })
}

// 返回上一步
const goBack = () => {
  if (step.value === 'preview') {
    step.value = 'upload'
    parsedSubscriptions.value = []
    selectedFile.value = null
  }
}
</script>

<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/50" @click="close"></div>

        <!-- 弹窗内容 -->
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <!-- 头部 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
            <div class="flex items-center gap-3">
              <button
                v-if="step === 'preview'"
                class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                @click="goBack"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 class="text-lg font-semibold text-neutral-900">导入 OPML</h2>
            </div>
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
          <div class="p-6 overflow-y-auto flex-1">
            <!-- 步骤 1: 上传文件 -->
            <div v-if="step === 'upload'" class="text-center">
              <!-- 拖拽上传区域 -->
              <div
                class="border-2 border-dashed border-neutral-300 rounded-xl p-12 hover:border-primary-400 hover:bg-primary-50/50 transition-colors cursor-pointer"
                :class="{ 'border-primary-400 bg-primary-50/50': isDragging }"
                @click="triggerFileInput"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".opml,.xml"
                  class="hidden"
                  @change="handleFileSelect"
                />

                <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <p class="text-neutral-700 font-medium mb-2">点击或拖拽上传 OPML 文件</p>
                <p class="text-sm text-neutral-500">支持 .opml 和 .xml 格式</p>
              </div>

              <!-- 说明 -->
              <div class="mt-6 text-left">
                <h3 class="text-sm font-medium text-neutral-700 mb-2">什么是 OPML?</h3>
                <p class="text-sm text-neutral-500">
                  OPML (Outline Processor Markup Language) 是一种用于存储订阅列表的标准格式。
                  你可以从其他 RSS 阅读器（如 Feedly、Inoreader 等）导出 OPML 文件，然后在这里导入。
                </p>
              </div>
            </div>

            <!-- 步骤 2: 预览订阅 -->
            <div v-else-if="step === 'preview'">
              <!-- 文件信息 -->
              <div class="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg mb-4">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-neutral-900">{{ selectedFile ? selectedFile.name : '' }}</p>
                  <p class="text-xs text-neutral-500">发现 {{ parsedSubscriptions.length }} 个订阅源</p>
                </div>
              </div>

              <!-- 默认分类选择 -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">默认分类（可选）</label>
                <select v-model="defaultCategoryId" class="input">
                  <option value="">不指定分类</option>
                  <option v-for="category in (categories || [])" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <!-- 工具栏 -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-neutral-600">
                    已选择 {{ selectedCount }} / {{ parsedSubscriptions.length }}
                  </span>
                </div>
                <button
                  class="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  @click="toggleAll"
                >
                  {{ selectedCount === parsedSubscriptions.length ? '取消全选' : '全选' }}
                </button>
              </div>

              <!-- 订阅列表 -->
              <div class="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                <div
                  v-for="(subscription, index) in parsedSubscriptions"
                  :key="index"
                  class="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
                  :class="{ 'bg-neutral-50': !subscription.selected }"
                >
                  <input
                    type="checkbox"
                    :checked="subscription.selected"
                    class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    @change="toggleSubscription(index)"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-neutral-900 truncate">{{ subscription.title }}</p>
                    <p class="text-xs text-neutral-500 truncate">{{ subscription.url }}</p>
                  </div>
                  <span v-if="subscription.category" class="badge badge-primary">
                    {{ subscription.category }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 步骤 3: 导入中 -->
            <div v-else-if="step === 'importing'" class="text-center py-8">
              <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p class="text-neutral-700 font-medium mb-2">正在导入订阅...</p>
              <p class="text-sm text-neutral-500 mb-4">请稍候，不要关闭此窗口</p>

              <!-- 进度条 -->
              <div class="w-full bg-neutral-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${importProgress}%` }"
                ></div>
              </div>
              <p class="text-sm text-neutral-500 mt-2">{{ importProgress }}%</p>
            </div>

            <!-- 步骤 4: 完成 -->
            <div v-else-if="step === 'done'" class="text-center py-8">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="text-neutral-700 font-medium mb-2">导入完成!</p>

              <!-- 导入结果 -->
              <div class="flex items-center justify-center gap-6 mt-4">
                <div class="text-center">
                  <p class="text-2xl font-bold text-green-600">{{ importResult ? importResult.success : 0 }}</p>
                  <p class="text-xs text-neutral-500">成功</p>
                </div>
                <div v-if="importResult && importResult.skipped" class="text-center">
                  <p class="text-2xl font-bold text-yellow-600">{{ importResult.skipped }}</p>
                  <p class="text-xs text-neutral-500">跳过</p>
                </div>
                <div v-if="importResult && importResult.failed" class="text-center">
                  <p class="text-2xl font-bold text-red-600">{{ importResult.failed }}</p>
                  <p class="text-xs text-neutral-500">失败</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
            <button class="btn btn-secondary" @click="close">
              {{ step === 'done' ? '完成' : '取消' }}
            </button>

            <button
              v-if="step === 'preview'"
              class="btn btn-primary"
              :disabled="selectedCount === 0 || isLoading"
              @click="startImport"
            >
              导入 {{ selectedCount }} 个订阅
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
