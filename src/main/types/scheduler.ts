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

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  workHoursPerDay: {},
  restDays: [],
  defaultWorkHours: 8,
  weekendRest: true
}
