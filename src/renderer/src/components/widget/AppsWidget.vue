<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NEmpty } from 'naive-ui'
import { AddCircleOutline, CloseCircleOutline } from '@vicons/ionicons5'

interface App {
  name: string
  path: string
  icon?: string
}

const apps = ref<App[]>([])

// 加载应用列表
const loadApps = () => {
  const saved = localStorage.getItem('widget-apps')
  if (saved) {
    try {
      apps.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load apps:', e)
      apps.value = []
    }
  }
}

// 保存应用列表
const saveApps = () => {
  localStorage.setItem('widget-apps', JSON.stringify(apps.value))
}

// 添加应用
const addApp = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('widget:selectApp')
    if (result && result.path) {
      apps.value.push({
        name: result.name,
        path: result.path,
        icon: result.icon
      })
      saveApps()
    }
  } catch (error) {
    console.error('Failed to add app:', error)
  }
}

// 启动应用
const launchApp = async (app: App) => {
  try {
    await window.electron.ipcRenderer.invoke('widget:launchApp', app.path)
  } catch (error) {
    console.error('Failed to launch app:', error)
  }
}

// 删除应用
const removeApp = (index: number) => {
  apps.value.splice(index, 1)
  saveApps()
}

// 获取应用名称的首字母
const getAppInitial = (name: string) => {
  return name.charAt(0).toUpperCase()
}

onMounted(() => {
  loadApps()
})
</script>

<template>
  <div class="apps-widget">
    <div class="apps-header">
      <n-button size="small" @click="addApp" secondary>
        <template #icon>
          <n-icon :component="AddCircleOutline" />
        </template>
        添加应用
      </n-button>
    </div>

    <n-empty v-if="apps.length === 0" description="暂无应用" size="small">
      <template #icon>
        <span style="font-size: 32px">📱</span>
      </template>
    </n-empty>

    <div v-else class="apps-grid">
      <div v-for="(app, index) in apps" :key="index" class="app-item">
        <div class="app-icon-wrapper" @click="launchApp(app)">
          <div v-if="!app.icon" class="app-icon-placeholder">
            {{ getAppInitial(app.name) }}
          </div>
          <img v-else :src="app.icon" :alt="app.name" class="app-icon" />
        </div>
        <div class="app-name" :title="app.name">{{ app.name }}</div>
        <button class="remove-btn" @click="removeApp(index)">
          <n-icon :component="CloseCircleOutline" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apps-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.apps-header {
  display: flex;
  justify-content: flex-end;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 12px;
  overflow-y: auto;
}

.app-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.app-icon-wrapper {
  width: 48px;
  height: 48px;
  cursor: pointer;
  transition: transform 0.2s;
}

.app-icon-wrapper:hover {
  transform: scale(1.1);
}

.app-icon-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.app-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.app-name {
  font-size: 11px;
  color: #e0e0e0;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  position: absolute;
  top: -4px;
  right: 8px;
  width: 18px;
  height: 18px;
  border: none;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  transition: all 0.2s;
}

.app-item:hover .remove-btn {
  display: flex;
}

.remove-btn:hover {
  background: #f44336;
  transform: scale(1.1);
}

.apps-grid::-webkit-scrollbar {
  width: 4px;
}

.apps-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.apps-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.apps-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
