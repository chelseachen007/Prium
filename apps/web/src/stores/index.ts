/**
 * Pinia Store 入口配置
 * @module stores
 */

import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出所有 stores
export { useSubscriptionStore } from './subscriptions'
export { useCategoryStore } from './categories'
export { useArticleStore } from './articles'
export { useSettingsStore } from './settings'
export { useUIStore } from './ui'
