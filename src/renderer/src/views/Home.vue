<template>
  <div class="home-view">
    <div class="home-header">
      <h1 class="page-title">📅 Home</h1>
      <div class="header-actions">
        <n-button quaternary @click="showDefaultWorkHoursModal = true">
          <template #icon>
            <n-icon :component="TimeOutline" />
          </template>
          默认工时: {{ defaultWorkHours }}h
        </n-button>
        <n-divider vertical />
        <n-button quaternary @click="goToToday">
          今天
        </n-button>
        <n-button quaternary @click="previousMonth">
          <n-icon :component="ChevronBack" />
        </n-button>
        <span class="current-month">{{ currentMonthText }}</span>
        <n-button quaternary @click="nextMonth">
          <n-icon :component="ChevronForward" />
      </n-button>
      </div>
    </div>
    
    <div class="calendar-container">
      <div class="calendar-info">
        <span class="info-icon">💡</span>
        <span class="info-text">点击日期设置工时和休息日 • 右键快速切换休息日 • 默认周末为休息日</span>
      </div>

      <div class="calendar-weekdays">
        <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
      </div>
      
      <div class="calendar-grid">
        <div
          v-for="day in calendarDays"
          :key="day.date"
          class="calendar-day"
          :class="{
            'is-today': day.isToday,
            'is-other-month': day.isOtherMonth,
            'is-weekend': day.isWeekend,
            'is-rest-day': day.isRestDay,
            'has-items': day.stats.total > 0,
            'has-custom-hours': day.hasCustomWorkHours
          }"
          @click="openDaySettings(day)"
          @contextmenu.prevent="toggleRestDay(day)"
        >
          <div class="day-header">
            <div class="day-number">
              {{ day.dayNumber }}
              <span v-if="day.isRestDay" class="rest-day-icon">🌙</span>
            </div>
            <div v-if="day.workHours !== null && !day.isRestDay" class="work-hours-badge" :class="{ 'is-custom': day.hasCustomWorkHours }">
              <n-icon :component="TimeOutline" size="12" />
              <span>{{ day.workHours }}h</span>
            </div>
          </div>
          
          <div v-if="day.stats.total > 0" class="day-stats">
            <div v-if="day.stats.ready > 0" class="stat-badge ready">
              {{ day.stats.ready }}
            </div>
            <div v-if="day.stats.wip > 0" class="stat-badge wip">
              {{ day.stats.wip }}
        </div>
            <div v-if="day.stats.completed > 0" class="stat-badge completed">
              {{ day.stats.completed }}
        </div>
      </div>
      
          <div v-if="day.commissions.length > 0" class="day-commissions">
            <div 
              v-for="(comm, index) in day.commissions.slice(0, 3)" 
              :key="comm.id"
              class="commission-dot"
              :style="{ backgroundColor: getStatusColor(comm.status) }"
              :title="`${comm.clientName} - ${comm.projectName}`"
            ></div>
            <div v-if="day.commissions.length > 3" class="more-indicator">
              +{{ day.commissions.length - 3 }}
        </div>
      </div>
        </div>
      </div>
    </div>
    
    <div class="quick-stats">
      <div class="stat-group">
        <div class="stat-label">本月统计</div>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-dot ready"></span>
            <span>Ready: {{ monthStats.ready }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot wip"></span>
            <span>WIP: {{ monthStats.wip }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot completed"></span>
            <span>Completed: {{ monthStats.completed }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 默认工时设置对话框 -->
    <n-modal
      v-model:show="showDefaultWorkHoursModal"
      preset="card"
      title="设置默认工时"
      :style="{ width: '500px' }"
      :bordered="false"
    >
      <div class="modal-content">
        <div class="modal-description">
          设置每日默认工作时长，将应用于所有未单独设置的日期
        </div>

        <div class="work-hours-setting">
          <div class="quick-hours-buttons">
            <n-button
              v-for="hours in [4, 6, 8, 10, 12]"
              :key="hours"
              :type="defaultWorkHours === hours ? 'primary' : 'default'"
              @click="defaultWorkHours = hours"
            >
              {{ hours }}小时
            </n-button>
          </div>

          <n-input-number
            v-model:value="defaultWorkHours"
            :min="0.5"
            :max="24"
            :step="0.5"
            style="width: 100%; margin-top: 16px;"
            size="large"
          >
            <template #prefix>
              <n-icon :component="TimeOutline" />
            </template>
            <template #suffix>
              小时/天
            </template>
          </n-input-number>

          <n-alert type="info" :bordered="false" style="margin-top: 16px;">
            <template #icon>
              <n-icon :component="InformationCircleOutline" />
            </template>
            最小单位为0.5小时，智能排单将根据此设置分配任务
          </n-alert>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="showDefaultWorkHoursModal = false">取消</n-button>
          <n-button type="primary" @click="saveDefaultWorkHours">保存设置</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 单日设置对话框 -->
    <n-modal
      v-model:show="showDaySettingsModal"
      preset="card"
      :title="daySettingsTitle"
      :style="{ width: '500px' }"
      :bordered="false"
    >
      <div class="modal-content">
        <div class="day-settings-sections">
          <!-- 合并的设置区域 -->
          <div class="setting-section compact">
            <div class="section-row">
              <div class="section-item">
                <n-icon :component="CalendarOutline" size="20" />
                <span class="section-label">日期类型</span>
              </div>
              <n-switch v-model:value="editingDayIsRestDay" size="medium">
                <template #checked>
                  🌙 休息日
                </template>
                <template #unchecked>
                  💼 工作日
                </template>
              </n-switch>
            </div>
          </div>

          <!-- 工时设置 -->
          <div v-if="!editingDayIsRestDay" class="setting-section">
            <div class="section-header">
              <n-icon :component="TimeOutline" size="20" />
              <span>工作时长</span>
            </div>

            <div class="work-hours-options">
              <n-radio-group v-model:value="workHoursMode" style="margin-bottom: 16px;">
                <n-radio value="default">使用默认工时 ({{ defaultWorkHours }}小时)</n-radio>
                <n-radio value="custom">自定义工时</n-radio>
              </n-radio-group>

              <div v-if="workHoursMode === 'custom'" class="custom-hours-setting">
                <div class="quick-hours-buttons">
                  <n-button
                    v-for="hours in [2, 4, 6, 8, 10]"
                    :key="hours"
                    :type="editingDayWorkHours === hours ? 'primary' : 'default'"
                    size="small"
                    @click="editingDayWorkHours = hours"
                  >
                    {{ hours }}h
                  </n-button>
                </div>

                <n-input-number
                  v-model:value="editingDayWorkHours"
                  :min="0.5"
                  :max="24"
                  :step="0.5"
                  style="width: 100%; margin-top: 12px;"
                >
                  <template #suffix>
                    小时
                  </template>
                </n-input-number>
              </div>
            </div>

            <n-alert v-if="workHoursMode === 'custom'" type="info" :bordered="false" style="margin-top: 16px;">
              <template #icon>
                <n-icon :component="InformationCircleOutline" />
              </template>
              自定义工时将覆盖默认设置，最小单位为0.5小时
            </n-alert>
          </div>

          <!-- 当日任务预览 -->
          <div v-if="editingDayScheduledTasks.length > 0" class="setting-section">
            <div class="section-header">
              <n-icon :component="ListOutline" size="20" />
              <span>当日排单任务 ({{ editingDayScheduledTasks.length }})</span>
            </div>
            <div class="day-commissions-list">
              <div v-for="task in editingDayScheduledTasks.slice(0, 3)" :key="task.commissionId" class="commission-item">
                <div class="commission-dot" :style="{ backgroundColor: getTaskColor(task) }"></div>
                <span class="commission-text">
                  {{ getCommissionName(task.commissionId) }} - {{ task.totalHours }}h
                </span>
              </div>
              <div v-if="editingDayScheduledTasks.length > 3" class="more-text">
                还有 {{ editingDayScheduledTasks.length - 3 }} 个任务...
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="closeDaySettings">取消</n-button>
          <n-button type="primary" @click="saveDaySettings">保存设置</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NButton,
  NIcon,
  NModal,
  NInputNumber,
  NAlert,
  NSwitch,
  NRadioGroup,
  NRadio,
  NDivider,
  useMessage
} from 'naive-ui'
import {
  ChevronBack,
  ChevronForward,
  TimeOutline,
  CalendarOutline,
  InformationCircleOutline,
  ListOutline
} from '@vicons/ionicons5'

interface VGenCommission {
  id: string
  clientName: string
  projectName: string
  status: string
  startDate: string
  dueDate?: string
  completedDate?: string
}

interface ScheduledTask {
  commissionId: string
  startDate: string
  endDate: string
  workDays: string[]
  totalHours: number
}

const message = useMessage()
const vgenCommissions = ref<VGenCommission[]>([])
const scheduledTasks = ref<ScheduledTask[]>([])
const currentDate = ref(new Date())
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const restDays = ref<string[]>([]) // 休息日列表 (YYYY-MM-DD)
const workHoursPerDay = ref<Record<string, number>>({}) // 每日自定义工时
const defaultWorkHours = ref(8) // 默认每日工时

// 对话框状态
const showDefaultWorkHoursModal = ref(false)
const showDaySettingsModal = ref(false)
const editingDayData = ref<any>(null)
const editingDayIsRestDay = ref(false)
const editingDayWorkHours = ref(8)
const workHoursMode = ref<'default' | 'custom'>('default')
const editingDayCommissions = ref<VGenCommission[]>([])
const editingDayScheduledTasks = ref<ScheduledTask[]>([]) // 当日排单任务

// 计算单日设置对话框标题
const daySettingsTitle = computed(() => {
  if (!editingDayData.value) return '日期设置'
  const date = new Date(editingDayData.value.date)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

onMounted(async () => {
  try {
    const commissions = await window.api.db.getVGenCommissions()
    vgenCommissions.value = commissions
    console.log(`Home loaded ${commissions.length} commissions`)

    // 加载排单任务
    const tasks = await window.api.scheduler.getScheduledTasks()
    if (tasks) {
      scheduledTasks.value = tasks
      console.log(`Home loaded ${tasks.length} scheduled tasks`)
    }

    // 加载休息日配置
    await loadRestDays()
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

// 加载休息日和工时配置
const loadRestDays = async () => {
  try {
    const config = await window.api.scheduler.getConfig()

    // 加载默认工时
    if (config && config.defaultWorkHours) {
      defaultWorkHours.value = config.defaultWorkHours
    }

    // 加载每日自定义工时
    if (config && config.workHoursPerDay) {
      workHoursPerDay.value = config.workHoursPerDay
    }

    // 加载休息日
    if (config && config.restDays && Array.isArray(config.restDays) && config.restDays.length > 0) {
      // 检查是否包含当前月份的日期
      const today = new Date()
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth()

      const hasCurrentMonthDates = config.restDays.some((dateStr: string) => {
        const date = new Date(dateStr)
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth
      })

      if (hasCurrentMonthDates) {
        restDays.value = config.restDays
        console.log('[Home] 加载了休息日配置:', restDays.value.length, '天')
      } else {
        // 配置中没有当前月份的日期，重新初始化
        console.log('[Home] 配置中无当前月份日期，重新初始化')
        await initializeDefaultRestDays()
      }
    } else {
      // 如果没有配置，初始化默认周末为休息日
      console.log('[Home] 未找到休息日配置，初始化默认周末')
      await initializeDefaultRestDays()
    }
  } catch (error) {
    console.error('[Home] 加载配置失败:', error)
    await initializeDefaultRestDays()
  }
}

// 初始化默认周末为休息日（当前月份及下个月）
const initializeDefaultRestDays = async () => {
  const today = new Date()
  const restDaysList: string[] = []

  console.log('[Home] 开始初始化休息日，当前日期:', today.toISOString().split('T')[0])

  // 当前月份和未来2个月的周末
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const year = today.getFullYear()
    const month = today.getMonth() + monthOffset
    const lastDay = new Date(year, month + 1, 0).getDate()

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()

      // 周六(6)和周日(0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dateStr = date.toISOString().split('T')[0]
        restDaysList.push(dateStr)
      }
    }
  }

  restDays.value = restDaysList
  console.log('[Home] 初始化了', restDaysList.length, '个默认休息日')
  console.log('[Home] 第一个休息日:', restDaysList[0], '最后一个休息日:', restDaysList[restDaysList.length - 1])
  await saveRestDays()
}

// 保存配置（休息日和工时）
const saveConfig = async () => {
  try {
    const config = await window.api.scheduler.getConfig()

    // 创建一个干净的配置对象，只包含基本可序列化的属性
    const cleanConfig = {
      workHoursPerDay: workHoursPerDay.value ? JSON.parse(JSON.stringify(workHoursPerDay.value)) : {},
      restDays: Array.isArray(restDays.value) ? [...restDays.value] : [],
      defaultWorkHours: Number(defaultWorkHours.value) || 8,
      weekendRest: Boolean(config?.weekendRest !== undefined ? config.weekendRest : true)
    }

    console.log('[Home] 保存配置:', cleanConfig)
    await window.api.scheduler.saveConfig(cleanConfig)
  } catch (error: any) {
    console.error('[Home] 保存配置失败:', error)
    message.error(`保存失败: ${error.message || '未知错误'}`)
    throw error
  }
}

// 保存休息日配置（兼容旧接口）
const saveRestDays = saveConfig

// 切换休息日状态（右键直接触发）
const toggleRestDay = async (day: any) => {
  // 不允许修改其他月份的日期
  if (day.isOtherMonth) {
    return
  }

  const dateStr = day.date
  const index = restDays.value.indexOf(dateStr)

  if (index > -1) {
    // 取消休息日
    restDays.value.splice(index, 1)
    message.success(`已取消休息日: ${day.dayNumber}日`)
  } else {
    // 设为休息日
    restDays.value.push(dateStr)
    message.success(`已设为休息日: ${day.dayNumber}日`)
  }

  await saveRestDays()
}

// 打开单日设置对话框
const openDaySettings = (day: any) => {
  // 不允许修改其他月份的日期
  if (day.isOtherMonth) {
    return
  }

  editingDayData.value = day
  editingDayIsRestDay.value = day.isRestDay
  editingDayCommissions.value = day.commissions

  // 获取当日的排单任务
  const dateStr = day.date
  const dayScheduledTasks: ScheduledTask[] = []

  // 筛选包含该日期的排单任务
  scheduledTasks.value.forEach(task => {
    if (task.workDays.includes(dateStr)) {
      dayScheduledTasks.push(task)
    }
  })

  editingDayScheduledTasks.value = dayScheduledTasks

  // 判断是否有自定义工时
  if (day.hasCustomWorkHours) {
    workHoursMode.value = 'custom'
    editingDayWorkHours.value = day.workHours
  } else {
    workHoursMode.value = 'default'
    editingDayWorkHours.value = defaultWorkHours.value
  }

  showDaySettingsModal.value = true
}

// 保存单日设置
const saveDaySettings = async () => {
  const dateStr = editingDayData.value.date

  // 更新休息日
  if (editingDayIsRestDay.value) {
    if (!restDays.value.includes(dateStr)) {
      restDays.value.push(dateStr)
    }
    // 如果是休息日，移除自定义工时
    delete workHoursPerDay.value[dateStr]
  } else {
    // 移除休息日标记
    const index = restDays.value.indexOf(dateStr)
    if (index > -1) {
      restDays.value.splice(index, 1)
    }

    // 更新工时
    if (workHoursMode.value === 'custom') {
      // 自动修正到0.5的倍数
      editingDayWorkHours.value = Math.round(editingDayWorkHours.value * 2) / 2
      workHoursPerDay.value[dateStr] = editingDayWorkHours.value
    } else {
      // 使用默认工时，删除自定义设置
      delete workHoursPerDay.value[dateStr]
    }
  }

  await saveConfig()
  showDaySettingsModal.value = false
  message.success('设置已保存')
}

// 关闭单日设置对话框
const closeDaySettings = () => {
  showDaySettingsModal.value = false
  editingDayData.value = null
}

// 保存默认工时设置
const saveDefaultWorkHours = async () => {
  // 自动修正到0.5的倍数
  defaultWorkHours.value = Math.round(defaultWorkHours.value * 2) / 2

  await saveConfig()
  showDefaultWorkHoursModal.value = false
  message.success(`默认工时已设置为 ${defaultWorkHours.value} 小时`)
}

const currentMonthText = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  })
})

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

