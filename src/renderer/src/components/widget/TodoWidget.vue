<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NEmpty } from 'naive-ui'

interface ScheduledTask {
  commissionId: string
  startDate: string
  endDate: string
  workDays: string[]
  hoursPerDay: Record<string, number>
  totalHours: number
  isLocked: boolean
  status?: string
}

interface Commission {
  id: string
  commissionID: string
  projectName: string
  priority: string
  status: string
}

interface TodoItem {
  id: string
  commissionId: string
  title: string
  completed: boolean
  priority: string
  hours: number
}

const todos = ref<TodoItem[]>([])
const loading = ref(true)
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]) // 默认显示今天

// 长按相关
const longPressTimer = ref<number | null>(null)
const longPressThreshold = 500 // 500ms

// 获取日期显示文本
const getDateText = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  if (selectedDate.value === today) {
    return '今日待办'
  }
  const date = new Date(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

// 加载指定日期的待办（排单数据）
const loadTodosForDate = async (dateStr: string) => {
  loading.value = true
  try {
    console.log('[TodoWidget] 加载日期:', dateStr)

    // 获取排单数据
    const scheduledTasks: ScheduledTask[] = await window.electron.ipcRenderer.invoke('scheduler:getScheduledTasks')
    console.log('[TodoWidget] 排单总数:', scheduledTasks.length)

    // 获取 Commission 数据
    const commissions: Commission[] = await window.electron.ipcRenderer.invoke('db:getVGenCommissions')
    console.log('[TodoWidget] Commissions 总数:', commissions.length)

    // 创建 commission map 以便快速查找
    const commissionMap = new Map(commissions.map(c => [c.commissionID || c.id, c]))

    // 筛选指定日期的排单
    todos.value = scheduledTasks
      .filter((task) => task.workDays.includes(dateStr))
      .map((task) => {
        const commission = commissionMap.get(task.commissionId)
        const completed = task.status === 'COMPLETED'
        console.log(`[TodoWidget] 任务 ${task.commissionId} status:`, task.status, 'completed:', completed)
        return {
          id: task.commissionId,
          commissionId: task.commissionId,
          title: commission?.projectName || `任务 ${task.commissionId}`,
          completed,
          priority: commission?.priority || 'NORMAL',
          hours: task.hoursPerDay[dateStr] || 0
        }
      })

    console.log('[TodoWidget] 该日期待办数量:', todos.value.length)
    console.log('[TodoWidget] 待办详情:', todos.value)
  } catch (error) {
    console.error('Failed to load todos:', error)
  } finally {
    loading.value = false
  }
}

// 切换完成状态
const toggleComplete = async (task: TodoItem) => {
  try {
    console.log('[TodoWidget] 切换完成状态 - 开始, taskId:', task.commissionId, '当前状态:', task.completed)

    // 获取所有排单
    const scheduledTasks: ScheduledTask[] = await window.electron.ipcRenderer.invoke('scheduler:getScheduledTasks')
    console.log('[TodoWidget] 获取到排单总数:', scheduledTasks.length)

    // 找到对应的排单任务
    const taskIndex = scheduledTasks.findIndex(t => t.commissionId === task.commissionId)
    console.log('[TodoWidget] 找到任务索引:', taskIndex)

    if (taskIndex !== -1) {
      const currentTask = scheduledTasks[taskIndex]
      console.log('[TodoWidget] 当前任务状态:', currentTask.status)

      // 切换状态
      const newStatus = currentTask.status === 'COMPLETED' ? 'NORMAL' : 'COMPLETED'
      scheduledTasks[taskIndex].status = newStatus
      console.log('[TodoWidget] 新状态:', newStatus)

      // 保存回数据库
      console.log('[TodoWidget] 保存排单到数据库...')
      await window.electron.ipcRenderer.invoke('scheduler:saveScheduledTasks', scheduledTasks)
      console.log('[TodoWidget] 保存成功')

      // 更新本地状态
      task.completed = newStatus === 'COMPLETED'
      console.log('[TodoWidget] 更新本地状态完成:', task.completed)
    } else {
      console.error('[TodoWidget] 未找到对应的排单任务')
    }
  } catch (error) {
    console.error('[TodoWidget] 切换完成状态失败:', error)
  }
}

// 开始长按
const startLongPress = (task: TodoItem) => {
  console.log('[TodoWidget] 开始长按, taskId:', task.commissionId)
  longPressTimer.value = window.setTimeout(() => {
    console.log('[TodoWidget] 长按时间到，触发切换完成状态')
    toggleComplete(task)
    longPressTimer.value = null
  }, longPressThreshold)
}

// 取消长按
const cancelLongPress = () => {
  if (longPressTimer.value) {
    console.log('[TodoWidget] 取消长按')
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// 获取优先级颜色
const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'HIGH':
      return '#f44336'
    case 'NORMAL':
      return '#ff9800'
    case 'LOW':
      return '#4caf50'
    default:
      return '#999'
  }
}

// 获取优先级文本
const getPriorityText = (priority?: string) => {
  switch (priority) {
    case 'HIGH':
      return '高优先级'
    case 'LOW':
      return '低优先级'
    default:
      return '普通优先级'
  }
}

onMounted(() => {
  console.log('[TodoWidget] 组件挂载，加载数据...')
  loadTodosForDate(selectedDate.value)

  // 监听任务更新事件
  window.electron.ipcRenderer.on('tasks:updated', () => {
    console.log('[TodoWidget] 收到 tasks:updated 事件，重新加载数据...')
    loadTodosForDate(selectedDate.value)
  })

  // 监听日历选择日期事件
  window.electron.ipcRenderer.on('calendar:dateSelected', (_event, dateStr: string) => {
    console.log('[TodoWidget] 收到日历选择事件:', dateStr)
    selectedDate.value = dateStr
    loadTodosForDate(dateStr)
  })
})
</script>

<template>
  <div class="todo-widget">
    <!-- 日期标题 -->
    <div class="date-header">{{ getDateText }}</div>

    <div v-if="loading" class="loading">加载中...</div>

    <n-empty v-else-if="todos.length === 0" description="该日期暂无排单" size="small">
      <template #icon>
        <span style="font-size: 32px">✓</span>
      </template>
    </n-empty>

    <div v-else class="todo-list">
      <div
        v-for="task in todos"
        :key="task.id"
        class="todo-item"
        :class="{ completed: task.completed }"
        @mousedown="startLongPress(task)"
        @mouseup="cancelLongPress"
        @mouseleave="cancelLongPress"
        @touchstart="startLongPress(task)"
        @touchend="cancelLongPress"
        @touchcancel="cancelLongPress"
      >
        <div class="todo-content">
          <div class="todo-title">{{ task.title }}</div>
          <div class="todo-meta">
            <span
              class="priority-indicator"
              :style="{ background: getPriorityColor(task.priority) }"
            ></span>
            <span class="priority-text">{{ getPriorityText(task.priority) }}</span>
            <span class="hours-text">{{ task.hours }}h</span>
          </div>
        </div>
        <div v-if="task.completed" class="completed-icon">✓</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.date-header {
  font-size: 14px;
  font-weight: 600;
  color: #8b5cf6;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  text-align: center;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  user-select: none;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.todo-item:active {
  background: rgba(139, 92, 246, 0.15);
}

.todo-item.completed {
  position: relative;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.todo-item.completed::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.05));
  border-radius: 6px;
  pointer-events: none;
}

.todo-item.completed:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
  color: #a5d6a7;
}

.completed-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #4caf50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  z-index: 2;
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes popIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.todo-title {
  font-size: 14px;
  color: #e0e0e0;
  line-height: 1.4;
  word-break: break-word;
  transition: all 0.3s ease;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.priority-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-text {
  font-size: 11px;
  color: #999;
}

.hours-text {
  font-size: 11px;
  color: #8b5cf6;
  font-weight: 600;
  margin-left: auto;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
