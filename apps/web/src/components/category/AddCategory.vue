<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoryStore } from '@/stores/categories'

const props = defineProps<{
  modelValue?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const store = useCategoryStore()

// 表单数据
const name = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

// 显示状态
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// 关闭弹窗
const close = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  name.value = ''
  error.value = null
  isLoading.value = false
}

// 提交
const submit = async () => {
  if (!name.value.trim()) return

  isLoading.value = true
  error.value = null

  try {
    await store.createCategory({
      name: name.value.trim(),
    })
    emit('success')
    close()
  } catch (e) {
    const err = e as any
    error.value = err.message || '添加分类失败'
  } finally {
    isLoading.value = false
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
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
          <!-- 头部 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <h2 class="text-lg font-semibold text-neutral-900">添加分类</h2>
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
          <div class="p-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                分类名称
              </label>
              <input
                v-model="name"
                type="text"
                placeholder="输入分类名称..."
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                autofocus
                @keyup.enter="submit"
              />
              <p v-if="error" class="mt-1.5 text-xs text-red-600">
                {{ error }}
              </p>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <button
              class="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              @click="close"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!name.trim() || isLoading"
              @click="submit"
            >
              {{ isLoading ? '添加中...' : '添加' }}
            </button>
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

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
