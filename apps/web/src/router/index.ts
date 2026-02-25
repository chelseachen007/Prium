import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      title: '登录',
      isPublic: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: {
      title: '注册',
      isPublic: true,
    },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: {
      title: '登录中...',
      isPublic: true,
    },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: '首页',
      icon: 'home',
    },
  },
  {
    path: '/article/:id',
    name: 'article',
    component: () => import('@/views/ArticleView.vue'),
    meta: {
      title: '文章详情',
      hideFromNav: true,
    },
  },
  {
    path: '/subscriptions',
    name: 'subscriptions',
    component: () => import('@/views/SubscriptionsView.vue'),
    meta: {
      title: '订阅管理',
      icon: 'rss',
    },
  },
  {
    path: '/starred',
    name: 'starred',
    component: () => import('@/views/StarredView.vue'),
    meta: {
      title: '收藏',
      icon: 'star',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: {
      title: '设置',
      icon: 'settings',
    },
    children: [
      {
        path: 'obsidian',
        name: 'settings-obsidian',
        component: () => import('@/views/SettingsObsidianView.vue'),
        meta: {
          title: 'Obsidian 配置',
        },
      },
      {
        path: 'notifications',
        name: 'settings-notifications',
        component: () => import('@/views/SettingsNotificationsView.vue'),
        meta: {
          title: '通知设置',
        },
      },
      {
        path: 'import-export',
        name: 'settings-import-export',
        component: () => import('@/views/SettingsImportExportView.vue'),
        meta: {
          title: '导入导出',
        },
      },
      {
        path: 'about',
        name: 'settings-about',
        component: () => import('@/views/SettingsAboutView.vue'),
        meta: {
          title: '关于',
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - RSS Reader` : 'RSS Reader'

  // 认证检查
  const authStore = useAuthStore()
  if (!to.meta.isPublic && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
