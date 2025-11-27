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

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 普通状态 - 可拖拽、拉伸，排单时可变 */
  NORMAL = 'NORMAL',
  /** 锁定状态 - 不可拉伸、不可跨日拖拽，排单时不变 */
  LOCKED = 'LOCKED',
  /** 完成状态 - 同锁定状态 */
  COMPLETED = 'COMPLETED'
}

export interface ScheduledTask {
  commissionId: string
  startDate: string
  endDate: string
  workDays: string[]
  hoursPerDay: Record<string, number>
  totalHours: number
  isLocked: boolean
  status?: TaskStatus
  priorityScore?: number
  parentTaskId?: string
  subTaskIndex?: number
  subTaskCount?: number
  taskId?: string
  startHour?: number
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

