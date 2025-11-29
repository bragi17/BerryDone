<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import DraggableWidget from './DraggableWidget.vue'

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
  isLocked: boolean
}>()

// 小组件列表
const widgets = ref<Widget[]>([
  {
    id: '1',
    type: 'calendar',
    title: '日历',
    x: 20,
    y: 20,
    width: 300,
    height: 320,
    minWidth: 250,
    minHeight: 280
  },
  {
    id: '2',
    type: 'todo',
    title: '今日待办',
    x: 340,
    y: 20,
    width: 300,
    height: 400,
    minWidth: 250,
    minHeight: 300
  },
  {
    id: '3',
    type: 'apps',
    title: '应用快捷启动',
    x: 20,
    y: 360,
    width: 300,
    height: 200,
    minWidth: 250,
    minHeight: 150
  },
  {
    id: '4',
    type: 'quick-replies',
    title: '快捷回复',
    x: 340,
    y: 440,
    width: 300,
    height: 120,
    minWidth: 250,
    minHeight: 100
  }
])

// 对齐提示线
const alignmentGuides = reactive({
  vertical: null as number | null,
  horizontal: null as number | null
})

// 磁吸阈值（像素）
const SNAP_THRESHOLD = 8

// 更新组件位置
const updateWidgetPosition = (id: string, x: number, y: number) => {
  const widget = widgets.value.find(w => w.id === id)
  if (widget) {
    widget.x = x
    widget.y = y
  }
}

// 更新组件大小
const updateWidgetSize = (id: string, width: number, height: number) => {
  const widget = widgets.value.find(w => w.id === id)
  if (widget) {
    widget.width = width
    widget.height = height
  }
}

// 检查磁吸对齐
const checkSnapping = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number; showGuides: boolean } => {
  let snappedX = x
  let snappedY = y
  let showGuides = false

  alignmentGuides.vertical = null
  alignmentGuides.horizontal = null

  // 获取其他组件
  const otherWidgets = widgets.value.filter(w => w.id !== id)

  // 检查与其他组件的对齐
  for (const other of otherWidgets) {
    // 水平对齐检查
    // 左边缘对齐
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) {
      snappedX = other.x
      alignmentGuides.vertical = other.x
      showGuides = true
    }
    // 右边缘对齐
    else if (Math.abs(x + width - (other.x + other.width)) < SNAP_THRESHOLD) {
      snappedX = other.x + other.width - width
      alignmentGuides.vertical = other.x + other.width
      showGuides = true
    }
    // 左边缘对齐到右边缘
    else if (Math.abs(x - (other.x + other.width)) < SNAP_THRESHOLD) {
      snappedX = other.x + other.width
      alignmentGuides.vertical = other.x + other.width
      showGuides = true
    }
    // 右边缘对齐到左边缘
    else if (Math.abs(x + width - other.x) < SNAP_THRESHOLD) {
      snappedX = other.x - width
      alignmentGuides.vertical = other.x
      showGuides = true
    }

    // 垂直对齐检查
    // 上边缘对齐
    if (Math.abs(y - other.y) < SNAP_THRESHOLD) {
      snappedY = other.y
      alignmentGuides.horizontal = other.y
      showGuides = true
    }
    // 下边缘对齐
    else if (Math.abs(y + height - (other.y + other.height)) < SNAP_THRESHOLD) {
      snappedY = other.y + other.height - height
      alignmentGuides.horizontal = other.y + other.height
      showGuides = true
    }
    // 上边缘对齐到下边缘
    else if (Math.abs(y - (other.y + other.height)) < SNAP_THRESHOLD) {
      snappedY = other.y + other.height
      alignmentGuides.horizontal = other.y + other.height
      showGuides = true
    }
    // 下边缘对齐到上边缘
    else if (Math.abs(y + height - other.y) < SNAP_THRESHOLD) {
      snappedY = other.y - height
      alignmentGuides.horizontal = other.y
      showGuides = true
    }
  }

  return { x: snappedX, y: snappedY, showGuides }
}

// 处理拖拽
const handleDrag = (id: string, x: number, y: number, width: number, height: number) => {
  const snapped = checkSnapping(id, x, y, width, height)
  updateWidgetPosition(id, snapped.x, snapped.y)
}

// 处理调整大小
const handleResize = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const snapped = checkSnapping(id, x, y, width, height)
  updateWidgetPosition(id, snapped.x, snapped.y)
  updateWidgetSize(id, width, height)
}

// 清除对齐提示线
const clearGuides = () => {
  alignmentGuides.vertical = null
  alignmentGuides.horizontal = null
}

// 保存布局
const saveLayout = () => {
  const layout = widgets.value.map(w => ({
    id: w.id,
    type: w.type,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height
  }))
  localStorage.setItem('widget-layout', JSON.stringify(layout))
}

// 加载布局
const loadLayout = () => {
  const saved = localStorage.getItem('widget-layout')
  if (saved) {
    try {
      const layout = JSON.parse(saved)
      layout.forEach((saved: any) => {
        const widget = widgets.value.find(w => w.id === saved.id)
        if (widget) {
          widget.x = saved.x
          widget.y = saved.y
          widget.width = saved.width
          widget.height = saved.height
        }
      })
    } catch (e) {
      console.error('Failed to load widget layout:', e)
    }
  }
}

onMounted(() => {
  loadLayout()
})

// 自动保存布局
const autoSave = () => {
  saveLayout()
}

// 监听拖拽结束事件
const handleDragEnd = () => {
  clearGuides()
  autoSave()
}
</script>

<template>
  <div class="widget-container">
    <!-- 对齐提示线 -->
    <div
      v-if="alignmentGuides.vertical !== null"
      class="guide-line vertical"
      :style="{ left: alignmentGuides.vertical + 'px' }"
    ></div>
    <div
      v-if="alignmentGuides.horizontal !== null"
      class="guide-line horizontal"
      :style="{ top: alignmentGuides.horizontal + 'px' }"
    ></div>

    <!-- 小组件 -->
    <DraggableWidget
      v-for="widget in widgets"
      :key="widget.id"
      :widget="widget"
      :is-locked="isLocked"
      @drag="handleDrag"
      @resize="handleResize"
      @drag-end="handleDragEnd"
      @resize-end="handleDragEnd"
    />
  </div>
</template>

<style scoped>
.widget-container {
  position: relative;
  flex: 1;
  width: 100%;
  height: calc(100% - 45px);
  background: transparent;
  overflow: hidden;
}

.guide-line {
  position: absolute;
  background: #8b5cf6;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.8;
}

.guide-line.vertical {
  width: 2px;
  height: 100%;
  top: 0;
}

.guide-line.horizontal {
  height: 2px;
  width: 100%;
  left: 0;
}
</style>
