<template>
  <n-modal v-model:show="visible" :closable="false" :mask-closable="false">
    <n-card title="欢迎使用 BerryDone" style="width: 500px;">
      <p style="margin-bottom: 20px; color: #888;">
        检测到这是您第一次使用，是否要加载示例任务数据？
      </p>
      <n-space justify="end">
        <n-button @click="handleSkip">跳过</n-button>
        <n-button type="primary" @click="handleLoadSample">加载示例数据</n-button>
      </n-space>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { NModal, NCard, NButton, NSpace } from 'naive-ui'
import { useStore } from '../store'
import { generateSampleTasks } from '../utils/sampleData'

const visible = ref(false)
const store = useStore()

onMounted(async () => {
  // 等待下一个 tick 确保 store 已初始化
  await nextTick()
  // 延迟检查，确保数据已加载
  setTimeout(() => {
    if (store.tasks.value.length === 0) {
      visible.value = true
    }
  }, 1000)
})

const handleSkip = () => {
  visible.value = false
}

const handleLoadSample = async () => {
  const sampleTasks = generateSampleTasks()
  for (const task of sampleTasks) {
    await store.addTask(task)
  }
  visible.value = false
}
</script>

