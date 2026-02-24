<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import ArticleViewComponent from '@/components/article/ArticleView.vue'
import type { Article } from '@/types'

const route = useRoute()
const router = useRouter()
const api = useApi()

const articleId = computed(() => route.params.id as string)

// 文章数据
const currentArticle = ref<Article | null>(null)
const isLoading = ref(true)
const error = ref('')

// 上一篇和下一篇 ID
const prevArticleId = ref<string | undefined>()
const nextArticleId = ref<string | undefined>()

// 加载文章详情
const loadArticle = async () => {
  if (!articleId.value) return

  isLoading.value = true
  error.value = ''

  try {
    const response = await api.get<any>(`/articles/${articleId.value}`)

    if (response.success && response.data) {
      const a = response.data
      currentArticle.value = {
        id: a.id,
        title: a.title,
        summary: a.summary || a.contentText?.substring(0, 200) || '',
        content: a.content || '',
        source: {
          id: a.subscriptionId,
          name: a.subscription?.title || '未知来源',
          url: a.subscription?.siteUrl || '',
          categoryId: a.subscription?.categoryId,
        },
        author: a.author,
        url: a.url,
        publishedAt: a.publishedAt || a.createdAt,
        readTime: a.readingTime ? `${a.readingTime} 分钟` : undefined,
        isRead: a.isRead,
        isStarred: a.isStarred,
        tags: a.aiTags || [],
        coverImage: a.imageUrl,
      }

      // 加载上一篇和下一篇
      loadAdjacentArticles()

      // 自动标记已读
      if (!a.isRead) {
        markRead()
      }
    } else {
      error.value = '文章不存在'
    }
  } catch (err) {
    console.error('Load article error:', err)
    error.value = '加载文章失败'
  } finally {
    isLoading.value = false
  }
}

// 加载相邻文章
const loadAdjacentArticles = async () => {
  try {
    const [prevRes, nextRes] = await Promise.all([
      api.get<any>(`/articles/${articleId.value}/previous`),
      api.get<any>(`/articles/${articleId.value}/next`),
    ])

    if (prevRes.success && prevRes.data) {
      prevArticleId.value = prevRes.data.id
    } else {
      prevArticleId.value = undefined
    }

    if (nextRes.success && nextRes.data) {
      nextArticleId.value = nextRes.data.id
    } else {
      nextArticleId.value = undefined
    }
  } catch (err) {
    console.error('Load adjacent articles error:', err)
  }
}

// 切换收藏
const toggleStar = async () => {
  if (!currentArticle.value) return

  try {
    const response = await api.put(`/articles/${articleId.value}/star`, {
      isStarred: !currentArticle.value.isStarred,
    })

    if (response.success) {
      currentArticle.value.isStarred = !currentArticle.value.isStarred
    }
  } catch (err) {
    console.error('Toggle star error:', err)
  }
}

// 标记已读
const markRead = async () => {
  if (!currentArticle.value || currentArticle.value.isRead) return

  try {
    const response = await api.put(`/articles/${articleId.value}/read`, {
      isRead: true,
    })

    if (response.success) {
      currentArticle.value.isRead = true
    }
  } catch (err) {
    console.error('Mark read error:', err)
  }
}

// 返回列表
const goBack = () => {
  router.back()
}

// 监听路由变化
watch(articleId, () => {
  loadArticle()
}, { immediate: true })
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="py-16 text-center">
      <svg class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <p class="text-neutral-500">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="py-16 text-center">
      <svg class="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-neutral-900 mb-2">{{ error }}</h3>
      <p class="text-neutral-500 mb-4">该文章可能已被删除</p>
      <button class="btn-primary" @click="goBack">返回列表</button>
    </div>

    <!-- 文章内容 -->
    <ArticleViewComponent
      v-else-if="currentArticle"
      :article="currentArticle"
      :is-loading="isLoading"
      :prev-article-id="prevArticleId"
      :next-article-id="nextArticleId"
      @toggle-star="toggleStar"
      @mark-read="markRead"
    />
  </div>
</template>
