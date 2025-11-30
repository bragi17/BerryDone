<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { NConfigProvider, darkTheme, NMessageProvider, NDialogProvider } from 'naive-ui'
import Sidebar from './components/Sidebar.vue'
import { useStore } from './store'

const store = useStore()

// 监听 tasks:updated 事件
const handleTasksUpdated = () => {
  console.log('[App] 收到 tasks:updated 事件，刷新数据...')
  store.init()
}

onMounted(() => {
  console.log('[App] 主程序挂载，初始化数据...')
  store.init()

  // 监听小组件的任务更新事件
  window.electron.ipcRenderer.on('tasks:updated', handleTasksUpdated)
})

onUnmounted(() => {
  // 清理事件监听器
  window.electron.ipcRenderer.removeListener('tasks:updated', handleTasksUpdated)
})
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-container">
          <Sidebar />
          <div class="main-content">
            <router-view />
          </div>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
