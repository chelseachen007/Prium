<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ArticleList from '@/components/article/ArticleList.vue'
import type { Article } from '@/types'

// 模拟收藏文章列表
const allArticles = ref<Article[]>([
  {
    id: '2',
    title: 'TypeScript 5.3 新特性解读',
    summary: 'TypeScript 5.3 引入了 Import Attributes、新的类型推断优化等特性，让类型系统更加强大...',
    content: '<p>TypeScript 5.3 是一个令人兴奋的版本，带来了多项新特性和改进。</p>',
    source: { id: '2', name: 'TypeScript Blog', url: 'https://devblogs.microsoft.com/typescript', favicon: '' },
    author: 'Microsoft',
    url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/',
    publishedAt: '2024-01-14T10:00:00Z',
    readTime: '8 分钟',
    isRead: true,
    isStarred: true,
    tags: ['TypeScript', 'JavaScript'],
  },
  {
    id: '4',
    title: '2024 前端发展趋势预测',
    summary: '让我们来看看 2024 年前端领域可能出现的趋势和变化，包括 AI 辅助开发、服务端组件等...',
    content: '<p>2024 年前端领域将继续快速发展。</p>',
    source: { id: '4', name: 'Frontend Weekly', url: 'https://frontendweekly.com', favicon: '' },
    author: 'Frontend Team',
    url: 'https://frontendweekly.com/2024-trends',
    publishedAt: '2024-01-10T10:00:00Z',
    readTime: '10 分钟',
    isRead: false,
    isStarred: true,
    tags: ['Frontend', 'Trends'],
  },
])

// 状态
const isLoading = ref(false)
const hasMore = ref(false)

// 只显示收藏的文章
const starredArticles = computed(() => {
  return allArticles.value.filter(a => a.isStarred)
})

// 切换收藏
const toggleStar = (id: string) => {
  const article = allArticles.value.find(a => a.id === id)
  if (article) {
    article.isStarred = !article.isStarred
  }
}

// 标记已读
const markRead = (id: string) => {
  const article = allArticles.value.find(a => a.id === id)
  if (article) {
    article.isRead = true
  }
}

// 保存到 Obsidian
const saveToObsidian = (id: string) => {
  console.log('Save to Obsidian:', id)
}

// 加载更多
const loadMore = () => {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
}

onMounted(() => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900">收藏</h2>
      <p class="text-neutral-500 mt-1">你收藏的文章</p>
    </div>

    <!-- 统计信息 -->
    <div class="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl shadow-card">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-warning-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span class="text-sm font-medium text-neutral-700">{{ starredArticles.length }} 篇收藏</span>
      </div>
    </div>

    <!-- 文章列表 -->
    <ArticleList
      :articles="starredArticles"
      :is-loading="isLoading"
      :has-more="hasMore"
      @load-more="loadMore"
      @toggle-star="toggleStar"
      @mark-read="markRead"
      @save-to-obsidian="saveToObsidian"
    />
  </div>
</template>