const goToToday = () => {
  currentDate.value = new Date()
}

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // 本月第一天
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()
  
  // 本月最后一天
  const lastDay = new Date(year, month + 1, 0)
  const lastDate = lastDay.getDate()
  
  // 上个月最后几天
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  
  const days: any[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // 上个月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    days.push(createDayObject(date, day, true))
  }
  
  // 本月的日期
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day)
    days.push(createDayObject(date, day, false))
  }
  
  // 下个月的日期（补齐6行）
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    days.push(createDayObject(date, day, true))
  }
  
  return days
})

const createDayObject = (date: Date, dayNumber: number, isOtherMonth: boolean) => {
  const dateStr = date.toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  // 判断是否为周末
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  // 判断是否为休息日
  const isRestDay = restDays.value.includes(dateStr)

  // 获取工时信息
  const hasCustomWorkHours = dateStr in workHoursPerDay.value
  const workHours = isRestDay ? null : (hasCustomWorkHours ? workHoursPerDay.value[dateStr] : defaultWorkHours.value)

  // 获取这一天的 commissions
  const dayCommissions = vgenCommissions.value.filter(comm => {
    const start = new Date(comm.startDate)
    start.setHours(0, 0, 0, 0)

    let end = new Date(comm.completedDate || comm.dueDate || comm.startDate)
    end.setHours(0, 0, 0, 0)

    return date >= start && date <= end
  })

  // 统计状态
  const stats = {
    ready: dayCommissions.filter(c => c.status === 'PENDING' || c.status === 'DRAFT').length,
    wip: dayCommissions.filter(c => c.status === 'IN_PROGRESS').length,
    completed: dayCommissions.filter(c => {
      if (c.status !== 'COMPLETED') return false
      if (!c.completedDate) return false
      const completedDate = new Date(c.completedDate)
      completedDate.setHours(0, 0, 0, 0)
      return completedDate.getTime() === date.getTime()
    }).length,
    total: dayCommissions.length
  }

  return {
    date: dateStr,
    dayNumber,
    isToday: date.getTime() === today.getTime(),
    isOtherMonth,
    isWeekend,
    isRestDay,
    workHours,
    hasCustomWorkHours,
    commissions: dayCommissions,
    stats
  }
}

