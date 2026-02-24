<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Article, SaveType, ObsidianTemplate } from '@/types'

const props = defineProps<{
  article: Article
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', options: { saveType: SaveType; folder: string; template?: string; customContent?: string }): void
}>()

// 保存类型
const saveType = ref<SaveType>('full')
const saveTypes: { value: SaveType; label: string; icon: string; description: string }[] = [
  { value: 'full', label: '全文', icon: 'document', description: '保存完整的文章内容' },
  { value: 'summary', label: '摘要', icon: 'document-text', description: '仅保存标题和摘要' },
  { value: 'inspiration', label: '灵感', icon: 'light-bulb', description: '添加个人笔记和想法' },
]

// 文件夹选择
const folders = ref(['RSS-Reader', 'RSS-Reader/技术', 'RSS-Reader/设计', 'RSS-Reader/其他'])
const selectedFolder = ref('RSS-Reader')

// 模板选择
const templates = ref<ObsidianTemplate[]>([
  { id: '1', name: '默认模板', content: '# {{title}}\n\n{{content}}', isDefault: true },
  { id: '2', name: '读书笔记', content: '# {{title}}\n\n## 摘要\n{{summary}}\n\n## 思考\n', isDefault: false },
  { id: '3', name: '简单保存', content: '{{content}}', isDefault: false },
])
const selectedTemplate = ref('1')

// 自定义内容（灵感模式）
const customContent = ref('')

// 预览状态
const showPreview = ref(false)
const isSaving = ref(false)

// 预览内容
const previewContent = computed(() => {
  const template = templates.value.find(t => t.id === selectedTemplate.value)
  if (!template) return ''

  let content = template.content
    .replace(/\{\{title\}\}/g, props.article.title)
    .replace(/\{\{summary\}\}/g, props.article.summary)
    .replace(/\{\{source\}\}/g, props.article.source.name)
    .replace(/\{\{author\}\}/g, props.article.author || '')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('zh-CN'))
    .replace(/\{\{url\}\}/g, props.article.url)

  if (saveType.value === 'full') {
    content = content.replace(/\{\{content\}\}/g, props.article.content)
  } else if (saveType.value === 'summary') {
    content = content.replace(/\{\{content\}\}/g, props.article.summary)
  } else {
    content = content.replace(/\{\{content\}\}/g, customContent.value)
  }

  return content
})

// 切换预览
const togglePreview = () => {
  showPreview.value = !showPreview.value
}

// 保存
const handleSave = async () => {
  if (saveType.value === 'inspiration' && !customContent.value.trim()) {
    alert('请输入你的想法或笔记')
    return
  }

  isSaving.value = true

  try {
    emit('save', {
      saveType: saveType.value,
      folder: selectedFolder.value,
      template: selectedTemplate.value,
      customContent: saveType.value === 'inspiration' ? customContent.value : undefined,
    })
  } finally {
    isSaving.value = false
  }
}

// 关闭面板
const close = () => {
  emit('close')
}
</script>

<template>
  <div class="w-80 lg:w-96 border-l border-neutral-200 bg-white flex flex-col h-full">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
      <h3 class="text-base font-semibold text-neutral-900">保存到 Obsidian</h3>
      <button
        class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        @click="close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- 文章信息 -->
      <div class="p-3 bg-neutral-50 rounded-lg">
        <h4 class="text-sm font-medium text-neutral-900 line-clamp-2 mb-1">
          {{ article.title }}
        </h4>
        <p class="text-xs text-neutral-500">
          {{ article.source.name }} · {{ article.readTime || '未知时长' }}
        </p>
      </div>

      <!-- 保存类型选择 -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          保存类型
        </label>
        <div class="space-y-2">
          <button
            v-for="type in saveTypes"
            :key="type.value"
            class="w-full flex items-start gap-3 p-3 border rounded-lg text-left transition-colors"
            :class="saveType === type.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'"
            @click="saveType = type.value"
          >
            <!-- Document Icon -->
            <svg v-if="type.icon === 'document'" class="w-5 h-5 text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <!-- Document Text Icon -->
            <svg v-if="type.icon === 'document-text'" class="w-5 h-5 text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <!-- Light Bulb Icon -->
            <svg v-if="type.icon === 'light-bulb'" class="w-5 h-5 text-neutral-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <div class="text-sm font-medium text-neutral-900">{{ type.label }}</div>
              <div class="text-xs text-neutral-500">{{ type.description }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- 自定义内容输入（灵感模式） -->
      <div v-if="saveType === 'inspiration'">
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          你的想法
        </label>
        <textarea
          v-model="customContent"
          rows="4"
          placeholder="写下你对这篇文章的想法、笔记或灵感..."
          class="input resize-none"
        ></textarea>
      </div>

      <!-- 文件夹选择 -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          保存文件夹
        </label>
        <select v-model="selectedFolder" class="input">
          <option v-for="folder in folders" :key="folder" :value="folder">
            {{ folder }}
          </option>
        </select>
      </div>

      <!-- 模板选择 -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-2">
          使用模板
        </label>
        <select v-model="selectedTemplate" class="input">
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }}
            {{ template.isDefault ? '(默认)' : '' }}
          </option>
        </select>
      </div>

      <!-- 预览 -->
      <div>
        <button
          class="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
          @click="togglePreview"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': showPreview }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          {{ showPreview ? '隐藏预览' : '显示预览' }}
        </button>

        <div v-if="showPreview" class="mt-3">
          <div class="p-3 bg-neutral-50 rounded-lg text-sm text-neutral-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {{ previewContent }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="flex items-center gap-3 p-4 border-t border-neutral-200">
      <button class="btn-secondary flex-1" @click="close">
        取消
      </button>
      <button
        class="btn-primary flex-1"
        :disabled="isSaving || (saveType === 'inspiration' && !customContent.trim())"
        @click="handleSave"
      >
        <svg v-if="isSaving" class="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ isSaving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>
