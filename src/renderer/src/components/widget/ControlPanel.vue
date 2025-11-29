<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import {
  ArrowBackOutline,
  CloseOutline,
  RemoveOutline
} from '@vicons/ionicons5'

// 返回主窗口
const returnToMain = () => {
  window.electron.ipcRenderer.invoke('widget:returnToMain')
}

// 最小化所有小组件
const minimizeAll = () => {
  window.electron.ipcRenderer.invoke('widget:minimizeAll')
}

// 关闭应用程序
const closeApp = () => {
  if (confirm('确定要关闭应用程序吗？')) {
    window.electron.ipcRenderer.invoke('widget:closeApp')
  }
}
</script>

<template>
  <div class="control-panel">
    <div class="panel-header" style="-webkit-app-region: drag">
      <span class="panel-title">🍓 控制面板</span>
    </div>

    <div class="panel-content">
      <n-button class="control-button" @click="returnToMain" ghost>
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        返回主程序
      </n-button>

      <n-button class="control-button" @click="minimizeAll" ghost>
        <template #icon>
          <n-icon :component="RemoveOutline" />
        </template>
        最小化小组件
      </n-button>

      <n-button class="control-button close-button" @click="closeApp" ghost>
        <template #icon>
          <n-icon :component="CloseOutline" />
        </template>
        关闭程序
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  width: 100%;
  height: 100%;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px;
  background: rgba(139, 92, 246, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  user-select: none;
}

.panel-title {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-button {
  width: 100%;
  justify-content: flex-start;
  color: #e0e0e0;
  border-color: rgba(255, 255, 255, 0.2);
}

.control-button:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  color: #fff;
}

.control-button.close-button:hover {
  background: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
  color: #fff;
}
</style>
