<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NInput, NSelect, useMessage } from 'naive-ui'
import { AddCircleOutline, CloseCircleOutline, CreateOutline, PlayOutline, PauseOutline } from '@vicons/ionicons5'
import { formatDateString, getTodayString } from '../../utils/dateUtils'

interface Timer {
  id: string
  description: string
  totalSeconds: number // 累计秒数
  isRunning: boolean
  startTime: number | null // 开始时间戳
}

const message = useMessage()
const timers = ref<Timer[]>([])
const isAdding = ref(false)
const newTimerDescription = ref('')
const editingId = ref<string | null>(null)
const editDescription = ref('')
const currentTime = ref(Date.now()) // 用于强制更新视图

// 今日 todo 选项
const todayTodos = ref<Array<{ label: string; value: string }>>([])
const selectedTodoForNew = ref<string | null>(null)
const selectedTodoForEdit = ref<string | null>(null)

// 定时器，用于更新正在运行的计时器
let updateInterval: number | null = null

// 加载计时器
const loadTimers = () => {
  const saved = localStorage.getItem('widget-timers')
  if (saved) {
    try {
      timers.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load timers:', e)
      timers.value = []
    }
  }
}

// 保存计时器
const saveTimers = () => {
  localStorage.setItem('widget-timers', JSON.stringify(timers.value))
}

// 加载今日 todo 列表
const loadTodayTodos = async () => {
  try {
    console.log('[TimerWidget] 开始加载今日待办...')

    // 获取排单数据
    const scheduledTasks = await window.electron.ipcRenderer.invoke('scheduler:getScheduledTasks')
    console.log('[TimerWidget] 排单总数:', scheduledTasks?.length || 0)

    if (!scheduledTasks || scheduledTasks.length === 0) {
      console.log('[TimerWidget] 无排单数据')
      todayTodos.value = []
      return
    }

    // 获取 Commission 数据
    const commissions = await window.electron.ipcRenderer.invoke('db:getVGenCommissions')
    console.log('[TimerWidget] Commissions 总数:', commissions?.length || 0)

    // 创建 commission map
    const commissionMap = new Map(commissions.map((c: any) => [c.commissionID || c.id, c]))

    // 获取今日日期字符串（时区安全）
    const today = getTodayString()
    console.log('[TimerWidget] 今日日期:', today)

    // 筛选今日的排单任务
    const todayTasks = scheduledTasks
      .filter((task: any) => {
        const hasToday = task.workDays && task.workDays.includes(today)
        if (hasToday) {
          console.log('[TimerWidget] 今日任务:', task.commissionId)
        }
        return hasToday
      })
      .map((task: any) => {
        const commission = commissionMap.get(task.commissionId)
        const label = commission?.projectName || `任务 ${task.commissionId}`
        return {
          label,
          value: label
        }
      })

    todayTodos.value = todayTasks
    console.log('[TimerWidget] 今日待办数量:', todayTodos.value.length)
  } catch (error) {
    console.error('[TimerWidget] 加载今日待办失败:', error)
    todayTodos.value = []
  }
}

// 格式化时间显示（HH:MM:SS）
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 获取计时器当前显示的秒数
const getCurrentSeconds = (timer: Timer): number => {
  if (timer.isRunning && timer.startTime) {
    // 使用 currentTime.value 来确保响应式更新
    const now = currentTime.value
    const elapsed = Math.floor((now - timer.startTime) / 1000)
    // 确保不会显示负数
    return timer.totalSeconds + Math.max(0, elapsed)
  }
  return timer.totalSeconds
}

// 添加计时器
const addTimer = () => {
  let description = newTimerDescription.value.trim()

  // 如果选择了 todo，使用 todo 描述
  if (selectedTodoForNew.value) {
    description = selectedTodoForNew.value
  }

  if (!description) {
    message.warning('请输入计时描述或选择今日待办')
    return
  }

  timers.value.unshift({
    id: Date.now().toString(),
    description,
    totalSeconds: 0,
    isRunning: false,
    startTime: null
  })

  saveTimers()
  newTimerDescription.value = ''
  selectedTodoForNew.value = null
  isAdding.value = false
  message.success('添加成功')
}

// 切换计时器状态（开始/暂停）
const toggleTimer = (timer: Timer) => {
  if (timer.isRunning) {
    // 暂停
    if (timer.startTime) {
      const elapsed = Math.floor((Date.now() - timer.startTime) / 1000)
      timer.totalSeconds += elapsed
    }
    timer.isRunning = false
    timer.startTime = null
  } else {
    // 开始 - 先更新 currentTime 再设置 startTime，避免时间差
    currentTime.value = Date.now()
    timer.isRunning = true
    timer.startTime = currentTime.value
  }
  saveTimers()
}

// 删除计时器
const removeTimer = (id: string) => {
  timers.value = timers.value.filter(t => t.id !== id)
  saveTimers()
  message.success('删除成功')
}

// 开始编辑
const startEdit = (timer: Timer) => {
  editingId.value = timer.id
  editDescription.value = timer.description
  selectedTodoForEdit.value = null
}

// 保存编辑
const saveEdit = (id: string) => {
  let description = editDescription.value.trim()

  // 如果选择了 todo，使用 todo 描述
  if (selectedTodoForEdit.value) {
    description = selectedTodoForEdit.value
  }

  if (!description) {
    message.warning('请输入计时描述或选择今日待办')
    return
  }

  const timer = timers.value.find(t => t.id === id)
  if (timer) {
    timer.description = description
    saveTimers()
    message.success('修改成功')
  }

  editingId.value = null
  editDescription.value = ''
  selectedTodoForEdit.value = null
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editDescription.value = ''
  selectedTodoForEdit.value = null
}

