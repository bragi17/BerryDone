/**
 * 智能排单助手 - 类型定义
 */

/**
 * 日历配置
 */
export interface SchedulerConfig {
  /** 每天的工作小时数配置 { '2024-01-15': 8, '2024-01-16': 6 } */
  workHoursPerDay: Record<string, number>

  /** 休息日列表（日期字符串数组） */
  restDays: string[]

  /** 默认每天工作小时数 */
  defaultWorkHours: number

  /** 周末是否休息 */
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

/**
 * 排单任务
 */
export interface ScheduledTask {
  /** 关联的 commission ID */
  commissionId: string

  /** 排单开始日期 YYYY-MM-DD */
  startDate: string

  /** 排单结束日期 YYYY-MM-DD */
  endDate: string

  /** 实际工作的日期列表 */
  workDays: string[]

  /** 每天分配的工时 { '2024-01-15': 4, '2024-01-16': 4 } */
  hoursPerDay: Record<string, number>

  /** 总工时 */
  totalHours: number

  /** 是否锁定（用户手动调整后锁定，不参与重排）@deprecated 使用 status 字段 */
  isLocked: boolean

  /** 任务状态 */
  status?: TaskStatus

  /** 优先级分数（用于排序） */
  priorityScore?: number

  /** 父任务ID（如果是拆分的子任务） */
  parentTaskId?: string

  /** 子任务索引（如果是拆分的子任务，从0开始） */
  subTaskIndex?: number

  /** 子任务总数（如果是父任务） */
  subTaskCount?: number

  /** 唯一任务ID */
  taskId?: string

  /** 任务开始小时（0-23，用于垂直定位） */
  startHour?: number
}

/**
 * 排单状态
 */
export interface SchedulerState {
  /** 日历配置 */
  config: SchedulerConfig

  /** 已排单的任务列表 */
  scheduledTasks: ScheduledTask[]

  /** 最后一次排单时间 */
  lastScheduledDate: string

  /** 排单历史（用于撤销） */
  history: SchedulerSnapshot[]

  /** 当前历史索引 */
  historyIndex: number
}

/**
 * 排单快照（用于撤销/重做）
 */
export interface SchedulerSnapshot {
  timestamp: string
  scheduledTasks: ScheduledTask[]
  config: SchedulerConfig
}

/**
 * 排单算法选项
 */
export interface ScheduleOptions {
  /** 从哪一天开始排单 */
  startFrom?: string

  /** 是否保留已锁定的任务 */
  preserveLocked?: boolean

  /** 优先级权重配置 */
  priorityWeights?: {
    dueDate: number      // 截止日期权重 (0-1)
    status: number       // 状态权重 (0-1)
    payment: number      // 支付状态权重 (0-1)
    manual: number       // 手动优先级权重 (0-1)
  }
}

/**
 * 手动优先级配置
 * 优先级范围: 1-10，数字越大优先级越高
 */
export interface PriorityConfig {
  /** 截止日期优先级 (1-10, 默认5) */
  deadlinePriority: number

  /** 接单时间优先级 (1-10, 默认1) */
  orderTimePriority: number

  /** 费用优先级 (1-10, 默认1) */
  costPriority: number

  /** WIP（进行中）状态优先级 (1-10, 默认8) */
  wipPriority: number

  /** Ready（待处理）状态优先级 (1-10, 默认5) */
  readyPriority: number

  /** 按分类设置的服务优先级 { 'Illustration': 8, 'Animation': 6 } */
  categoryPriorities: Record<string, number>

  /** 按服务ID设置的服务优先级 { 'service-id-1': 9, 'service-id-2': 3 } */
  servicePriorities: Record<string, number>
}

/**
 * 默认手动优先级配置
 */
export const DEFAULT_PRIORITY_CONFIG: PriorityConfig = {
  deadlinePriority: 5,
  orderTimePriority: 1,
  costPriority: 1,
  wipPriority: 8,
  readyPriority: 5,
  categoryPriorities: {},
  servicePriorities: {}
}

/**
 * 日历天的状态
 */
export interface CalendarDay {
  /** 日期 YYYY-MM-DD */
  date: string

  /** 是否是休息日 */
  isRestDay: boolean

  /** 是否是周末 */
  isWeekend: boolean

  /** 是否是今天 */
  isToday: boolean

  /** 当天工作小时数 */
  workHours: number

  /** 已分配的任务 */
  tasks: ScheduledTask[]

  /** 已使用的工时 */
  usedHours: number

  /** 剩余工时 */
  remainingHours: number
}

/**
 * 拖拽数据
 */
export interface DragData {
  taskId: string
  fromDate: string
  task: ScheduledTask
}

/**
 * 默认配置
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  workHoursPerDay: {},
  restDays: [],
  defaultWorkHours: 8,
  weekendRest: true
}

export const DEFAULT_SCHEDULE_OPTIONS: ScheduleOptions = {
  preserveLocked: true,
  priorityWeights: {
    dueDate: 0.5,
    status: 0.3,
    payment: 0.1,
    manual: 0.1
  }
}
