<script setup lang="ts">
import { ref, computed } from 'vue'

const currentDate = ref(new Date())

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
    isCurrentMonth: boolean
    isToday: boolean
  }> = []

  // 添加上个月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: false
    })
  }

  // 添加当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      isCurrentMonth: true,
      isToday: year === todayYear && month === todayMonth && i === todayDate
    })
  }

  // 添加下个月的日期，补足42个格子 (6行 x 7列)
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
      isToday: false
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
  currentDate.value = new Date()
}
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
          today: day.isToday
        }"
      >
        {{ day.date }}
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
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
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
</style>
