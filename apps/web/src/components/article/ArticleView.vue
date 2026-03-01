<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Article } from '@/types'

const props = defineProps<{
  article: Article | null
  isLoading?: boolean
  prevArticleId?: string
  nextArticleId?: string
}>()

const router = useRouter()

// 状态
const fontSize = ref(16)
const contentRef = ref<HTMLElement | null>(null)

// 发出事件
const emit = defineEmits<{
  (e: 'toggle-star'): void
  (e: 'mark-read'): void
  (e: 'prev', id: string): void
  (e: 'next', id: string): void
}>()

// 格式化日期
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 切换收藏
const toggleStar = () => {
  emit('toggle-star')
}

// 分享
const share = async () => {
  if (!props.article) return

  if (navigator.share) {
    try {
      await navigator.share({
        title: props.article.title,
        url: props.article.url,
      })
    } catch {
      // 用户取消或分享失败
    }
  } else {
    // 复制链接
    await navigator.clipboard.writeText(props.article.url)
    alert('链接已复制到剪贴板')
  }
}

// 上一篇
const goToPrev = () => {
  if (props.prevArticleId) {
    emit('prev', props.prevArticleId)
    router.push(`/article/${props.prevArticleId}`)
  }
}

// 下一篇
const goToNext = () => {
  if (props.nextArticleId) {
    emit('next', props.nextArticleId)
    router.push(`/article/${props.nextArticleId}`)
  }
}

// 返回列表
const goBack = () => {
  router.back()
}

// 调整字体大小
const increaseFontSize = () => {
  if (fontSize.value < 24) {
    fontSize.value += 2
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value -= 2
  }
}

// 键盘导航
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' || e.key === 'j') {
    goToPrev()
  } else if (e.key === 'ArrowRight' || e.key === 'k') {
    goToNext()
  } else if (e.key === 'Escape') {
    goBack()
  } else if (e.key === 's') {
    toggleStar()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// 监听文章变化，滚动到顶部
watch(() => props.article, () => {
  // 滚动到顶部
  if (contentRef.value) {
    contentRef.value.scrollTop = 0
  }
})
</script>

<template>
  <div class="flex h-full">
    <!-- 文章主体 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between px-6 py-3 border-b border-neutral-200 bg-white">
        <!-- 返回按钮 -->
        <button
          class="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span class="text-sm">返回</span>
        </button>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2">
          <!-- 字体大小 -->
          <div class="flex items-center gap-1 mr-2">
            <button
              class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
              title="减小字体"
              @click="decreaseFontSize"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            <span class="text-xs text-neutral-400 w-8 text-center">{{ fontSize }}</span>
            <button
              class="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
              title="增大字体"
              @click="increaseFontSize"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <!-- 收藏 -->
          <button
            class="p-2 rounded-lg transition-colors"
            :class="article?.isStarred ? 'text-warning-500 bg-warning-50' : 'text-neutral-400 hover:text-warning-500 hover:bg-warning-50'"
            :title="article?.isStarred ? '取消收藏' : '收藏'"
            @click="toggleStar"
          >
            <svg
              class="w-5 h-5"
              :fill="article?.isStarred ? 'currentColor' : 'none'"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <!-- 分享 -->
          <button
            class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title="分享"
            @click="share"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <!-- 打开原文 -->
          <a
            :href="article?.url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title="打开原文"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      <!-- 文章内容 -->
      <div
        ref="contentRef"
        class="flex-1 overflow-y-auto"
      >
        <!-- 加载状态 -->
        <div v-if="isLoading" class="max-w-3xl mx-auto p-6 animate-pulse">
          <div class="h-8 bg-neutral-200 rounded w-3/4 mb-6"></div>
          <div class="h-4 bg-neutral-100 rounded w-1/2 mb-8"></div>
          <div class="space-y-4">
            <div class="h-4 bg-neutral-100 rounded"></div>
            <div class="h-4 bg-neutral-100 rounded w-5/6"></div>
            <div class="h-4 bg-neutral-100 rounded w-4/6"></div>
          </div>
        </div>

        <!-- 文章详情 -->
        <article v-else-if="article" class="max-w-3xl mx-auto p-6">
          <!-- 头部信息 -->
          <header class="mb-8">
            <!-- 标题（可点击跳转原文） -->
            <h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4 leading-tight">
              <a
                :href="article.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-primary-600 transition-colors cursor-pointer group"
              >
                {{ article.title }}
                <svg class="w-5 h-5 inline-block ml-1 text-neutral-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </h1>

            <!-- 元信息 -->
            <div class="flex flex-wrap items-center gap-3 text-sm text-neutral-500 mb-4">
              <!-- 来源 -->
              <span v-if="article.source" class="flex items-center gap-1.5">
                <img
                  v-if="article.source.favicon"
                  :src="article.source.favicon"
                  :alt="article.source.name"
                  class="w-4 h-4 rounded"
                />
                {{ article.source.name }}
              </span>

              <span class="text-neutral-300">|</span>

              <!-- 作者 -->
              <span v-if="article.author" class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ article.author }}
              </span>

              <span class="text-neutral-300">|</span>

              <!-- 发布时间 -->
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(article.publishedAt) }}
              </span>

              <!-- 阅读时间 -->
              <span v-if="article.readTime" class="flex items-center gap-1.5">
                <span class="text-neutral-300">|</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ article.readTime }}
              </span>
            </div>

            <!-- 标签 -->
            <div v-if="article.tags && article.tags.length > 0" class="flex flex-wrap gap-2">
              <span
                v-for="tag in article.tags"
                :key="tag"
                class="px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-md"
              >
                #{{ tag }}
              </span>
            </div>
          </header>

          <!-- 正文内容 -->
          <div
            class="article-content prose prose-neutral prose-lg max-w-none
              prose-headings:font-semibold prose-headings:text-neutral-900
              prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-neutral-700 prose-p:leading-relaxed prose-p:my-4
              prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-neutral-900 prose-strong:font-semibold
              prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-neutral-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:italic prose-blockquote:text-neutral-600
              prose-ul:my-4 prose-ol:my-4
              prose-li:my-1 prose-li:text-neutral-700
              prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-primary-700
              prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
              prose-img:rounded-lg prose-img:shadow-md prose-img:max-w-full prose-img:my-6
              prose-hr:border-neutral-200 prose-hr:my-8
              prose-table:w-full prose-table:border-collapse
              prose-th:bg-neutral-50 prose-th:border prose-th:border-neutral-200 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-neutral-200 prose-td:px-3 prose-td:py-2"
            :style="{ fontSize: `${fontSize}px` }"
            v-html="article.content"
          ></div>
        </article>

        <!-- 文章不存在 -->
        <div v-else class="text-center py-16">
          <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-medium text-neutral-900 mb-2">文章不存在</h3>
          <p class="text-neutral-500 mb-4">该文章可能已被删除</p>
          <button class="btn-primary" @click="goBack">返回列表</button>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-white">
        <button
          class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !prevArticleId }"
          :disabled="!prevArticleId"
          @click="goToPrev"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          上一篇
        </button>

        <span class="text-xs text-neutral-400">
          按 J/K 或方向键切换文章
        </span>

        <button
          class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !nextArticleId }"
          :disabled="!nextArticleId"
          @click="goToNext"
        >
          下一篇
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
