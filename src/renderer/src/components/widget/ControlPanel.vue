<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NSwitch } from 'naive-ui'
import {
  ArrowBackOutline,
  CloseOutline,
  RemoveOutline,
  CalendarOutline,
  CheckboxOutline,
  AppsOutline,
  ChatboxOutline,
  TimerOutline
} from '@vicons/ionicons5'

// 菜单显示状态
const showMenu = ref(false)

// 小组件状态
const widgetStates = ref({
  calendar: false,
  todo: false,
  apps: false,
  'quick-replies': false,
  timer: false
})

// 拖拽相关
const isDragging = ref(false)
const hasMoved = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const windowStartX = ref(0)
const windowStartY = ref(0)

// 草莓按钮点击
const toggleMenu = async () => {
  showMenu.value = !showMenu.value

  // 打开菜单时刷新状态
  if (showMenu.value) {
    await getWidgetStates()
  }
}

// 开始拖拽
const startDrag = async (e: MouseEvent) => {
  // 只响应左键
  if (e.button !== 0) return

  isDragging.value = true
  hasMoved.value = false
  dragStartX.value = e.screenX
  dragStartY.value = e.screenY

  // 获取当前窗口位置
  const pos = await window.electron.ipcRenderer.invoke('widget:getPosition', 'control')
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

  // 如果移动距离超过 5px，认为是拖拽
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    hasMoved.value = true
  }

  const newX = windowStartX.value + deltaX
  const newY = windowStartY.value + deltaY

  window.electron.ipcRenderer.invoke('widget:setPosition', 'control', newX, newY)
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 草莓按钮点击处理（需要区分点击和拖拽）
const handleStrawberryClick = (e: MouseEvent) => {
  // 如果移动过，不触发菜单切换
  if (!hasMoved.value) {
    toggleMenu()
  }
  hasMoved.value = false
}

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

// 切换小组件显示
const toggleWidget = async (type: string) => {
  // 乐观更新：先假设操作成功
  const currentState = widgetStates.value[type]
  widgetStates.value[type] = !currentState

  try {
    // 调用主进程切换
    await window.electron.ipcRenderer.invoke('widget:toggleWidget', type)

    // 延迟获取实际状态（等待窗口完全创建）
    setTimeout(async () => {
      const actualStates = await window.electron.ipcRenderer.invoke('widget:getStates')
      widgetStates.value = actualStates
    }, 150)
  } catch (error) {
    // 如果失败，恢复原状态
    console.error('Toggle widget failed:', error)
    widgetStates.value[type] = currentState
  }
}

// 获取小组件状态
const getWidgetStates = async () => {
  const states = await window.electron.ipcRenderer.invoke('widget:getStates')
  widgetStates.value = states
}

// 监听小组件状态变化
const handleStateChange = (_event: any, states: any) => {
  widgetStates.value = states
}

onMounted(async () => {
  // 获取初始状态
  await getWidgetStates()

  // 监听状态变化
  window.electron.ipcRenderer.on('widget:stateChanged', handleStateChange)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('widget:stateChanged', handleStateChange)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="control-panel">
    <!-- 草莓按钮 -->
    <button
      class="strawberry-button"
      @mousedown="startDrag"
      @click="handleStrawberryClick"
      :class="{ dragging: isDragging }"
    >
      🍓
    </button>

    <!-- 下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu">
      <!-- 小组件开关 -->
      <div class="menu-section">
        <div class="section-title">小组件</div>

        <div class="widget-item">
          <div class="widget-label">
            <n-icon :component="CalendarOutline" class="widget-icon" />
            <span>日历</span>
          </div>
          <n-switch v-model:value="widgetStates.calendar" @update:value="() => toggleWidget('calendar')" size="small" />
        </div>

        <div class="widget-item">
          <div class="widget-label">
            <n-icon :component="CheckboxOutline" class="widget-icon" />
            <span>今日待办</span>
          </div>
          <n-switch v-model:value="widgetStates.todo" @update:value="() => toggleWidget('todo')" size="small" />
        </div>

        <div class="widget-item">
          <div class="widget-label">
            <n-icon :component="AppsOutline" class="widget-icon" />
            <span>应用快捷启动</span>
          </div>
          <n-switch v-model:value="widgetStates.apps" @update:value="() => toggleWidget('apps')" size="small" />
        </div>

        <div class="widget-item">
          <div class="widget-label">
            <n-icon :component="ChatboxOutline" class="widget-icon" />
            <span>快捷回复</span>
          </div>
          <n-switch v-model:value="widgetStates['quick-replies']" @update:value="() => toggleWidget('quick-replies')" size="small" />
        </div>

        <div class="widget-item">
          <div class="widget-label">
            <n-icon :component="TimerOutline" class="widget-icon" />
            <span>计时器</span>
          </div>
          <n-switch v-model:value="widgetStates.timer" @update:value="() => toggleWidget('timer')" size="small" />
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="menu-divider"></div>

      <!-- 控制按钮 -->
      <div class="menu-section">
        <n-button class="menu-button" @click="returnToMain" text>
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回主程序
        </n-button>

        <n-button class="menu-button" @click="minimizeAll" text>
          <template #icon>
            <n-icon :component="RemoveOutline" />
          </template>
          最小化全部
        </n-button>

        <n-button class="menu-button close-button" @click="closeApp" text>
          <template #icon>
            <n-icon :component="CloseOutline" />
          </template>
          关闭程序
        </n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 5px;
}

/* 草莓按钮 */
.strawberry-button {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff6b9d 0%, #c9184a 100%);
  border: none;
  border-radius: 50%;
  font-size: 32px;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(201, 24, 74, 0.4);
  transition: all 0.3s ease;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.strawberry-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(201, 24, 74, 0.6);
}

.strawberry-button:active {
  transform: scale(0.95);
}

.strawberry-button.dragging {
  cursor: grabbing;
  transform: scale(1.05);
}

/* 下拉菜单 */
.dropdown-menu {
  width: 240px;
  margin-top: 10px;
  background: rgba(26, 26, 26, 0.85);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(30px);
  overflow: hidden;
  animation: slideDown 0.2s ease;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 菜单区域 */
.menu-section {
  padding: 12px;
}

.section-title {
  font-size: 12px;
  color: #8b5cf6;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 小组件项 */
.widget-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.widget-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.widget-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e0e0e0;
  font-size: 13px;
}

.widget-icon {
  font-size: 16px;
  color: #8b5cf6;
}

/* 分隔线 */
.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

/* 菜单按钮 */
.menu-button {
  width: 100%;
  justify-content: flex-start;
  color: #e0e0e0;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-button:hover {
  background: rgba(139, 92, 246, 0.2);
  color: #fff;
}

.menu-button.close-button:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #fff;
}
</style>