// 取消添加
const cancelAdd = () => {
  isAdding.value = false
  newTimerDescription.value = ''
  selectedTodoForNew.value = null
}

// 启动更新定时器
const startUpdateInterval = () => {
  updateInterval = window.setInterval(() => {
    // 更新当前时间以触发视图更新
    currentTime.value = Date.now()

    // 保存正在运行的计时器状态
    const running = timers.value.filter(t => t.isRunning)
    if (running.length > 0) {
      saveTimers()
    }
  }, 1000)
}

// 停止更新定时器
const stopUpdateInterval = () => {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

onMounted(() => {
  loadTimers()
  loadTodayTodos()
  startUpdateInterval()

  // 监听任务更新事件
  window.electron.ipcRenderer.on('tasks:updated', () => {
    console.log('[TimerWidget] 收到 tasks:updated 事件，重新加载今日待办...')
    loadTodayTodos()
  })
})

onUnmounted(() => {
  stopUpdateInterval()
  // 移除事件监听器
  window.electron.ipcRenderer.removeAllListeners('tasks:updated')
})
</script>

<template>
  <div class="timer-widget">
    <!-- 添加计时器表单 -->
    <div v-if="isAdding" class="add-form">
      <n-select
        v-model:value="selectedTodoForNew"
        :options="todayTodos"
        placeholder="选择今日待办（可选）"
        clearable
        size="small"
      />
      <n-input
        v-model:value="newTimerDescription"
        placeholder="或手动输入计时描述..."
        size="small"
        :disabled="!!selectedTodoForNew"
      />
      <div class="form-actions">
        <n-button size="tiny" @click="cancelAdd">取消</n-button>
        <n-button size="tiny" type="primary" @click="addTimer">确定</n-button>
      </div>
    </div>

    <!-- 计时器列表 -->
    <div v-if="!isAdding" class="timers-list">
      <div v-for="timer in timers" :key="timer.id" class="timer-item">
        <!-- 编辑模式 -->
        <div v-if="editingId === timer.id" class="edit-form">
          <n-select
            v-model:value="selectedTodoForEdit"
            :options="todayTodos"
            placeholder="选择今日待办（可选）"
            clearable
            size="small"
          />
          <n-input
            v-model:value="editDescription"
            placeholder="或手动输入计时描述..."
            size="small"
            :disabled="!!selectedTodoForEdit"
          />
          <div class="form-actions">
            <n-button size="tiny" @click="cancelEdit">取消</n-button>
            <n-button size="tiny" type="primary" @click="saveEdit(timer.id)">保存</n-button>
          </div>
        </div>

        <!-- 显示模式 -->
        <template v-else>
          <div class="timer-main" @click="toggleTimer(timer)">
            <div class="timer-icon">
              <n-icon :component="timer.isRunning ? PauseOutline : PlayOutline" :size="24" />
            </div>
            <div class="timer-info">
              <div class="timer-description">{{ timer.description }}</div>
              <div class="timer-time">{{ formatTime(getCurrentSeconds(timer)) }}</div>
            </div>
          </div>
          <button class="edit-btn" @click.stop="startEdit(timer)">
            <n-icon :component="CreateOutline" />
          </button>
          <button class="remove-btn" @click.stop="removeTimer(timer.id)">
            <n-icon :component="CloseCircleOutline" />
          </button>
        </template>
      </div>

      <!-- 添加按钮 -->
      <div class="add-item" @click="isAdding = true">
        <n-icon :component="AddCircleOutline" :size="20" class="add-icon" />
        <span>添加计时器</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timer-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  min-height: 120px;
  margin-top: 20px; /* 避免被title bar遮挡 */
  padding-top: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.timers-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-top: 8px; /* 减少顶部边距，因为添加表单已有足够间距 */
  min-height: 0;
  padding-bottom: 8px;
}

.add-item {
  flex-shrink: 0;
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.15);
  border: 2px dashed rgba(139, 92, 246, 0.5);
  border-radius: 6px;
  font-size: 13px;
  color: #8b5cf6;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.add-item:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: #8b5cf6;
}

.add-icon {
  flex-shrink: 0;
}

.timer-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timer-main {
  flex: 1;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.timer-main:hover {
  background: rgba(139, 92, 246, 0.2);
}

.timer-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b5cf6;
}

.timer-main:hover .timer-icon {
  background: rgba(139, 92, 246, 0.5);
}

.timer-info {
  flex: 1;
  min-width: 0;
}

.timer-description {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.timer-time {
  font-size: 16px;
  font-weight: 600;
  color: #8b5cf6;
  font-family: 'Courier New', monospace;
}

.edit-btn,
.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.edit-btn {
  background: rgba(76, 175, 80, 0.9);
  margin-right: 4px;
}

.remove-btn {
  background: rgba(244, 67, 54, 0.9);
}

.timer-item:hover .edit-btn,
.timer-item:hover .remove-btn {
  display: flex;
}

.edit-btn:hover {
  background: #4caf50;
  transform: scale(1.1);
}

.remove-btn:hover {
  background: #f44336;
  transform: scale(1.1);
}

.edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timers-list::-webkit-scrollbar {
  width: 4px;
}

.timers-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.timers-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.timers-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