const monthStats = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  const monthCommissions = vgenCommissions.value.filter(comm => {
    const start = new Date(comm.startDate)
    const completedDate = comm.completedDate ? new Date(comm.completedDate) : null
    
    return (start.getFullYear() === year && start.getMonth() === month) ||
           (completedDate && completedDate.getFullYear() === year && completedDate.getMonth() === month)
  })
  
  return {
    ready: monthCommissions.filter(c => c.status === 'PENDING' || c.status === 'DRAFT').length,
    wip: monthCommissions.filter(c => c.status === 'IN_PROGRESS').length,
    completed: monthCommissions.filter(c => c.status === 'COMPLETED').length
  }
})

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'COMPLETED': '#54C5B7',
    'IN_PROGRESS': '#3B82F6',
    'PENDING': '#F59E0B',
    'DRAFT': '#9CA3AF'
  }
  return colors[status] || '#888'
}

// 获取排单任务的颜色
const getTaskColor = (task: ScheduledTask) => {
  const commission = vgenCommissions.value.find(c => c.id === task.commissionId)
  if (commission) {
    return getStatusColor(commission.status)
  }
  return '#888'
}

// 获取排单任务对应的commission名称
const getCommissionName = (commissionId: string) => {
  const commission = vgenCommissions.value.find(c => c.id === commissionId)
  if (commission) {
    return `${commission.clientName} - ${commission.projectName}`
  }
  return '未知任务'
}
</script>

