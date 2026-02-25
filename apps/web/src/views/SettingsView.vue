<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 设置菜单项
const menuItems = [
  {
    id: 'general',
    title: '通用设置',
    description: '应用外观、语言等基础设置',
    icon: 'settings',
    path: '/settings',
  },
  {
    id: 'filters',
    title: '过滤规则',
    description: '自动处理新文章，如标记已读或添加标签',
    icon: 'filter',
    path: '/settings/filters',
  },
  {
    id: 'obsidian',
    title: 'Obsidian 配置',
    description: '配置 Obsidian 集成，同步文章到笔记库',
    icon: 'obsidian',
    path: '/settings/obsidian',
  },
  {
    id: 'notifications',
    title: '通知设置',
    description: '配置新文章提醒和更新通知',
    icon: 'bell',
    path: '/settings/notifications',
  },
  {
    id: 'import-export',
    title: '导入导出',
    description: 'OPML 导入导出，备份和恢复数据',
    icon: 'download',
    path: '/settings/import-export',
  },
  {
    id: 'about',
    title: '关于',
    description: '版本信息和开源协议',
    icon: 'info',
    path: '/settings/about',
  },
]

// 通用设置
const settings = ref({
  theme: 'light',
  language: 'zh-CN',
  articlesPerPage: 20,
  autoRefresh: true,
  refreshInterval: 30,
  showUnreadOnly: false,
})

const themes = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900">设置</h2>
      <p class="text-neutral-500 mt-1">管理应用设置和偏好</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 设置菜单 -->
      <nav class="lg:col-span-1">
        <div class="card p-2">
          <router-link
            v-for="item in menuItems"
            :key="item.id"
            :to="item.path"
            class="sidebar-item"
            :class="{ active: $route.path === item.path }"
          >
            <!-- Settings Icon -->
            <svg v-if="item.icon === 'settings'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <!-- Filter Icon -->
            <svg v-if="item.icon === 'filter'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <!-- Obsidian Icon -->
            <svg v-if="item.icon === 'obsidian'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <!-- Bell Icon -->
            <svg v-if="item.icon === 'bell'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <!-- Download Icon -->
            <svg v-if="item.icon === 'download'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <!-- Info Icon -->
            <svg v-if="item.icon === 'info'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium">{{ item.title }}</div>
              <div class="text-xs text-neutral-500 truncate">{{ item.description }}</div>
            </div>
          </router-link>
        </div>
      </nav>

      <!-- 设置内容 -->
      <div class="lg:col-span-3">
        <router-view />

        <!-- 默认显示通用设置 -->
        <div v-if="$route.path === '/settings'" class="space-y-6">
          <!-- 外观设置 -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-neutral-900 mb-4">外观设置</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">主题</div>
                  <div class="text-xs text-neutral-500">选择应用的显示主题</div>
                </div>
                <select v-model="settings.theme" class="input w-40">
                  <option v-for="theme in themes" :key="theme.value" :value="theme.value">
                    {{ theme.label }}
                  </option>
                </select>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">语言</div>
                  <div class="text-xs text-neutral-500">选择应用的显示语言</div>
                </div>
                <select v-model="settings.language" class="input w-40">
                  <option v-for="lang in languages" :key="lang.value" :value="lang.value">
                    {{ lang.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- 阅读设置 -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-neutral-900 mb-4">阅读设置</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">每页文章数</div>
                  <div class="text-xs text-neutral-500">设置列表中每页显示的文章数量</div>
                </div>
                <input
                  v-model.number="settings.articlesPerPage"
                  type="number"
                  min="10"
                  max="100"
                  class="input w-24 text-center"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">仅显示未读</div>
                  <div class="text-xs text-neutral-500">默认只显示未读文章</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input v-model="settings.showUnreadOnly" type="checkbox" class="sr-only peer" />
                  <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- 同步设置 -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-neutral-900 mb-4">同步设置</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">自动刷新</div>
                  <div class="text-xs text-neutral-500">自动检查订阅源更新</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input v-model="settings.autoRefresh" type="checkbox" class="sr-only peer" />
                  <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-neutral-700">刷新间隔</div>
                  <div class="text-xs text-neutral-500">自动刷新的时间间隔（分钟）</div>
                </div>
                <input
                  v-model.number="settings.refreshInterval"
                  type="number"
                  min="5"
                  max="120"
                  :disabled="!settings.autoRefresh"
                  class="input w-24 text-center"
                  :class="{ 'opacity-50': !settings.autoRefresh }"
                />
              </div>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="flex justify-end">
            <button class="btn-primary">保存设置</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
