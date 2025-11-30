<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CalendarWidget from './CalendarWidget.vue'
import TodoWidget from './TodoWidget.vue'
import AppsWidget from './AppsWidget.vue'
import QuickRepliesWidget from './QuickRepliesWidget.vue'
import TimerWidget from './TimerWidget.vue'

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

// 调整大小相关
const isResizing = ref(false)

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
    case 'timer':
      return TimerWidget
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

  // 如果正在调整大小，禁止拖拽
  if (isResizing.value) return

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

// 开始调整大小 - 使用全局鼠标追踪
const startResize = async (e: MouseEvent, direction: string) => {
  if (e.button !== 0) return

  isResizing.value = true

  // 调用主进程开始全局调整大小
  await window.electron.ipcRenderer.invoke(
    'widget:startGlobalResize',
    props.type,
    direction,
    e.screenX,
    e.screenY
  )

  // 监听鼠标释放事件（在窗口内）
  document.addEventListener('mouseup', stopResize)
  // 也监听全局的鼠标释放（通过定时检测）
  startMouseUpDetection()

  e.preventDefault()
  e.stopPropagation()
}

// 鼠标释放检测（用于检测窗口外的释放）
let mouseUpCheckInterval: number | null = null

const startMouseUpDetection = () => {
  // 定时检查鼠标按钮状态
  mouseUpCheckInterval = window.setInterval(() => {
    // 通过监听 mousemove 并检查 buttons 来判断是否释放
  }, 100)

  // 添加全局 mousemove 监听来检测鼠标释放
  document.addEventListener('mousemove', checkMouseUp)
}

const checkMouseUp = (e: MouseEvent) => {
  // buttons === 0 表示没有按键被按下
  if (e.buttons === 0 && isResizing.value) {
    stopResize()
  }
}

// 停止调整大小
const stopResize = () => {
  if (!isResizing.value) return

  isResizing.value = false

  // 通知主进程停止调整
  window.electron.ipcRenderer.invoke('widget:stopGlobalResize')

  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', checkMouseUp)

  if (mouseUpCheckInterval) {
    clearInterval(mouseUpCheckInterval)
    mouseUpCheckInterval = null
  }
}

onMounted(() => {
  console.log(`[StandaloneWidget] ${props.type} 已挂载，手动拖拽和调整大小已启用`)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', checkMouseUp)
  if (mouseUpCheckInterval) {
    clearInterval(mouseUpCheckInterval)
  }
  // 确保停止任何进行中的调整
  window.electron.ipcRenderer.invoke('widget:stopGlobalResize')
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

    <!-- 调整大小手柄 -->
    <!-- 边缘手柄 -->
    <div class="resize-handle resize-n" @mousedown="(e) => startResize(e, 'n')"></div>
    <div class="resize-handle resize-e" @mousedown="(e) => startResize(e, 'e')"></div>
    <div class="resize-handle resize-s" @mousedown="(e) => startResize(e, 's')"></div>
    <div class="resize-handle resize-w" @mousedown="(e) => startResize(e, 'w')"></div>

    <!-- 角落手柄 -->
    <div class="resize-handle resize-nw" @mousedown="(e) => startResize(e, 'nw')"></div>
    <div class="resize-handle resize-ne" @mousedown="(e) => startResize(e, 'ne')"></div>
    <div class="resize-handle resize-sw" @mousedown="(e) => startResize(e, 'sw')"></div>
    <div class="resize-handle resize-se" @mousedown="(e) => startResize(e, 'se')"></div>

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
  background: rgba(26, 26, 26, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
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

/* 调整大小手柄基础样式 */
.resize-handle {
  position: absolute;
  z-index: 15;
  background: transparent;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: rgba(139, 92, 246, 0.3);
}

/* 边缘手柄 */
.resize-n {
  top: 0;
  left: 8px;
  right: 8px;
  height: 8px;
  cursor: ns-resize;
  border-radius: 12px 12px 0 0;
}

.resize-e {
  top: 8px;
  right: 0;
  bottom: 8px;
  width: 8px;
  cursor: ew-resize;
  border-radius: 0 12px 12px 0;
}

.resize-s {
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 8px;
  cursor: ns-resize;
  border-radius: 0 0 12px 12px;
}

.resize-w {
  top: 8px;
  left: 0;
  bottom: 8px;
  width: 8px;
  cursor: ew-resize;
  border-radius: 12px 0 0 12px;
}

/* 角落手柄 */
.resize-nw {
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  border-radius: 12px 0 0 0;
}

.resize-ne {
  top: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: nesw-resize;
  border-radius: 0 12px 0 0;
}

.resize-sw {
  bottom: 0;
  left: 0;
  width: 12px;
  height: 12px;
  cursor: nesw-resize;
  border-radius: 0 0 0 12px;
}

.resize-se {
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  border-radius: 0 0 12px 0;
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
