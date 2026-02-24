import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
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
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - RSS Reader` : 'RSS Reader'
  next()
})

export default router
