<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ArticleView from '@/components/article/ArticleView.vue'
import type { Article } from '@/types'

const route = useRoute()
const articleId = computed(() => route.params.id as string)

// 模拟文章数据
const allArticles = ref<Article[]>([
  {
    id: '1',
    title: 'Vue 3.4 发布：全新的响应式系统',
    summary: 'Vue 3.4 带来了全新的响应式系统，性能提升显著，同时引入了新的 API...',
    content: `
      <p>Vue 3.4 是一个重要的版本更新，带来了全新的响应式系统重构。这次更新不仅提升了性能，还引入了一些令人兴奋的新特性。</p>

      <h2>性能提升</h2>
      <p>新的响应式系统在内存使用和初始化速度上都有显著提升。根据基准测试，大型应用的初始化时间减少了约 40%。</p>

      <h2>新特性</h2>
      <ul>
        <li><strong>defineModel</strong> - 简化双向绑定的定义</li>
        <li><strong>v-bind 同名简写</strong> - 更简洁的模板语法</li>
        <li><strong>改进的水合错误信息</strong> - 更容易调试 SSR 问题</li>
      </ul>

      <h2>迁移指南</h2>
      <p>大多数应用可以直接升级到 Vue 3.4，但建议先阅读官方迁移指南，了解可能的破坏性变更。</p>

      <blockquote>
        "Vue 3.4 是我们迄今为止最好的版本，感谢社区的持续贡献。" - Evan You
      </blockquote>
    `,
    source: { id: '1', name: 'Vue Blog', url: 'https://blog.vuejs.org', favicon: '' },
    author: 'Evan You',
    url: 'https://blog.vuejs.org/posts/vue-3-4',
    publishedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    readTime: '5 分钟',
    isRead: false,
    isStarred: false,
    tags: ['Vue', 'JavaScript', 'Frontend'],
  },
  {
    id: '2',
    title: 'TypeScript 5.3 新特性解读',
    summary: 'TypeScript 5.3 引入了 Import Attributes、新的类型推断优化等特性...',
    content: `
      <p>TypeScript 5.3 是一个令人兴奋的版本，带来了多项新特性和改进。</p>

      <h2>Import Attributes</h2>
      <p>支持在导入语句中添加类型断言，用于处理 JSON 模块和其他非 JavaScript 模块。</p>

      <h2>稳定的类型推断改进</h2>
      <p>改进了对复杂类型的推断能力，让代码更加简洁。</p>
    `,
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
    id: '3',
    title: 'Tailwind CSS v4.0 Alpha 发布',
    summary: 'Tailwind CSS v4.0 带来了全新的引擎，构建速度提升 10 倍...',
    content: `
      <p>Tailwind CSS v4.0 是一个重大的架构升级。</p>

      <h2>全新的构建引擎</h2>
      <p>使用 Rust 编写的新引擎，构建速度提升 10 倍以上。</p>
    `,
    source: { id: '3', name: 'Tailwind Blog', url: 'https://tailwindcss.com/blog', favicon: '' },
    author: 'Adam Wathan',
    url: 'https://tailwindcss.com/blog/tailwindcss-v4-alpha',
    publishedAt: '2024-01-13T10:00:00Z',
    readTime: '6 分钟',
    isRead: false,
    isStarred: false,
    tags: ['CSS', 'Tailwind'],
  },
  {
    id: '4',
    title: '2024 前端发展趋势预测',
    summary: '让我们来看看 2024 年前端领域可能出现的趋势和变化...',
    content: `
      <p>2024 年前端领域将继续快速发展。</p>

      <h2>AI 辅助开发</h2>
      <p>AI 工具将成为前端开发的标准配置。</p>
    `,
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

// 当前文章
const currentArticle = computed(() => {
  return allArticles.value.find(a => a.id === articleId.value) || null
})

// 当前文章索引
const currentIndex = computed(() => {
  return allArticles.value.findIndex(a => a.id === articleId.value)
})

// 上一篇和下一篇 ID
const prevArticleId = computed(() => {
  if (currentIndex.value > 0) {
    return allArticles.value[currentIndex.value - 1].id
  }
  return undefined
})

const nextArticleId = computed(() => {
  if (currentIndex.value < allArticles.value.length - 1) {
    return allArticles.value[currentIndex.value + 1].id
  }
  return undefined
})

// 加载状态
const isLoading = ref(true)

// 切换收藏
const toggleStar = () => {
  if (currentArticle.value) {
    currentArticle.value.isStarred = !currentArticle.value.isStarred
  }
}

// 标记已读
const markRead = () => {
  if (currentArticle.value) {
    currentArticle.value.isRead = true
  }
}

// 监听路由变化
watch(articleId, () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    // 自动标记已读
    markRead()
  }, 300)
}, { immediate: true })
</script>

<template>
  <ArticleView
    :article="currentArticle"
    :is-loading="isLoading"
    :prev-article-id="prevArticleId"
    :next-article-id="nextArticleId"
    @toggle-star="toggleStar"
    @mark-read="markRead"
  />
</template>
