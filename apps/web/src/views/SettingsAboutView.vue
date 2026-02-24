<script setup lang="ts">
import { ref } from 'vue'

// 应用信息
const appInfo = ref({
  name: 'RSS Reader',
  version: '1.0.0',
  description: '一个现代化的 RSS 阅读器，支持智能过滤和 Obsidian 集成',
  author: 'RSS Reader Team',
  license: 'MIT',
  repository: 'https://github.com/chelseachen007/Prium',
})

// 技术栈
const techStack = [
  { name: 'Vue 3', description: '渐进式 JavaScript 框架', url: 'https://vuejs.org/' },
  { name: 'TypeScript', description: 'JavaScript 的超集，添加类型支持', url: 'https://www.typescriptlang.org/' },
  { name: 'Tailwind CSS', description: '实用优先的 CSS 框架', url: 'https://tailwindcss.com/' },
  { name: 'Hono', description: '快速、轻量的 Web 框架', url: 'https://hono.dev/' },
  { name: 'Prisma', description: '下一代 ORM', url: 'https://www.prisma.io/' },
  { name: 'SQLite', description: '轻量级数据库', url: 'https://www.sqlite.org/' },
]

// 功能列表
const features = [
  { icon: 'rss', title: 'RSS/Atom 订阅', description: '支持 RSS 2.0 和 Atom 格式' },
  { icon: 'category', title: '分类管理', description: '按分类组织你的订阅源' },
  { icon: 'opml', title: 'OPML 导入导出', description: '轻松迁移你的订阅' },
  { icon: 'read', title: '阅读模式', description: '专注阅读，无干扰体验' },
  { icon: 'star', title: '收藏功能', description: '收藏有价值的内容' },
  { icon: 'obsidian', title: 'Obsidian 集成', description: '保存文章到 Obsidian 笔记库' },
  { icon: 'filter', title: '智能过滤', description: '过滤重复和低质量内容' },
  { icon: 'search', title: '全文搜索', description: '快速找到你需要的内容' },
]

// 开源协议
const licenseText = ref(`
MIT License

Copyright (c) 2024 RSS Reader Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`.trim())
</script>

<template>
  <div class="space-y-6">
    <!-- 应用信息 -->
    <div class="card p-6 text-center">
      <div class="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">{{ appInfo.name }}</h2>
      <p class="text-neutral-500 mb-4">{{ appInfo.description }}</p>
      <div class="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-full">
        <span class="text-sm text-neutral-600">版本</span>
        <span class="text-sm font-medium text-neutral-900">{{ appInfo.version }}</span>
      </div>
    </div>

    <!-- 功能列表 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">主要功能</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg"
        >
          <!-- RSS Icon -->
          <svg v-if="feature.icon === 'rss'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <!-- Category Icon -->
          <svg v-if="feature.icon === 'category'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <!-- OPML Icon -->
          <svg v-if="feature.icon === 'opml'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <!-- Read Icon -->
          <svg v-if="feature.icon === 'read'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <!-- Star Icon -->
          <svg v-if="feature.icon === 'star'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <!-- Obsidian Icon -->
          <svg v-if="feature.icon === 'obsidian'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <!-- Filter Icon -->
          <svg v-if="feature.icon === 'filter'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <!-- Search Icon -->
          <svg v-if="feature.icon === 'search'" class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div>
            <div class="text-sm font-medium text-neutral-900">{{ feature.title }}</div>
            <div class="text-xs text-neutral-500">{{ feature.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">技术栈</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <a
          v-for="tech in techStack"
          :key="tech.name"
          :href="tech.url"
          target="_blank"
          rel="noopener noreferrer"
          class="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors group"
        >
          <div class="text-sm font-medium text-neutral-900 group-hover:text-primary-600">
            {{ tech.name }}
          </div>
          <div class="text-xs text-neutral-500">{{ tech.description }}</div>
        </a>
      </div>
    </div>

    <!-- 开源协议 -->
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">开源协议</h3>
        <span class="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
          {{ appInfo.license }}
        </span>
      </div>
      <pre class="p-4 bg-neutral-900 text-neutral-100 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">{{ licenseText }}</pre>
    </div>

    <!-- 链接 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">相关链接</h3>
      <div class="flex flex-wrap gap-3">
        <a
          :href="appInfo.repository"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm text-neutral-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a
          href="https://github.com/chelseachen007/Prium/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm text-neutral-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          反馈问题
        </a>
        <a
          href="https://github.com/chelseachen007/Prium/releases"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm text-neutral-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          更新日志
        </a>
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="text-center text-sm text-neutral-400 py-4">
      &copy; {{ new Date().getFullYear() }} {{ appInfo.author }}. All rights reserved.
    </div>
  </div>
</template>
