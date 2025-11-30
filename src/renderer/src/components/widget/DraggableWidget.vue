<script setup lang="ts">
import { ref, computed } from 'vue'
import CalendarWidget from './CalendarWidget.vue'
import TodoWidget from './TodoWidget.vue'
import AppsWidget from './AppsWidget.vue'
import QuickRepliesWidget from './QuickRepliesWidget.vue'

interface Widget {
  id: string
  type: 'calendar' | 'todo' | 'apps' | 'quick-replies'
  title: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
}

const props = defineProps<{
  widget: Widget
  isLocked: boolean
}>()

const emit = defineEmits<{
  drag: [id: string, x: number, y: number, width: number, height: number]
  resize: [id: string, x: number, y: number, width: number, height: number]
  dragEnd: []
  resizeEnd: []
}>()

const isDragging = ref(false)
const isResizing = ref(false)
const resizeHandle = ref<string | null>(null)

let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let startPosX = 0
let startPosY = 0

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  if (props.isLocked || isResizing.value) return

  isDragging.value = true
  startX = e.clientX
  startY = e.clientY
  startPosX = props.widget.x
  startPosY = props.widget.y

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY

  const newX = Math.max(0, startPosX + deltaX)
  const newY = Math.max(0, startPosY + deltaY)

  emit('drag', props.widget.id, newX, newY, props.widget.width, props.widget.height)
}

// 停止拖拽
const stopDrag = () => {
  if (!isDragging.value) return

  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  emit('dragEnd')
}

// 开始调整大小
const startResize = (e: MouseEvent, handle: string) => {
  if (props.isLocked) return

  isResizing.value = true
  resizeHandle.value = handle
  startX = e.clientX
  startY = e.clientY
  startWidth = props.widget.width
  startHeight = props.widget.height
  startPosX = props.widget.x
  startPosY = props.widget.y

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.stopPropagation()
  e.preventDefault()
}

// 调整大小中
const onResize = (e: MouseEvent) => {
  if (!isResizing.value || !resizeHandle.value) return

  const deltaX = e.clientX - startX
  const deltaY = e.clientY - startY

  let newWidth = startWidth
  let newHeight = startHeight
  let newX = startPosX
  let newY = startPosY

  // 根据拖拽手柄位置调整大小
  if (resizeHandle.value.includes('e')) {
    newWidth = Math.max(props.widget.minWidth, startWidth + deltaX)
  }
  if (resizeHandle.value.includes('w')) {
    newWidth = Math.max(props.widget.minWidth, startWidth - deltaX)
    newX = startPosX + (startWidth - newWidth)
  }
  if (resizeHandle.value.includes('s')) {
    newHeight = Math.max(props.widget.minHeight, startHeight + deltaY)
  }
  if (resizeHandle.value.includes('n')) {
    newHeight = Math.max(props.widget.minHeight, startHeight - deltaY)
    newY = startPosY + (startHeight - newHeight)
  }

  emit('resize', props.widget.id, newX, newY, newWidth, newHeight)
}

// 停止调整大小
const stopResize = () => {
  if (!isResizing.value) return

  isResizing.value = false
  resizeHandle.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  emit('resizeEnd')
}

// 组件样式
const widgetStyle = computed(() => ({
  left: `${props.widget.x}px`,
  top: `${props.widget.y}px`,
  width: `${props.widget.width}px`,
  height: `${props.widget.height}px`
}))

// 获取对应类型的组件
const widgetComponent = computed(() => {
  switch (props.widget.type) {
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
</script>

<template>
  <div
    class="draggable-widget"
    :class="{ dragging: isDragging, resizing: isResizing, locked: isLocked }"
    :style="widgetStyle"
  >
    <!-- 拖拽区域 -->
    <div class="widget-header" @mousedown="startDrag">
      <span class="widget-title">{{ widget.title }}</span>
    </div>

    <!-- 内容区域 -->
    <div class="widget-content">
      <component :is="widgetComponent" v-if="widgetComponent" />
    </div>

    <!-- 调整大小手柄 -->
    <template v-if="!isLocked">
      <div class="resize-handle n" @mousedown="startResize($event, 'n')"></div>
      <div class="resize-handle s" @mousedown="startResize($event, 's')"></div>
      <div class="resize-handle e" @mousedown="startResize($event, 'e')"></div>
      <div class="resize-handle w" @mousedown="startResize($event, 'w')"></div>
      <div class="resize-handle ne" @mousedown="startResize($event, 'ne')"></div>
      <div class="resize-handle nw" @mousedown="startResize($event, 'nw')"></div>
      <div class="resize-handle se" @mousedown="startResize($event, 'se')"></div>
      <div class="resize-handle sw" @mousedown="startResize($event, 'sw')"></div>
    </template>
  </div>
</template>

<style scoped>
.draggable-widget {
  position: absolute;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.draggable-widget:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.draggable-widget.dragging,
.draggable-widget.resizing {
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
}

.draggable-widget.locked {
  cursor: default;
}

.widget-header {
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: move;
  user-select: none;
}

.draggable-widget.locked .widget-header {
  cursor: default;
}

.widget-title {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
  color: #e0e0e0;
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
}

.resize-handle.n,
.resize-handle.s {
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle.n {
  top: -3px;
}

.resize-handle.s {
  bottom: -3px;
}

.resize-handle.e,
.resize-handle.w {
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle.e {
  right: -3px;
}

.resize-handle.w {
  left: -3px;
}

.resize-handle.ne,
.resize-handle.nw,
.resize-handle.se,
.resize-handle.sw {
  width: 12px;
  height: 12px;
}

.resize-handle.ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.resize-handle.nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

.resize-handle.se {
  bottom: -6px;
  right: -6px;
  cursor: nwse-resize;
}

.resize-handle.sw {
  bottom: -6px;
  left: -6px;
  cursor: nesw-resize;
}

.resize-handle:hover {
  background: rgba(139, 92, 246, 0.3);
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
