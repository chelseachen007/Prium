<script setup lang="ts">
import { ref, computed } from 'vue'

// Obsidian 配置
const config = ref({
  enabled: false,
  vaultPath: '',
  folderPath: 'RSS-Reader',
  fileNameTemplate: '{{title}}',
  autoSync: false,
  includeImages: true,
  includeMetadata: true,
  tagFormat: '#{{tag}}',
})

// 测试连接状态
const connectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const connectionMessage = ref('')

// 模板列表
const templates = ref([
  { id: '1', name: '默认模板', content: '# {{title}}\n\n{{content}}', isDefault: true },
  { id: '2', name: '读书笔记', content: '# {{title}}\n\n## 摘要\n{{summary}}\n\n## 思考\n', isDefault: false },
  { id: '3', name: '简单保存', content: '{{content}}', isDefault: false },
])

// 新模板表单
const showNewTemplateForm = ref(false)
const newTemplateName = ref('')
const newTemplateContent = ref('')

// 文件名模板变量
const templateVariables = [
  { name: 'title', description: '文章标题' },
  { name: 'source', description: '来源名称' },
  { name: 'date', description: '发布日期' },
  { name: 'author', description: '作者名称' },
  { name: 'url', description: '原文链接' },
  { name: 'summary', description: '文章摘要' },
  { name: 'content', description: '文章内容' },
  { name: 'tags', description: '文章标签' },
]

// 同步历史（模拟）
const syncHistory = ref([
  { id: '1', article: 'Vue 3.4 发布', date: '2024-01-15 14:30', status: 'success' },
  { id: '2', article: 'TypeScript 5.3', date: '2024-01-14 10:20', status: 'success' },
  { id: '3', article: 'React 19 新特性', date: '2024-01-13 16:45', status: 'error' },
])

// 测试连接
const testConnection = async () => {
  if (!config.value.vaultPath) {
    connectionStatus.value = 'error'
    connectionMessage.value = '请先输入 Vault 路径'
    return
  }

  connectionStatus.value = 'testing'
  connectionMessage.value = ''

  try {
    // 模拟测试连接
    await new Promise(resolve => setTimeout(resolve, 1500))
    connectionStatus.value = 'success'
    connectionMessage.value = '连接成功！已找到 Obsidian Vault'
  } catch {
    connectionStatus.value = 'error'
    connectionMessage.value = '连接失败，请检查路径是否正确'
  }
}

// 保存配置
const saveConfig = async () => {
  // TODO: 调用 API 保存配置
  console.log('Save config:', config.value)
  alert('配置已保存')
}

// 添加新模板
const addTemplate = () => {
  if (!newTemplateName.value || !newTemplateContent.value) return

  templates.value.push({
    id: String(Date.now()),
    name: newTemplateName.value,
    content: newTemplateContent.value,
    isDefault: false,
  })

  newTemplateName.value = ''
  newTemplateContent.value = ''
  showNewTemplateForm.value = false
}

// 删除模板
const deleteTemplate = (id: string) => {
  templates.value = templates.value.filter(t => t.id !== id)
}

// 设为默认模板
const setDefaultTemplate = (id: string) => {
  templates.value.forEach(t => {
    t.isDefault = t.id === id
  })
}

// 统计信息
const stats = computed(() => ({
  totalSaved: syncHistory.value.length,
  successCount: syncHistory.value.filter(h => h.status === 'success').length,
  errorCount: syncHistory.value.filter(h => h.status === 'error').length,
}))
</script>

