<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatDateString, getTodayString } from '../../utils/dateUtils'

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
  projectName: string
  priority: string
  status: string
}

const currentDate = ref(new Date())
const scheduledTasks = ref<ScheduledTask[]>([])
const commissions = ref<Commission[]>([])
const selectedDate = ref<string>(getTodayString()) // 默认选中今天

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

// 获取月份名称
const monthName = computed(() => {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  return months[currentMonth.value]
})

// 获取今天的日期
const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = today.getMonth()
const todayDate = today.getDate()

// 加载排单数据
const loadTasks = async () => {
  try {
    // 获取排单数据
    const tasks = await window.electron.ipcRenderer.invoke('scheduler:getScheduledTasks')
    scheduledTasks.value = tasks || []
    console.log('[CalendarWidget] 排单总数:', scheduledTasks.value.length)

    // 获取 Commission 数据
    const comms = await window.electron.ipcRenderer.invoke('db:getVGenCommissions')
    commissions.value = comms || []
    console.log('[CalendarWidget] Commissions 总数:', commissions.value.length)
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }
}

// 获取指定日期的任务数量
const getTaskCountForDate = (year: number, month: number, date: number): number => {
  const targetDate = formatDateString(new Date(year, month, date))

  // 统计该日期有排单的任务数量
  return scheduledTasks.value.filter((task) => {
    return task.workDays.includes(targetDate)
  }).length
}

// 生成日历数据
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  // 获取当月第一天和最后一天
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 获取当月第一天是星期几 (0-6, 0是周日)
  const firstDayOfWeek = firstDay.getDay()

  // 获取当月有多少天
  const daysInMonth = lastDay.getDate()

  // 获取上个月的天数
  const prevMonthLastDay = new Date(year, month, 0)
  const prevMonthDays = prevMonthLastDay.getDate()

  const days: Array<{
    date: number
    year: number
    month: number
    isCurrentMonth: boolean
    isToday: boolean
    taskCount: number
  }> = []

  // 添加上个月的日期
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthDays - i
    days.push({
      date,
      year: prevYear,
      month: prevMonth,
      isCurrentMonth: false,
      isToday: false,
      taskCount: getTaskCountForDate(prevYear, prevMonth, date)
    })
  }

  // 添加当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      year,
      month,
      isCurrentMonth: true,
      isToday: year === todayYear && month === todayMonth && i === todayDate,
      taskCount: getTaskCountForDate(year, month, i)
    })
  }

  // 添加下个月的日期，补足42个格子 (6行 x 7列)
  const remainingDays = 42 - days.length
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: i,
      year: nextYear,
      month: nextMonth,
      isCurrentMonth: false,
      isToday: false,
      taskCount: getTaskCountForDate(nextYear, nextMonth, i)
    })
  }

  return days
})

// 切换月份
const prevMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

// 回到今天
const goToToday = () => {
  const today = new Date()
  currentDate.value = today
  const todayStr = getTodayString()
  selectedDate.value = todayStr
  console.log('[CalendarWidget] 回到今天:', todayStr)

  // 通知待办组件更新
  window.electron.ipcRenderer.invoke('widget:selectDate', todayStr)
}

// 选择日期
const selectDate = (year: number, month: number, date: number) => {
  const dateStr = formatDateString(new Date(year, month, date))
  selectedDate.value = dateStr
  console.log('[CalendarWidget] 选中日期:', dateStr)

  // 通过 IPC 通知待办组件更新
  window.electron.ipcRenderer.invoke('widget:selectDate', dateStr)
}

onMounted(() => {
  console.log('[CalendarWidget] 组件挂载')
  console.log('[CalendarWidget] 当前选中日期:', selectedDate.value)
  console.log('[CalendarWidget] 当前月份:', currentYear.value, currentMonth.value + 1)

  // 加载排单数据
  loadTasks()

  // 通知待办组件默认显示今天的数据
  console.log('[CalendarWidget] 通知待办组件加载今天的数据')
  window.electron.ipcRenderer.invoke('widget:selectDate', selectedDate.value)

  // 监听任务更新事件
  window.electron.ipcRenderer.on('tasks:updated', () => {
    console.log('[CalendarWidget] 收到 tasks:updated 事件')
    loadTasks()
  })
})
</script>

<template>
  <div class="calendar-widget">
    <!-- 日历头部 -->
    <div class="calendar-header">
      <button class="nav-btn" @click="prevMonth">‹</button>
      <div class="current-month">
        <span class="month-name">{{ monthName }}</span>
        <span class="year">{{ currentYear }}</span>
      </div>
      <button class="nav-btn" @click="nextMonth">›</button>
    </div>

    <button class="today-btn" @click="goToToday">今天</button>

    <!-- 星期标题 -->
    <div class="weekdays">
      <div class="weekday">日</div>
      <div class="weekday">一</div>
      <div class="weekday">二</div>
      <div class="weekday">三</div>
      <div class="weekday">四</div>
      <div class="weekday">五</div>
      <div class="weekday">六</div>
    </div>

    <!-- 日期网格 -->
    <div class="calendar-grid">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          today: day.isToday,
          selected: selectedDate === formatDateString(new Date(day.year, day.month, day.date)),
          'has-tasks': day.taskCount > 0
        }"
        @click="selectDate(day.year, day.month, day.date)"
      >
        <span class="date-number">{{ day.date }}</span>
        <span v-if="day.taskCount > 0" class="task-badge">{{ day.taskCount }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.current-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.month-name {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.year {
  font-size: 12px;
  color: #999;
}

.today-btn {
  width: 100%;
  padding: 6px;
  margin-bottom: 8px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.today-btn:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  flex: 1;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  position: relative;
  padding: 2px;
}

.day-cell:hover {
  background: rgba(255, 255, 255, 0.1);
}

.day-cell.other-month {
  color: #666;
}

.day-cell.today {
  background: #8b5cf6;
  color: white;
  font-weight: 600;
}

.day-cell.today:hover {
  background: #7c3aed;
}

.day-cell.selected {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  font-weight: 600;
}

.day-cell.selected:hover {
  background: rgba(59, 130, 246, 0.7);
}

.date-number {
  font-size: 13px;
}

.task-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: #ff6b9d;
  color: white;
  font-size: 9px;
  font-weight: 600;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.day-cell.today .task-badge {
  background: #fbbf24;
  color: #1a1a1a;
}
</style>
