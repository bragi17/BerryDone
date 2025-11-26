/**
 * 智能排单助手 - 类型定义 (Main Process)
 * 这是 renderer 类型的副本，用于 main process
 */

export interface SchedulerConfig {
  workHoursPerDay: Record<string, number>
  restDays: string[]
  defaultWorkHours: number
  weekendRest: boolean
}

export interface ScheduledTask {
  commissionId: string
  startDate: string
  endDate: string
  workDays: string[]
  hoursPerDay: Record<string, number>
  totalHours: number
  isLocked: boolean
  priorityScore?: number
}

export interface SchedulerSnapshot {
  timestamp: string
  scheduledTasks: ScheduledTask[]
  config: SchedulerConfig
}

export interface SchedulerState {
  config: SchedulerConfig
  scheduledTasks: ScheduledTask[]
  lastScheduledDate: string
  history: SchedulerSnapshot[]
  historyIndex: number
}

/**
 * 手动优先级配置
 * 优先级范围: 1-10，数字越大优先级越高
 */
export interface PriorityConfig {
  deadlinePriority: number
  orderTimePriority: number
  costPriority: number
  categoryPriorities: Record<string, number>
  servicePriorities: Record<string, number>
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  workHoursPerDay: {},
  restDays: [],
  defaultWorkHours: 8,
  weekendRest: true
}

export const DEFAULT_PRIORITY_CONFIG: PriorityConfig = {
  deadlinePriority: 5,
  orderTimePriority: 1,
  costPriority: 1,
  categoryPriorities: {},
  servicePriorities: {}
}

