<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CalendarWidget from './CalendarWidget.vue'
import TodoWidget from './TodoWidget.vue'
import AppsWidget from './AppsWidget.vue'
import QuickRepliesWidget from './QuickRepliesWidget.vue'

const props = defineProps<{
  type: string
}>()

// 双击右键关闭相关
const lastRightClickTime = ref(0)

// 拖拽相关
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const windowStartX = ref(0)
const windowStartY = ref(0)

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

// 右键菜单处理 - 双击右键关闭
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()

  const now = Date.now()
  const timeDiff = now - lastRightClickTime.value

  // 500ms 内连续两次右键点击则关闭
  if (timeDiff < 500 && timeDiff > 0) {
    closeWindow()
  }

  lastRightClickTime.value = now
}

// 开始拖拽
const startDrag = async (e: MouseEvent) => {
  // 只响应左键
  if (e.button !== 0) return

  isDragging.value = true
  dragStartX.value = e.screenX
  dragStartY.value = e.screenY

  // 获取当前窗口位置
  const pos = await window.electron.ipcRenderer.invoke('widget:getPosition', props.type)
  windowStartX.value = pos[0]
  windowStartY.value = pos[1]

  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)

  // 防止选中文字
  e.preventDefault()
}

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = e.screenX - dragStartX.value
  const deltaY = e.screenY - dragStartY.value

  const newX = windowStartX.value + deltaX
  const newY = windowStartY.value + deltaY

  window.electron.ipcRenderer.invoke('widget:setPosition', props.type, newX, newY)
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onMounted(() => {
  console.log(`[StandaloneWidget] ${props.type} 已挂载，手动拖拽已启用`)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="standalone-widget" @contextmenu="handleContextMenu">
    <!-- 拖拽区域 - 顶部 30px -->
    <div
      class="drag-handle"
      @mousedown="startDrag"
      :class="{ dragging: isDragging }"
    ></div>

    <!-- 内容区域 -->
    <div class="widget-content">
      <component :is="widgetComponent" v-if="widgetComponent" />
    </div>
  </div>
</template>

<style scoped>
.standalone-widget {
  position: relative;
  width: 100%;
  height: 100%;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 拖拽区域 */
.drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  cursor: move;
  z-index: 10;
  border-radius: 12px 12px 0 0;
  transition: background 0.2s;
}

/* hover 时提示 */
.drag-handle:hover {
  background: linear-gradient(
    to bottom,
    rgba(139, 92, 246, 0.2),
    transparent
  );
}

/* 拖拽中状态 */
.drag-handle.dragging {
  background: linear-gradient(
    to bottom,
    rgba(139, 92, 246, 0.3),
    transparent
  );
}

.widget-content {
  flex: 1;
  padding: 12px;
  padding-top: 8px;
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
