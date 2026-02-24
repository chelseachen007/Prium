<script setup lang="ts">
import { ref } from 'vue'

// 通知设置
const settings = ref({
  enableNotifications: false,
  newArticleNotify: true,
  updateNotify: false,
  dailyDigest: false,
  weeklyDigest: true,
  notifySound: true,
  notifyDesktop: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
})

// 关键词监控
const keywords = ref([
  { id: '1', keyword: 'Vue 3', enabled: true },
  { id: '2', keyword: 'TypeScript', enabled: true },
  { id: '3', keyword: 'RSS', enabled: false },
])

const newKeyword = ref('')

// 添加关键词
const addKeyword = () => {
  if (!newKeyword.value.trim()) return
  keywords.value.push({
    id: String(Date.now()),
    keyword: newKeyword.value.trim(),
    enabled: true,
  })
  newKeyword.value = ''
}

// 删除关键词
const removeKeyword = (id: string) => {
  keywords.value = keywords.value.filter(k => k.id !== id)
}

// 保存设置
const saveSettings = () => {
  console.log('Save notification settings:', settings.value)
  console.log('Save keywords:', keywords.value)
  alert('通知设置已保存')
}
</script>

<template>
  <div class="space-y-6">
    <!-- 通知开关 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">通知设置</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">启用通知</div>
            <div class="text-xs text-neutral-500">开启后可接收新文章提醒</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.enableNotifications" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">新文章通知</div>
            <div class="text-xs text-neutral-500">有新文章时发送通知</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.newArticleNotify" type="checkbox" class="sr-only peer" :disabled="!settings.enableNotifications" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" :class="{ 'opacity-50': !settings.enableNotifications }"></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">更新通知</div>
            <div class="text-xs text-neutral-500">订阅源有更新时发送通知</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.updateNotify" type="checkbox" class="sr-only peer" :disabled="!settings.enableNotifications" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" :class="{ 'opacity-50': !settings.enableNotifications }"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 摘要通知 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">摘要通知</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">每日摘要</div>
            <div class="text-xs text-neutral-500">每天发送一次文章摘要</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.dailyDigest" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">每周摘要</div>
            <div class="text-xs text-neutral-500">每周发送一次精选文章摘要</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.weeklyDigest" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 通知方式 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">通知方式</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">通知声音</div>
            <div class="text-xs text-neutral-500">收到通知时播放提示音</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.notifySound" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">桌面通知</div>
            <div class="text-xs text-neutral-500">在桌面显示系统通知</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.notifyDesktop" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- 免打扰时段 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">免打扰时段</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-neutral-700">启用免打扰</div>
            <div class="text-xs text-neutral-500">在指定时段内不发送通知</div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="settings.quietHoursEnabled" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div v-if="settings.quietHoursEnabled" class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-neutral-700 mb-2">开始时间</label>
            <input v-model="settings.quietHoursStart" type="time" class="input" />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-neutral-700 mb-2">结束时间</label>
            <input v-model="settings.quietHoursEnd" type="time" class="input" />
          </div>
        </div>
      </div>
    </div>

    <!-- 关键词监控 -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">关键词监控</h3>
      <p class="text-sm text-neutral-500 mb-4">
        当文章标题或内容包含以下关键词时，发送特别通知
      </p>

      <!-- 添加关键词 -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="newKeyword"
          type="text"
          placeholder="输入关键词"
          class="input flex-1"
          @keyup.enter="addKeyword"
        />
        <button class="btn btn-primary" @click="addKeyword">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加
        </button>
      </div>

      <!-- 关键词列表 -->
      <div class="space-y-2">
        <div
          v-for="keyword in keywords"
          :key="keyword.id"
          class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-neutral-700">{{ keyword.keyword }}</span>
            <span
              class="px-2 py-0.5 text-xs rounded-full"
              :class="keyword.enabled ? 'bg-success-100 text-success-700' : 'bg-neutral-200 text-neutral-500'"
            >
              {{ keyword.enabled ? '已启用' : '已禁用' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-primary-600 hover:text-primary-700"
              @click="keyword.enabled = !keyword.enabled"
            >
              {{ keyword.enabled ? '禁用' : '启用' }}
            </button>
            <button
              class="p-1 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded transition-colors"
              @click="removeKeyword(keyword.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="keywords.length === 0" class="text-center py-8 text-neutral-400">
        暂无监控关键词
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end">
      <button class="btn btn-primary" @click="saveSettings">保存设置</button>
    </div>
  </div>
</template>