<style scoped>
.home-view {
  padding: 20px;
  max-width: 1500px;
  min-width: 1100px;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  overflow: hidden; /* 禁止滚动 */
  display: flex;
  flex-direction: column;
  gap: 16px; /* 减少间距 */
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px; /* 减少底部边距 */
  flex-shrink: 0; /* 防止收缩 */
}

.page-title {
  font-size: 28px; /* 稍微减小标题 */
  font-weight: 700;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-month {
  font-size: 18px;
  font-weight: 600;
  min-width: 200px;
  text-align: center;
}

.calendar-container {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 20px; /* 减少内边距 */
  flex: 1; /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许收缩 */
  overflow: hidden; /* 防止溢出 */
}

.calendar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px; /* 减少内边距 */
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  margin-bottom: 16px; /* 减少底部边距 */
  flex-shrink: 0;
}

.info-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.info-text {
  font-size: 13px;
  color: #aaa;
  line-height: 1.5;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 12px; /* 减少底部边距 */
  flex-shrink: 0;
}

.weekday {
  text-align: center;
  font-size: 13px; /* 稍微减小字体 */
  font-weight: 600;
  color: #888;
  padding: 6px; /* 减少内边距 */
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  flex: 1; /* 占据剩余空间 */
  overflow-y: auto; /* 允许纵向滚动 */
  min-height: 0; /* 允许收缩 */
}

