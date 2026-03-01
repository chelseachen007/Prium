<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Subscription, Category } from '@/types'

const props = defineProps<{
  modelValue?: boolean
  subscription?: Subscription | null
  categories?: Category[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const api = useApi()

// 表单数据
const form = ref({
  title: '',
  categoryId: '',
  isActive: true,
})

// 状态
const isSaving = ref(false)
const error = ref('')

// 显示状态
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// 监听订阅数据变化
watch(() => props.subscription, (sub) => {
  if (sub) {
    form.value = {
      title: sub.title,
      categoryId: sub.categoryId || '',
      isActive: sub.isActive,
    }
  }
}, { immediate: true })

// 关闭弹窗
const close = () => {
  visible.value = false
  error.value = ''
}

// 保存
const handleSave = async () => {
  if (!props.subscription) return

  isSaving.value = true
  error.value = ''

  try {
    const response = await api.put(`/subscriptions/${props.subscription.id}`, {
      title: form.value.title,
      categoryId: form.value.categoryId || null,
      isActive: form.value.isActive,
    })

    if (response.success) {
      emit('saved')
      close()
    } else {
      error.value = response.error || '保存失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    isSaving.value = false
  }
}

// 删除
const handleDelete = async () => {
  if (!props.subscription) return
  if (!confirm('确定要删除此订阅吗？此操作不可恢复。')) return

  isSaving.value = true
  error.value = ''

  try {
    const response = await api.delete(`/subscriptions/${props.subscription.id}`)

    if (response.success) {
      emit('saved')
      close()
    } else {
      error.value = response.error || '删除失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩层 -->
        <div class="absolute inset-0 bg-black/50" @click="close"></div>

        <!-- 弹窗内容 -->
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <!-- 头部 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <h2 class="text-lg font-semibold text-neutral-900">编辑订阅</h2>
            <button
              class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 内容区 -->
          <div class="p-6 space-y-4">
            <!-- 错误提示 -->
            <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {{ error }}
            </div>

            <!-- 订阅标题 -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">订阅标题</label>
              <input
                v-model="form.title"
                type="text"
                class="input"
                placeholder="输入订阅标题"
              />
            </div>

            <!-- 订阅地址（只读） -->
            <div v-if="subscription">
              <label class="block text-sm font-medium text-neutral-700 mb-2">订阅地址</label>
              <div class="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-500 truncate">
                {{ subscription.url }}
              </div>
            </div>

            <!-- 分类选择 -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">分类</label>
              <select v-model="form.categoryId" class="input">
                <option value="">无分类</option>
                <option v-for="category in (categories || [])" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- 启用状态 -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-neutral-700">启用订阅</label>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="form.isActive ? 'bg-blue-600' : 'bg-neutral-200'"
                @click="form.isActive = !form.isActive"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <!-- 删除按钮 -->
            <button
              class="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              @click="handleDelete"
              :disabled="isSaving"
            >
              删除订阅
            </button>

            <!-- 右侧按钮 -->
            <div class="flex items-center gap-3">
              <button
                class="btn btn-secondary"
                @click="close"
                :disabled="isSaving"
              >
                取消
              </button>
              <button
                class="btn btn-primary"
                @click="handleSave"
                :disabled="isSaving || !form.title.trim()"
              >
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
