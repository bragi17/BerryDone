<script setup lang="ts">
import { computed } from 'vue'
import CalendarWidget from './CalendarWidget.vue'
import TodoWidget from './TodoWidget.vue'
import AppsWidget from './AppsWidget.vue'
import QuickRepliesWidget from './QuickRepliesWidget.vue'

const props = defineProps<{
  type: string
}>()

// 获取标题
const title = computed(() => {
  switch (props.type) {
    case 'calendar':
      return '📅 日历'
    case 'todo':
      return '✅ 今日待办'
    case 'apps':
      return '📱 应用快捷启动'
    case 'quick-replies':
      return '💬 快捷回复'
    default:
      return '小组件'
  }
})

// 获取对应的组件
const widgetComponent = computed(() => {
  switch (props.type) {
    case 'calendar':
      return CalendarWidget
    case 'todo':
      return TodoWidget
    case 'apps':
      return AppsWidget
    case 'quick-replies':
      return QuickRepliesWidget
    default:
      return null
  }
})

// 关闭窗口
const closeWindow = () => {
  window.electron.ipcRenderer.invoke('widget:close', props.type)
}
</script>

<template>
  <div class="standalone-widget">
    <!-- 拖拽区域 -->
    <div class="widget-header" style="-webkit-app-region: drag">
      <span class="widget-title">{{ title }}</span>
      <button
        class="close-btn"
        @click="closeWindow"
        title="关闭"
        style="-webkit-app-region: no-drag"
      >
        ×
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="widget-content">
      <component :is="widgetComponent" v-if="widgetComponent" />
    </div>
  </div>
</template>

<style scoped>
.standalone-widget {
  width: 100%;
  height: 100%;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.widget-header {
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-title {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  background: #f44336;
  color: white;
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
  color: #e0e0e0;
}

/* 滚动条样式 */
.widget-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.widget-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.widget-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.widget-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