<template>
  <div class="space-y-6">
    <!-- 功能介绍 -->
    <div class="card p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Obsidian 集成</h3>
          <p class="text-sm text-neutral-600">
            将 RSS 文章保存到你的 Obsidian 笔记库中，支持自动同步、自定义文件名模板、保留图片和元数据等功能。
            保存的文章将以 Markdown 格式存储，方便在 Obsidian 中进行二次编辑和整理。
          </p>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">已保存文章</div>
        <div class="text-2xl font-bold text-neutral-900">{{ stats.totalSaved }}</div>
      </div>
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">成功</div>
        <div class="text-2xl font-bold text-success-500">{{ stats.successCount }}</div>
      </div>
      <div class="card p-4">
        <div class="text-sm text-neutral-500 mb-1">失败</div>
        <div class="text-2xl font-bold text-error-500">{{ stats.errorCount }}</div>
      </div>
    </div>

    <!-- 启用开关 -->
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-neutral-700">启用 Obsidian 集成</div>
          <div class="text-xs text-neutral-500">开启后可将文章保存到 Obsidian</div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input v-model="config.enabled" type="checkbox" class="sr-only peer" />
          <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>
    </div>

    <!-- 配置表单 -->
    <div v-if="config.enabled" class="space-y-6">
      <!-- Vault 路径 -->
      <div class="card p-6">
        <h3 class="text-base font-semibold text-neutral-900 mb-4">Vault 配置</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              Obsidian Vault 路径
              <span class="text-error-500">*</span>
            </label>
            <div class="flex gap-3">
              <input
                v-model="config.vaultPath"
                type="text"
                placeholder="/path/to/your/obsidian/vault"
                class="input flex-1"
              />
              <button class="btn-secondary" @click="testConnection">
                <svg
                  v-if="connectionStatus === 'testing'"
                  class="w-4 h-4 animate-spin mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ connectionStatus === 'testing' ? '测试中...' : '测试连接' }}
              </button>
            </div>
            <p v-if="connectionMessage" class="mt-2 text-sm" :class="{
              'text-success-600': connectionStatus === 'success',
              'text-error-600': connectionStatus === 'error'
            }">
              {{ connectionMessage }}
            </p>
            <p class="mt-1 text-xs text-neutral-500">
              输入你的 Obsidian Vault 在本地文件系统中的完整路径
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              保存文件夹
            </label>
            <input
              v-model="config.folderPath"
              type="text"
              placeholder="RSS-Reader"
              class="input"
            />
            <p class="mt-1 text-xs text-neutral-500">
              文章将保存到此文件夹中，如果不存在会自动创建
            </p>
          </div>
        </div>
      </div>

      <!-- 文件名模板 -->
      <div class="card p-6">
        <h3 class="text-base font-semibold text-neutral-900 mb-4">文件名模板</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              文件名模板
            </label>
            <input
              v-model="config.fileNameTemplate"
              type="text"
              placeholder="{{title}}"
              class="input"
            />
            <p class="mt-1 text-xs text-neutral-500">
              使用模板变量自定义保存的文件名
            </p>
          </div>

          <!-- 可用变量 -->
          <div class="p-4 bg-neutral-50 rounded-lg">
            <div class="text-sm font-medium text-neutral-700 mb-2">可用变量</div>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="variable in templateVariables"
                :key="variable.name"
                class="flex items-center gap-2 text-sm"
              >
                <code class="px-2 py-0.5 bg-white rounded text-primary-700 border border-primary-200 text-xs">
                  {{ '{{' + variable.name + '}}' }}
                </code>
                <span class="text-neutral-500">{{ variable.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模板管理 -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-neutral-900">保存模板</h3>
          <button
            class="btn-secondary text-sm"
            @click="showNewTemplateForm = true"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            新建模板
          </button>
        </div>

        <!-- 模板列表 -->
        <div class="space-y-3">
          <div
            v-for="template in templates"
            :key="template.id"
            class="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-neutral-900">{{ template.name }}</span>
                <span v-if="template.isDefault" class="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
                  默认
                </span>
              </div>
              <div class="text-xs text-neutral-500 truncate max-w-xs mt-0.5">
                {{ template.content.substring(0, 50) }}...
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!template.isDefault"
                class="text-xs text-primary-600 hover:text-primary-700"
                @click="setDefaultTemplate(template.id)"
              >
                设为默认
              </button>
              <button
                v-if="!template.isDefault"
                class="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
                @click="deleteTemplate(template.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 新建模板表单 -->
        <div v-if="showNewTemplateForm" class="mt-4 p-4 bg-neutral-50 rounded-lg">
          <div class="space-y-3">
            <input
              v-model="newTemplateName"
              type="text"
              placeholder="模板名称"
              class="input"
            />
            <textarea
              v-model="newTemplateContent"
              rows="4"
              placeholder="# {{title}}&#10;&#10;{{content}}"
              class="input resize-none"
            ></textarea>
            <div class="flex items-center gap-2">
              <button class="btn-primary text-sm" @click="addTemplate">保存模板</button>
              <button class="btn-ghost text-sm" @click="showNewTemplateForm = false">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 同步选项 -->
      <div class="card p-6">
        <h3 class="text-base font-semibold text-neutral-900 mb-4">同步选项</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-neutral-700">包含图片</div>
              <div class="text-xs text-neutral-500">保存文章时下载并保存图片</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="config.includeImages" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-neutral-700">包含元数据</div>
              <div class="text-xs text-neutral-500">在文件开头添加 YAML front matter</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="config.includeMetadata" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-neutral-700">自动同步收藏</div>
              <div class="text-xs text-neutral-500">收藏文章时自动保存到 Obsidian</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="config.autoSync" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              标签格式
            </label>
            <input
              v-model="config.tagFormat"
              type="text"
              placeholder="#{{tag}}"
              class="input"
            />
            <p class="mt-1 text-xs text-neutral-500">
              定义标签的输出格式，使用 {{tag}} 作为标签名占位符
            </p>
          </div>
        </div>
      </div>

      <!-- 同步历史 -->
      <div class="card p-6">
        <h3 class="text-base font-semibold text-neutral-900 mb-4">同步历史</h3>
        <div class="space-y-2">
          <div
            v-for="item in syncHistory"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-2 h-2 rounded-full"
                :class="item.status === 'success' ? 'bg-success-500' : 'bg-error-500'"
              ></div>
              <span class="text-sm text-neutral-700">{{ item.article }}</span>
            </div>
            <span class="text-xs text-neutral-400">{{ item.date }}</span>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-end gap-3">
        <button class="btn-secondary">重置</button>
        <button class="btn-primary" @click="saveConfig">保存配置</button>
      </div>
    </div>
  </div>
</template>