/* 为网格添加细小的滚动条 */
.calendar-grid::-webkit-scrollbar {
  width: 4px;
}

.calendar-grid::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-grid::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}

.calendar-day {
  height: 80px; /* 减小日期格子高度 */
  min-height: 80px;
  max-height: 80px;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 8px; /* 减少内边距 */
  display: flex;
  flex-direction: column;
  gap: 4px; /* 减少间距 */
  transition: all 0.2s;
  cursor: context-menu;
  position: relative;
  overflow: hidden;
}

.calendar-day:hover {
  background: #2a2a2a;
  border-color: #8B5CF6;
}

.calendar-day:hover::after {
  content: '右键设置休息日';
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 9px;
  color: #666;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

.calendar-day.is-other-month:hover::after {
  display: none;
}

.calendar-day.is-today {
  border-color: #54C5B7;
  border-width: 2px;
  background: rgba(84, 197, 183, 0.1);
}

.calendar-day.is-other-month {
  opacity: 0.3;
}

.calendar-day.is-weekend {
  background: rgba(139, 92, 246, 0.03);
}

.calendar-day.is-rest-day {
  background: rgba(245, 158, 11, 0.1);
  border-color: #F59E0B;
}

.calendar-day.is-rest-day:hover {
  background: rgba(245, 158, 11, 0.15);
}

.calendar-day.is-rest-day:hover::after {
  content: '右键取消休息日';
}

.calendar-day.has-items {
  background: rgba(139, 92, 246, 0.05);
}

.calendar-day.has-items.is-rest-day {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
}

.day-number {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.rest-day-icon {
  font-size: 12px;
}

.day-stats {
  display: flex;
  gap: 3px; /* 减少间距 */
  flex-wrap: wrap;
}

.stat-badge {
  font-size: 10px; /* 减小字体 */
  padding: 1px 4px; /* 减少内边距 */
  border-radius: 4px;
  font-weight: 500;
}

.stat-badge.ready {
  background: rgba(245, 158, 11, 0.2);
  color: #F59E0B;
}

.stat-badge.wip {
  background: rgba(59, 130, 246, 0.2);
  color: #3B82F6;
}

.stat-badge.completed {
  background: rgba(84, 197, 183, 0.2);
  color: #54C5B7;
}

.day-commissions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: auto;
}

.commission-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.more-indicator {
  font-size: 10px;
  color: #888;
}

.quick-stats {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 16px 20px; /* 减少内边距 */
  flex-shrink: 0; /* 防止收缩 */
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 减少间距 */
}

.stat-label {
  font-size: 13px; /* 稍微减小字体 */
  font-weight: 600;
  color: #888;
}

.stat-items {
  display: flex;
  gap: 24px; /* 稍微减少间距 */
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.stat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.stat-dot.ready {
  background: #F59E0B;
}

.stat-dot.wip {
  background: #3B82F6;
}

.stat-dot.completed {
  background: #54C5B7;
}

/* 工时设置相关样式 */
.work-hours-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: #8B5CF6;
  transition: all 0.2s;
}

.work-hours-badge.is-custom {
  background: rgba(84, 197, 183, 0.1);
  border-color: rgba(84, 197, 183, 0.2);
  color: #54C5B7;
}

.work-hours-badge:hover {
  transform: scale(1.05);
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

.work-hours-badge.is-custom:hover {
  background: rgba(84, 197, 183, 0.15);
  border-color: rgba(84, 197, 183, 0.3);
}

/* 对话框内容样式 */
.modal-content {
  padding: 8px 0;
}

.modal-description {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
  margin-bottom: 20px;
}

.work-hours-setting {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-hours-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-hours-buttons .n-button {
  flex: 1;
  min-width: 80px;
}

/* 单日设置对话框样式 */
.day-settings-sections {
  display: flex;
  flex-direction: column;
  gap: 20px; /* 减少间距 */
  padding: 8px 0;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px; /* 减少内边距 */
  background: rgba(30, 30, 30, 0.5);
  border-radius: 12px;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
}

.setting-section.compact {
  padding: 12px 16px; /* 更紧凑的内边距 */
  gap: 0;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.setting-section:hover {
  background: rgba(30, 30, 30, 0.7);
  border-color: #3a3a3a;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.work-hours-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.custom-hours-setting {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.day-commissions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

/* 自定义滚动条 */
.day-commissions-list::-webkit-scrollbar {
  width: 4px;
}

.day-commissions-list::-webkit-scrollbar-track {
  background: transparent;
}

.day-commissions-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}

.commission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  transition: all 0.2s;
}

.commission-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.commission-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.commission-text {
  font-size: 13px;
  color: #aaa;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-text {
  font-size: 12px;
  color: #666;
  font-style: italic;
  padding: 6px;
}

/* 改进日历日期样式以适应工时徽章 */
.calendar-day {
  position: relative;
  min-height: 80px;
}

.calendar-day.has-custom-hours {
  background: linear-gradient(135deg, rgba(84, 197, 183, 0.03) 0%, rgba(84, 197, 183, 0.01) 100%);
}

.calendar-day.has-custom-hours:hover {
  background: linear-gradient(135deg, rgba(84, 197, 183, 0.05) 0%, rgba(84, 197, 183, 0.02) 100%);
}

.day-header {
  position: relative;
  padding-right: 60px; /* 为工时徽章留出空间 */
}

/* 默认工时按钮样式优化 */
.header-actions .n-button--quaternary {
  transition: all 0.2s;
}

.header-actions .n-button--quaternary:hover {
  background: rgba(139, 92, 246, 0.1);
  transform: translateY(-1px);
}

/* 模态框动画 */
.n-modal {
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 输入框聚焦效果 */
.n-input-number:focus-within {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

/* 按钮组美化 */
.n-button-group .n-button {
  transition: all 0.2s;
}

.n-button-group .n-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* 信息提示框美化 */
.n-alert--info {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

/* 开关按钮美化 */
.n-switch--large {
  transform: scale(1.1);
}

.n-switch--large:hover {
  transform: scale(1.15);
}

/* 单选按钮组美化 */
.n-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.n-radio {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  transition: all 0.2s;
}

.n-radio:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(4px);
}

.n-radio--checked {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
}
</style>
