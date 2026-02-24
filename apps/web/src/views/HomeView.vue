<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ArticleList from '@/components/article/ArticleList.vue'
import type { Article, ArticleFilter, ViewMode, SortOption } from '@/types'

const route = useRoute()

// 模拟文章数据
const allArticles = ref<Article[]>([
  {
    id: '1',
    title: 'Vue 3.4 发布：全新的响应式系统',
    summary: 'Vue 3.4 带来了全新的响应式系统，性能提升显著，同时引入了新的 API 如 defineModel 和改进的模板语法...',
    content: '<p>Vue 3.4 是一个重要的版本更新，带来了全新的响应式系统重构。这次更新不仅提升了性能，还引入了一些令人兴奋的新特性。</p><h2>性能提升</h2><p>新的响应式系统在内存使用和初始化速度上都有显著提升。根据基准测试，大型应用的初始化时间减少了约 40%。</p>',
    source: { id: '1', name: 'Vue Blog', url: 'https://blog.vuejs.org', favicon: '', categoryId: '1' },
    author: 'Evan You',
    url: 'https://blog.vuejs.org/posts/vue-3-4',
    publishedAt: '2024-01-15T10:00:00Z',
    readTime: '5 分钟',
    isRead: false,
    isStarred: false,
    tags: ['Vue', 'JavaScript', 'Frontend'],
    coverImage: '',
  },
  {
    id: '2',
    title: 'React 18 新特性详解',
    summary: 'React 18 引入了并发特性、自动批处理、Suspense 改进等新功能...',
    content: '<p>React 18 带来了并发渲染特性。</p>',
    source: { id: '2', name: 'React Blog', url: 'https://react.dev/blog', favicon: '', categoryId: '1' },
    author: 'React Team',
    url: 'https://react.dev/blog/react-18',
    publishedAt: '2024-01-14T10:00:00Z',
    readTime: '8 分钟',
    isRead: true,
    isStarred: true,
    tags: ['React', 'JavaScript'],
  },
  {
    id: '3',
    title: 'TypeScript 5.3 新特性解读',
    summary: 'TypeScript 5.3 引入了 Import Attributes、新的类型推断优化等特性，让类型系统更加强大...',
    content: '<p>TypeScript 5.3 是一个令人兴奋的版本，带来了多项新特性和改进。</p>',
    source: { id: '3', name: 'TypeScript Blog', url: 'https://devblogs.microsoft.com/typescript', favicon: '', categoryId: '2' },
    author: 'Microsoft',
    url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/',
    publishedAt: '2024-01-13T10:00:00Z',
    readTime: '6 分钟',
    isRead: false,
    isStarred: false,
    tags: ['TypeScript', 'JavaScript'],
  },
  {
    id: '4',
    title: 'Tailwind CSS v4.0 Alpha 发布',
    summary: 'Tailwind CSS v4.0 带来了全新的引擎，构建速度提升 10 倍，同时保持了原有的设计理念...',
    content: '<p>Tailwind CSS v4.0 是一个重大的架构升级。</p>',
    source: { id: '4', name: 'Tailwind Blog', url: 'https://tailwindcss.com/blog', favicon: '', categoryId: '3' },
    author: 'Adam Wathan',
    url: 'https://tailwindcss.com/blog/tailwindcss-v4-alpha',
    publishedAt: '2024-01-12T10:00:00Z',
    readTime: '6 分钟',
    isRead: false,
    isStarred: false,
    tags: ['CSS', 'Tailwind'],
  },
  {
    id: '5',
    title: 'Figma 新功能：Dev Mode 深度体验',
    summary: 'Figma 推出了面向开发者的 Dev Mode，让设计与开发的协作更加顺畅...',
    content: '<p>Dev Mode 是 Figma 专门为开发者设计的新功能。</p>',
    source: { id: '5', name: 'Figma Blog', url: 'https://figma.com/blog', favicon: '', categoryId: '4' },
    author: 'Figma Team',
    url: 'https://figma.com/blog/dev-mode',
    publishedAt: '2024-01-11T10:00:00Z',
    readTime: '4 分钟',
    isRead: false,
    isStarred: true,
    tags: ['Design', 'Figma'],
  },
])

// 状态
const isLoading = ref(false)
const currentFilter = ref<ArticleFilter>('all')
const currentView = ref<ViewMode>('list')
const currentSort = ref<SortOption>('date')
const hasMore = ref(false)
const selectedCategoryId = ref<string>('')

// 监听路由参数变化
watch(() => route.query.category, (categoryId) => {
  selectedCategoryId.value = (categoryId as string) || ''
}, { immediate: true })

// 过滤后的文章列表
const articles = computed(() => {
  let result = [...allArticles.value]

  // 按分类过滤
  if (selectedCategoryId.value) {
    result = result.filter(a => a.source.categoryId === selectedCategoryId.value)
  }

  // 应用过滤
  if (currentFilter.value === 'unread') {
    result = result.filter(a => !a.isRead)
  } else if (currentFilter.value === 'starred') {
    result = result.filter(a => a.isStarred)
  }

  // 应用排序
  if (currentSort.value === 'date') {
    result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  } else if (currentSort.value === 'source') {
    result.sort((a, b) => a.source.name.localeCompare(b.source.name))
  } else if (currentSort.value === 'readTime') {
    result.sort((a, b) => {
      const aTime = parseInt(a.readTime || '0')
      const bTime = parseInt(b.readTime || '0')
      return aTime - bTime
    })
  }

  return result
})

// 处理过滤变化
const handleFilterChange = (filter: ArticleFilter) => {
  currentFilter.value = filter
}

// 处理视图变化
const handleViewChange = (view: ViewMode) => {
  currentView.value = view
}

// 处理排序变化
const handleSortChange = (sort: SortOption) => {
  currentSort.value = sort
}

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
  // TODO: 实现 Obsidian 保存功能
}

// 加载更多
const loadMore = () => {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  // TODO: 加载更多文章
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
      <h2 class="text-2xl font-bold text-neutral-900">信息流</h2>
      <p class="text-neutral-500 mt-1">浏览最新的 RSS 订阅内容</p>
    </div>

    <!-- 文章列表 -->
    <ArticleList
      :articles="articles"
      :is-loading="isLoading"
      :has-more="hasMore"
      @load-more="loadMore"
      @toggle-star="toggleStar"
      @mark-read="markRead"
      @save-to-obsidian="saveToObsidian"
      @filter-change="handleFilterChange"
      @view-change="handleViewChange"
      @sort-change="handleSortChange"
    />
  </div>
</template>
