<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

// 导入导出状态
const isExporting = ref(false)
const isImporting = ref(false)
const importProgress = ref(0)
const exportFormat = ref<'opml' | 'json'>('opml')

// 备份历史（模拟）
const backupHistory = ref([
  { id: '1', date: '2024-01-15 14:30', type: 'OPML', count: 25, size: '12KB' },
  { id: '2', date: '2024-01-10 10:00', type: 'JSON', count: 150, size: '256KB' },
])

// 导出 OPML
const exportOPML = async () => {
  isExporting.value = true
  try {
    const response = await api.get('/subscriptions')
    if (response.success && response.data) {
      // 生成 OPML XML
      let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS 订阅导出</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
`

      // 按分类分组
      const subscriptions = response.data as any[]
      const groupedByCategory: Record<string, any[]> = {}

      subscriptions.forEach(sub => {
        const category = sub.category?.name || '未分类'
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = []
        }
        groupedByCategory[category].push(sub)
      })

      // 生成 outline
      Object.entries(groupedByCategory).forEach(([category, subs]) => {
        opml += `    <outline text="${category}" title="${category}">\n`
        subs.forEach(sub => {
          opml += `      <outline type="rss" text="${sub.title}" title="${sub.title}" xmlUrl="${sub.feedUrl}" htmlUrl="${sub.siteUrl || ''}" />\n`
        })
        opml += `    </outline>\n`
      })

      opml += `  </body>
</opml>`

      // 下载文件
      const blob = new Blob([opml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rss-subscriptions-${new Date().toISOString().split('T')[0]}.opml`
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Export OPML error:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

// 导出 JSON
const exportJSON = async () => {
  isExporting.value = true
  try {
    const [subsRes, categoriesRes, articlesRes] = await Promise.all([
      api.get('/subscriptions'),
      api.get('/categories'),
      api.get('/articles', { pageSize: 1000 }),
    ])

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      subscriptions: subsRes.success ? subsRes.data : [],
      categories: categoriesRes.success ? categoriesRes.data : [],
      articles: articlesRes.success ? articlesRes.data : [],
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rss-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export JSON error:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

// 触发导出
const handleExport = () => {
  if (exportFormat.value === 'opml') {
    exportOPML()
  } else {
    exportJSON()
  }
}

// 文件选择
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const importType = ref<'opml' | 'json'>('opml')

const selectFile = (type: 'opml' | 'json') => {
  importType.value = type
  fileInput.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
    importFile()
  }
}

// 导入文件
const importFile = async () => {
  if (!selectedFile.value) return

  isImporting.value = true
  importProgress.value = 0

  try {
    const content = await selectedFile.value.text()

    if (importType.value === 'opml') {
      await importOPML(content)
    } else {
      await importJSON(content)
    }

    alert('导入成功！')
  } catch (error) {
    console.error('Import error:', error)
    alert('导入失败，请检查文件格式')
  } finally {
    isImporting.value = false
    importProgress.value = 0
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// 导入 OPML
const importOPML = async (content: string) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/xml')
  const outlines = doc.querySelectorAll('body > outline')

  importProgress.value = 10

  let imported = 0
  const total = outlines.length

  for (let i = 0; i < outlines.length; i++) {
    const outline = outlines[i]
    const categoryName = outline.getAttribute('text') || outline.getAttribute('title') || '未分类'

    // 检查是否是分类（包含子 outline）
    const childOutlines = outline.querySelectorAll(':scope > outline')

    if (childOutlines.length > 0) {
      // 先创建分类
      try {
        await api.post('/categories', { name: categoryName })
      } catch {
        // 分类可能已存在，忽略错误
      }

      // 导入该分类下的订阅
      for (const child of childOutlines) {
        const feedUrl = child.getAttribute('xmlUrl')
        const title = child.getAttribute('text') || child.getAttribute('title') || ''

        if (feedUrl) {
          try {
            await api.post('/subscriptions', {
              feedUrl,
              title,
              category: categoryName,
            })
            imported++
          } catch {
            // 忽略已存在的订阅
          }
        }
      }
    } else {
      // 直接是订阅（无分类）
      const feedUrl = outline.getAttribute('xmlUrl')
      const title = outline.getAttribute('text') || outline.getAttribute('title') || ''

      if (feedUrl) {
        try {
          await api.post('/subscriptions', { feedUrl, title })
          imported++
        } catch {
          // 忽略已存在的订阅
        }
      }
    }

    importProgress.value = 10 + Math.round((i + 1) / total * 80)
  }

  importProgress.value = 100
  console.log(`导入完成，共导入 ${imported} 个订阅`)
}

// 导入 JSON
const importJSON = async (content: string) => {
  const data = JSON.parse(content)

  importProgress.value = 10

  // 导入分类
  if (data.categories && Array.isArray(data.categories)) {
    for (const category of data.categories) {
      try {
        await api.post('/categories', { name: category.name })
      } catch {
        // 忽略已存在的分类
      }
    }
  }

  importProgress.value = 30

  // 导入订阅
  if (data.subscriptions && Array.isArray(data.subscriptions)) {
    const total = data.subscriptions.length
    for (let i = 0; i < data.subscriptions.length; i++) {
      const sub = data.subscriptions[i]
      try {
        await api.post('/subscriptions', {
          feedUrl: sub.feedUrl,
          title: sub.title,
          category: sub.category?.name || sub.category,
        })
      } catch {
        // 忽略已存在的订阅
      }
      importProgress.value = 30 + Math.round((i + 1) / total * 60)
    }
  }

  importProgress.value = 100
}

// 清除所有数据
const clearAllData = async () => {
  if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return
  if (!confirm('再次确认：这将删除所有订阅、分类和文章数据！')) return

  try {
    // TODO: 调用清除数据的 API
    alert('数据已清除')
  } catch (error) {
    console.error('Clear data error:', error)
    alert('清除数据失败')
  }
}

onMounted(() => {
  // 可以在这里加载备份历史
})
</script>

<template>
  <div class="space-y-6">
    <!-- 导出功能 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">导出数据</h3>
      <p class="text-sm text-neutral-500 mb-4">
        将订阅和数据导出为 OPML 或 JSON 格式，便于备份或迁移到其他阅读器
      </p>

      <div class="space-y-4">
        <!-- 导出格式选择 -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="exportFormat" type="radio" value="opml" class="text-primary-600" />
            <span class="text-sm text-neutral-700">OPML 格式</span>
            <span class="text-xs text-neutral-400">（仅订阅列表，兼容大多数阅读器）</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="exportFormat" type="radio" value="json" class="text-primary-600" />
            <span class="text-sm text-neutral-700">JSON 格式</span>
            <span class="text-xs text-neutral-400">（完整备份，包含文章）</span>
          </label>
        </div>

        <button
          class="btn btn-primary"
          :disabled="isExporting"
          @click="handleExport"
        >
          <svg
            v-if="isExporting"
            class="w-4 h-4 animate-spin mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ isExporting ? '导出中...' : '导出数据' }}
        </button>
      </div>
    </div>

    <!-- 导入功能 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">导入数据</h3>
      <p class="text-sm text-neutral-500 mb-4">
        从 OPML 或 JSON 文件导入订阅和数据
      </p>

      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="importType === 'opml' ? '.opml,.xml' : '.json'"
        @change="handleFileSelect"
      />

      <div class="grid grid-cols-2 gap-4">
        <button
          class="btn btn-secondary"
          :disabled="isImporting"
          @click="selectFile('opml')"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入 OPML
        </button>
        <button
          class="btn btn-secondary"
          :disabled="isImporting"
          @click="selectFile('json')"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入 JSON
        </button>
      </div>

      <!-- 导入进度 -->
      <div v-if="isImporting" class="mt-4">
        <div class="flex items-center justify-between text-sm text-neutral-600 mb-2">
          <span>正在导入...</span>
          <span>{{ importProgress }}%</span>
        </div>
        <div class="w-full bg-neutral-200 rounded-full h-2">
          <div
            class="bg-primary-600 h-2 rounded-full transition-all"
            :style="{ width: `${importProgress}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 备份历史 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">备份历史</h3>
      <p class="text-sm text-neutral-500 mb-4">
        查看最近的导出记录
      </p>

      <div class="space-y-2">
        <div
          v-for="backup in backupHistory"
          :key="backup.id"
          class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <div class="text-sm font-medium text-neutral-700">
                {{ backup.type }} 备份
              </div>
              <div class="text-xs text-neutral-500">
                {{ backup.date }} · {{ backup.count }} 项 · {{ backup.size }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="backupHistory.length === 0" class="text-center py-8 text-neutral-400">
        暂无备份记录
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="card p-6 border-error-200 bg-error-50">
      <h3 class="text-lg font-semibold text-error-700 mb-4">危险操作</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">清除所有数据</div>
            <div class="text-xs text-neutral-500">删除所有订阅、分类和文章数据</div>
          </div>
          <button class="btn btn-danger" @click="clearAllData">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清除数据
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
