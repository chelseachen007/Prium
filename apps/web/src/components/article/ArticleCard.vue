<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Article } from '@/types'

const props = defineProps<{
  article: Article
  showSummary?: boolean
}>()

const router = useRouter()

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 相对时间
const relativeTime = computed(() => {
  const now = new Date()
  const published = new Date(props.article.publishedAt)
  const diff = now.getTime() - published.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return formatDate(props.article.publishedAt)
})

// 发出事件
const emit = defineEmits<{
  (e: 'toggle-star', id: string): void
  (e: 'mark-read', id: string): void
  (e: 'save-to-obsidian', id: string): void
}>()

// 切换收藏
const toggleStar = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  emit('toggle-star', props.article.id)
}

// 标记已读
const markRead = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  emit('mark-read', props.article.id)
}

// 保存到 Obsidian
const saveToObsidian = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  emit('save-to-obsidian', props.article.id)
}

// 打开文章详情
const openArticle = () => {
  router.push(`/article/${props.article.id}`)
}
</script>

<template>
  <article
    class="card p-4 sm:p-6 hover:shadow-soft transition-all cursor-pointer group"
    :class="{ 'opacity-60': article.isRead }"
    @click="openArticle"
  >
    <div class="flex gap-4">
      <!-- 封面图 -->
      <div v-if="article.coverImage" class="flex-shrink-0 hidden sm:block">
        <img
          :src="article.coverImage"
          :alt="article.title"
          class="w-24 h-24 object-cover rounded-lg"
        />
      </div>

      <!-- 内容区 -->
      <div class="flex-1 min-w-0">
        <!-- 头部：来源 + 时间 -->
        <div class="flex items-center gap-2 mb-2">
          <!-- 来源图标 -->
          <img
            v-if="article.source.favicon"
            :src="article.source.favicon"
            :alt="article.source.name"
            class="w-4 h-4 rounded"
          />
          <span class="text-xs text-neutral-500">{{ article.source.name }}</span>
          <span class="text-neutral-300">·</span>
          <span class="text-xs text-neutral-500">{{ relativeTime }}</span>
          <!-- 阅读时间 -->
          <span v-if="article.readTime" class="text-xs text-neutral-400">
            <span class="text-neutral-300 mx-1">·</span>
            {{ article.readTime }}
          </span>
        </div>

        <!-- 标题 -->
        <h3 class="text-base font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
          {{ article.title }}
        </h3>

        <!-- 摘要 -->
        <p
          v-if="showSummary !== false && article.summary"
          class="text-sm text-neutral-600 line-clamp-2 mb-3"
        >
          {{ article.summary }}
        </p>

        <!-- 标签 -->
        <div v-if="article.tags && article.tags.length > 0" class="flex flex-wrap gap-1.5 mb-3">
          <span
            v-for="tag in article.tags.slice(0, 3)"
            :key="tag"
            class="px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-600 rounded"
          >
            {{ tag }}
          </span>
          <span v-if="article.tags.length > 3" class="text-xs text-neutral-400">
            +{{ article.tags.length - 3 }}
          </span>
        </div>

        <!-- 底部操作栏 -->
        <div class="flex items-center justify-between">
          <!-- 状态标签 -->
          <div class="flex items-center gap-2">
            <span
              v-if="!article.isRead"
              class="w-2 h-2 bg-primary-500 rounded-full"
              title="未读"
            ></span>
            <span v-if="article.isStarred" class="text-warning-500 text-xs">
              已收藏
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <!-- 标记已读/未读 -->
            <button
              v-if="!article.isRead"
              class="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="标记已读"
              @click="markRead"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>

            <!-- 收藏 -->
            <button
              class="p-1.5 rounded-lg transition-colors"
              :class="article.isStarred ? 'text-warning-500 hover:bg-warning-50' : 'text-neutral-400 hover:text-warning-500 hover:bg-warning-50'"
              :title="article.isStarred ? '取消收藏' : '收藏'"
              @click="toggleStar"
            >
              <svg
                class="w-4 h-4"
                :fill="article.isStarred ? 'currentColor' : 'none'"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            <!-- 保存到 Obsidian -->
            <button
              class="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="保存到 Obsidian"
              @click="saveToObsidian"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            <!-- 打开原文 -->
            <a
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
              class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              title="打开原文"
              @click.stop
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
