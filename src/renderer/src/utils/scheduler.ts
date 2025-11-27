/**
 * 智能排单助手 - 核心算法模块
 */

import type { VGenCommission } from '../store'
import type {
  SchedulerConfig,
  ScheduledTask,
  ScheduleOptions,
  CalendarDay,
  PriorityConfig
} from '../types/scheduler'
import {
  DEFAULT_SCHEDULE_OPTIONS,
  DEFAULT_SCHEDULER_CONFIG,
  DEFAULT_PRIORITY_CONFIG,
  TaskStatus
} from '../types/scheduler'
import { parseDateString, formatDateString, getTodayString } from './dateUtils'

// 工时配置接口
export interface WorkHoursConfig {
  globalDefault: number
  categoryDefaults: Record<string, number>
  serviceOverrides: Record<string, number>
}

// 重新导出类型和常量
export type { SchedulerConfig, ScheduledTask, ScheduleOptions, CalendarDay, PriorityConfig }
export { DEFAULT_SCHEDULE_OPTIONS, DEFAULT_SCHEDULER_CONFIG, DEFAULT_PRIORITY_CONFIG, TaskStatus }

/**
 * 工时计算辅助函数
 */

/**
 * 获取 commission 的预估工时
 * 优先级：commission.estimatedWorkHours > serviceOverrides > categoryDefaults > globalDefault
 *
 * @param commission - VGen Commission
 * @param workHoursConfig - 工时配置（可选）
 * @returns 预估工时（小时）
 */
export function getCommissionWorkHours(
  commission: VGenCommission,
  workHoursConfig?: WorkHoursConfig | null
): number {
  // 1. 优先使用 commission 自身的工时设置
  if (commission.estimatedWorkHours && commission.estimatedWorkHours > 0) {
    return commission.estimatedWorkHours
  }

  // 如果没有配置，使用默认值
  if (!workHoursConfig) {
    return 8
  }

  // 2. 查找 serviceID 的特定工时设置
  if (commission.serviceID && workHoursConfig.serviceOverrides[commission.serviceID]) {
    return workHoursConfig.serviceOverrides[commission.serviceID]
  }

  // 3. 使用全局默认值（如果没有类别信息）
  // 注意：commission 没有 category 字段，所以我们暂时跳过类别默认值
  // 未来可以通过 serviceID 关联到 service 再获取 category

  // 4. 返回全局默认值
  return workHoursConfig.globalDefault || 8
}

/**
 * 日期工具函数
 */

/** 添加天数到日期 */
function addDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateString(date)
}

/** 计算两个日期之间的天数 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}

/** 判断是否是周末 */
function isWeekend(dateStr: string): boolean {
  const date = parseDateString(dateStr)
  const day = date.getDay()
  return day === 0 || day === 6
}

/** 获取下一个工作日 */
function getNextWorkDay(dateStr: string, config: SchedulerConfig): string {
  let next = addDays(dateStr, 1)

  while (config.restDays.includes(next) || (config.weekendRest && isWeekend(next))) {
    next = addDays(next, 1)
  }

  return next
}

/**
 * 优先级计算
 */

interface PriorityWeights {
  dueDate: number
  status: number
  payment: number
  manual: number
}

/**
 * 计算订单的优先级分数
 *
 * @param comm - VGen Commission
 * @param weights - 权重配置
 * @param priorityConfig - 手动优先级配置
 * @param services - 服务列表（用于获取category）
 * @returns 优先级分数（0-100）
 */
export function calculatePriority(
  comm: VGenCommission,
  weights: PriorityWeights = DEFAULT_SCHEDULE_OPTIONS.priorityWeights!,
  priorityConfig?: PriorityConfig,
  services?: any[]
): number {
  let score = 0

  // 截止日期紧急度 (0-50分)
  if (comm.dueDate && weights.dueDate > 0) {
    const daysLeft = daysBetween(new Date(), parseDateString(comm.dueDate))
    const urgencyScore = Math.max(0, 50 - daysLeft * 2) // 越接近截止日期分数越高
    score += urgencyScore * weights.dueDate
  }

  // 状态优先 (0-30分)
  if (weights.status > 0) {
    if (comm.status === 'IN_PROGRESS') {
      score += 30 * weights.status // WIP 优先
    } else if (comm.status === 'PENDING') {
      score += 10 * weights.status // READY 次之
    }
  }

  // 已付款优先 (0-20分)
  if (weights.payment > 0 && comm.paymentStatus === 'PAID') {
    score += 20 * weights.payment
  }

  // 手动优先级配置 (0-100分)
  if (priorityConfig && weights.manual && weights.manual > 0) {
    let manualScore = 0

    // 1. 截止日期优先级 (1-10 -> 0-25分)
    if (comm.dueDate) {
      manualScore += (priorityConfig.deadlinePriority / 10) * 25
    }

    // 2. 接单时间优先级 (1-10 -> 0-20分)
    // 越早接单的越优先
    if (comm.startDate) {
      const orderDaysAgo = daysBetween(parseDateString(comm.startDate), new Date())
      const orderUrgency = Math.min(20, orderDaysAgo * 0.5) // 每天增加0.5分，最多20分
      manualScore += (priorityConfig.orderTimePriority / 10) * orderUrgency
    }

    // 3. 费用优先级 (1-10 -> 0-25分)
    // 费用越高越优先
    if (comm.totalCost) {
      // 假设1000USD为基准，超过1000每增加100增加1分，最多25分
      const costScore = Math.min(25, (comm.totalCost / 100) * 2.5)
      manualScore += (priorityConfig.costPriority / 10) * costScore
    }

    // 4. 服务优先级 (1-10 -> 0-30分)
    let servicePriorityScore = 1 // 默认1

    // 优先使用服务特定优先级
    if (comm.serviceID && priorityConfig.servicePriorities[comm.serviceID]) {
      servicePriorityScore = priorityConfig.servicePriorities[comm.serviceID]
    } else if (services && comm.serviceID) {
      // 查找服务的分类
      const service = services.find(s => s.serviceId === comm.serviceID || s.id === comm.serviceID)
      if (service && service.category && priorityConfig.categoryPriorities[service.category]) {
        servicePriorityScore = priorityConfig.categoryPriorities[service.category]
      }
    }

    manualScore += (servicePriorityScore / 10) * 30

    score += manualScore * weights.manual
  }

  return score
}

/**
 * 工作日分配算法
 */

interface WorkDayAllocation {
  workDays: string[]
  hoursPerDay: Record<string, number>
  subTasks?: SubTaskAllocation[]  // 子任务分配
}

interface SubTaskAllocation {
  workDays: string[]
  hoursPerDay: Record<string, number>
  totalHours: number
  startDate: string
  endDate: string
}

/**
 * 将工时分配到具体的工作日，支持拆分成多个子任务
 *
 * @param startFrom - 开始日期
 * @param totalHours - 总工时
 * @param config - 日历配置
 * @param enableSplit - 是否启用任务拆分
 * @returns 工作日分配结果
 */
export function allocateWorkDays(
  startFrom: string,
  totalHours: number,
  config: SchedulerConfig,
  enableSplit: boolean = true
): WorkDayAllocation {
  const workDays: string[] = []
  const hoursPerDay: Record<string, number> = {}
  const subTasks: SubTaskAllocation[] = []

  let remainingHours = totalHours
  let currentDate = startFrom
  let currentSubTask: SubTaskAllocation | null = null

  // 最多循环365天，防止无限循环
  let safety = 0
  const maxIterations = 365

  while (remainingHours > 0 && safety < maxIterations) {
    safety++

    // 跳过休息日
    if (config.restDays.includes(currentDate)) {
      // 如果当前有子任务在进行中，结束它
      if (enableSplit && currentSubTask && currentSubTask.workDays.length > 0) {
        currentSubTask.endDate = currentSubTask.workDays[currentSubTask.workDays.length - 1]
        subTasks.push(currentSubTask)
        currentSubTask = null
      }
      currentDate = addDays(currentDate, 1)
      continue
    }

    // 跳过周末（如果配置了周末休息）
    if (config.weekendRest && isWeekend(currentDate)) {
      // 如果当前有子任务在进行中，结束它
      if (enableSplit && currentSubTask && currentSubTask.workDays.length > 0) {
        currentSubTask.endDate = currentSubTask.workDays[currentSubTask.workDays.length - 1]
        subTasks.push(currentSubTask)
        currentSubTask = null
      }
      currentDate = addDays(currentDate, 1)
      continue
    }

    // 获取当天可用工时
    const dayHours = config.workHoursPerDay[currentDate] || config.defaultWorkHours

    if (dayHours > 0) {
      const allocate = Math.min(remainingHours, dayHours)

      workDays.push(currentDate)
      hoursPerDay[currentDate] = allocate

      // 如果启用拆分，管理子任务
      if (enableSplit) {
        // 如果当前没有子任务，创建一个新的
        if (!currentSubTask) {
          currentSubTask = {
            workDays: [],
            hoursPerDay: {},
            totalHours: 0,
            startDate: currentDate,
            endDate: currentDate
          }
        }

        currentSubTask.workDays.push(currentDate)
        currentSubTask.hoursPerDay[currentDate] = allocate
        currentSubTask.totalHours += allocate
        currentSubTask.endDate = currentDate

        // 如果当天工时用满了，且还有剩余工时，准备创建新的子任务
        if (allocate === dayHours && remainingHours - allocate > 0) {
          subTasks.push(currentSubTask)
          currentSubTask = null
        }
      }

      remainingHours -= allocate
    }

    currentDate = addDays(currentDate, 1)
  }

  // 处理最后一个子任务
  if (enableSplit && currentSubTask && currentSubTask.workDays.length > 0) {
    subTasks.push(currentSubTask)
  }

  return {
    workDays,
    hoursPerDay,
    subTasks: enableSplit && subTasks.length > 1 ? subTasks : undefined
  }
}

/**
 * 主排单算法
 */

/**
 * 智能排单算法 - 贪心填充版本
 *
 * 输入：待排订单列表、日历配置、选项
 * 输出：排单结果
 *
 * @param commissions - VGen Commissions 列表
 * @param config - 日历配置
 * @param options - 排单选项
 * @param workHoursConfig - 工时配置（可选）
 * @param priorityConfig - 手动优先级配置（可选）
 * @param services - 服务列表（可选，用于获取category）
 * @returns 排单结果列表
 */
export function scheduleCommissions(
  commissions: VGenCommission[],
  config: SchedulerConfig,
  options: ScheduleOptions = DEFAULT_SCHEDULE_OPTIONS,
  workHoursConfig?: WorkHoursConfig | null,
  priorityConfig?: PriorityConfig | null,
  services?: any[],
  existingTasks?: ScheduledTask[]
): ScheduledTask[] {
  // 提取锁定和完成的任务（这些任务不会被重新排单）
  const lockedTasks = (existingTasks || []).filter(
    task => task.status === TaskStatus.LOCKED || task.status === TaskStatus.COMPLETED
  )

  // 获取已被锁定/完成任务占用的 commission IDs
  const lockedCommissionIds = new Set(lockedTasks.map(task => task.commissionId))

  // Step 1: 过滤出需要排单的订单（READY 和 WIP，且不在锁定任务中）
  const pendingTasks = commissions.filter(
    c => (c.status === 'IN_PROGRESS' || c.status === 'PENDING') && !lockedCommissionIds.has(c.id)
  )

  // Step 2: 计算每个订单的优先级并排序
  const tasksWithPriority = pendingTasks.map(comm => ({
    commission: comm,
    priorityScore: calculatePriority(
      comm,
      options.priorityWeights,
      priorityConfig || undefined,
      services
    ),
    remainingHours: getCommissionWorkHours(comm, workHoursConfig)
  }))

  // 按优先级降序排序
  tasksWithPriority.sort((a, b) => b.priorityScore - a.priorityScore)

  // Step 3: 贪心填充算法 - 使用日历跟踪每天的剩余工时
  const result: ScheduledTask[] = []
  const dailySchedule: Map<string, number> = new Map() // 日期 -> 已使用工时

  // 初始化：将锁定任务的工时计入日程表
  lockedTasks.forEach(task => {
    task.workDays.forEach(day => {
      const hoursUsed = task.hoursPerDay[day] || 0
      dailySchedule.set(day, (dailySchedule.get(day) || 0) + hoursUsed)
    })
  })

  let currentDate = options.startFrom || getTodayString()

  // 处理每个订单
  for (const taskData of tasksWithPriority) {
    const { commission, priorityScore } = taskData
    let remainingHours = taskData.remainingHours

    if (remainingHours <= 0) continue

    // 生成唯一的父任务ID
    const parentTaskId = `task-${commission.id}-${Date.now()}`
    const subTasks: SubTaskAllocation[] = []

    // 当前子任务
    let currentSubTask: SubTaskAllocation | null = null
    let searchDate = currentDate
    let safety = 0
    const maxIterations = 365

    // 填充任务到可用的时间槽
    while (remainingHours > 0 && safety < maxIterations) {
      safety++

      // 跳过休息日和周末
      while ((config.restDays.includes(searchDate) ||
              (config.weekendRest && isWeekend(searchDate))) &&
             safety < maxIterations) {
        // 如果当前有子任务在进行，结束它
        if (currentSubTask && currentSubTask.workDays.length > 0) {
          currentSubTask.endDate = currentSubTask.workDays[currentSubTask.workDays.length - 1]
          subTasks.push(currentSubTask)
          currentSubTask = null
        }
        searchDate = addDays(searchDate, 1)
        safety++
      }

      if (safety >= maxIterations) break

      // 获取当天的可用工时
      const dayMaxHours = config.workHoursPerDay[searchDate] || config.defaultWorkHours
      const usedHours = dailySchedule.get(searchDate) || 0
      const availableHours = dayMaxHours - usedHours

      if (availableHours <= 0) {
        // 这一天已满，移动到下一天
        if (currentSubTask && currentSubTask.workDays.length > 0) {
          currentSubTask.endDate = currentSubTask.workDays[currentSubTask.workDays.length - 1]
          subTasks.push(currentSubTask)
          currentSubTask = null
        }
        searchDate = addDays(searchDate, 1)
        continue
      }

      // 计算这一天可以分配多少小时
      const allocateHours = Math.min(remainingHours, availableHours)

      // 创建或更新子任务
      if (!currentSubTask) {
        currentSubTask = {
          workDays: [],
          hoursPerDay: {},
          totalHours: 0,
          startDate: searchDate,
          endDate: searchDate
        }
      }

      // 记录这一天的工时分配
      currentSubTask.workDays.push(searchDate)
      currentSubTask.hoursPerDay[searchDate] = allocateHours
      currentSubTask.totalHours += allocateHours
      currentSubTask.endDate = searchDate

      // 更新日历
      dailySchedule.set(searchDate, usedHours + allocateHours)
      remainingHours -= allocateHours

      // 如果这一天用满了，准备创建新的子任务
      if (usedHours + allocateHours >= dayMaxHours) {
        if (currentSubTask && currentSubTask.workDays.length > 0) {
          subTasks.push(currentSubTask)
          currentSubTask = null
        }
        searchDate = addDays(searchDate, 1)
      }

      // 更新全局的currentDate，让下一个任务从合适的位置开始
      if (!dailySchedule.has(currentDate) ||
          (dailySchedule.get(currentDate) || 0) >=
          (config.workHoursPerDay[currentDate] || config.defaultWorkHours)) {
        currentDate = searchDate
      }
    }

    // 处理最后一个子任务
    if (currentSubTask && currentSubTask.workDays.length > 0) {
      subTasks.push(currentSubTask)
    }

    // 创建ScheduledTask对象
    if (subTasks.length > 1) {
      // 多个子任务 - 计算每个子任务的垂直位置
      let accumulatedHours = 0
      subTasks.forEach((subTask, index) => {
        // 计算这个子任务在当天的起始小时
        const firstDay = subTask.workDays[0]
        const hoursOnFirstDay = subTask.hoursPerDay[firstDay] || 0

        // BUG FIX: 改进垂直位置分配算法
        // 检查同一天已分配的任务，找到合适的垂直位置
        let startHour = 9 // 默认从上午9点开始

        // 查找该天已经占用的时间段
        const dayOccupied: Array<{start: number, end: number}> = []
        // 包括锁定任务
        lockedTasks.forEach(existingTask => {
          if (existingTask.workDays.includes(firstDay)) {
            const existingStartHour = (existingTask as any).startHour ?? 9
            const existingHours = existingTask.totalHours / existingTask.workDays.length
            dayOccupied.push({
              start: existingStartHour,
              end: existingStartHour + existingHours
            })
          }
        })
        // 包括已排单的新任务
        result.forEach(existingTask => {
          if (existingTask.workDays.includes(firstDay)) {
            const existingStartHour = (existingTask as any).startHour ?? 9
            const existingHours = existingTask.totalHours / existingTask.workDays.length
            dayOccupied.push({
              start: existingStartHour,
              end: existingStartHour + existingHours
            })
          }
        })

        // 按开始时间排序
        dayOccupied.sort((a, b) => a.start - b.start)

        // 找到第一个可用的时间段
        for (const occupied of dayOccupied) {
          if (startHour + hoursOnFirstDay <= occupied.start) {
            // 找到空隙，可以放置
            break
          }
          // 移动到这个任务结束后
          startHour = Math.max(startHour, occupied.end + 0.5) // 留0.5小时间隔
        }

        // 确保不超过工作时间（晚上8点）
        startHour = Math.min(startHour, 20 - hoursOnFirstDay)

        const scheduledSubTask: ScheduledTask & { startHour?: number } = {
          commissionId: commission.id,
          startDate: subTask.startDate,
          endDate: subTask.endDate,
          workDays: subTask.workDays,
          hoursPerDay: subTask.hoursPerDay,
          totalHours: subTask.totalHours,
          isLocked: false,
          priorityScore,
          parentTaskId: parentTaskId,
          subTaskIndex: index,
          subTaskCount: subTasks.length,
          taskId: `${parentTaskId}-sub-${index}`,
          startHour: startHour
        }
        result.push(scheduledSubTask)
        accumulatedHours += subTask.totalHours
      })
    } else if (subTasks.length === 1) {
      // 单个任务（未拆分）
      const subTask = subTasks[0]

      // BUG FIX: 同样为单个任务分配合适的垂直位置
      let startHour = 9
      const firstDay = subTask.workDays[0]
      const hoursNeeded = subTask.totalHours / subTask.workDays.length

      // 查找该天已经占用的时间段
      const dayOccupied: Array<{start: number, end: number}> = []
      // 包括锁定任务
      lockedTasks.forEach(existingTask => {
        if (existingTask.workDays.includes(firstDay)) {
          const existingStartHour = (existingTask as any).startHour ?? 9
          const existingHours = existingTask.totalHours / existingTask.workDays.length
          dayOccupied.push({
            start: existingStartHour,
            end: existingStartHour + existingHours
          })
        }
      })
      // 包括已排单的新任务
      result.forEach(existingTask => {
        if (existingTask.workDays.includes(firstDay)) {
          const existingStartHour = (existingTask as any).startHour ?? 9
          const existingHours = existingTask.totalHours / existingTask.workDays.length
          dayOccupied.push({
            start: existingStartHour,
            end: existingStartHour + existingHours
          })
        }
      })

      // 按开始时间排序
      dayOccupied.sort((a, b) => a.start - b.start)

      // 找到第一个可用的时间段
      for (const occupied of dayOccupied) {
        if (startHour + hoursNeeded <= occupied.start) {
          break
        }
        startHour = Math.max(startHour, occupied.end + 0.5)
      }

      // 确保不超过工作时间
      startHour = Math.min(startHour, 20 - hoursNeeded)

      const scheduledTask: ScheduledTask & { startHour?: number } = {
        commissionId: commission.id,
        startDate: subTask.startDate,
        endDate: subTask.endDate,
        workDays: subTask.workDays,
        hoursPerDay: subTask.hoursPerDay,
        totalHours: subTask.totalHours,
        isLocked: false,
        priorityScore,
        taskId: parentTaskId,
        startHour: startHour
      }
      result.push(scheduledTask)
    }
  }

  // 合并锁定任务和新排单的任务
  return [...lockedTasks, ...result]
}

/**
 * 重新排单单个任务
 *
 * 当用户删除或移动某个任务后，重新为它找到合适的位置
 *
 * @param taskId - 任务ID
 * @param existingTasks - 现有已排单任务
 * @param commissions - 所有订单
 * @param config - 日历配置
 * @param workHoursConfig - 工时配置
 * @param priorityConfig - 手动优先级配置
 * @param services - 服务列表
 * @returns 新的排单任务
 */
export function rescheduleTask(
  taskId: string,
  existingTasks: ScheduledTask[],
  commissions: VGenCommission[],
  config: SchedulerConfig,
  workHoursConfig?: WorkHoursConfig | null,
  priorityConfig?: PriorityConfig | null,
  services?: any[]
): ScheduledTask | null {
  // 找到对应的 commission
  const commission = commissions.find(c => c.id === taskId)
  if (!commission) {
    return null
  }

  const hoursNeeded = getCommissionWorkHours(commission, workHoursConfig)

  // 找到第一个可用的起始日期（不与已锁定任务冲突）
  const lockedTasks = existingTasks.filter(t => t.isLocked && t.commissionId !== taskId)
  let currentDate = getTodayString()

  // 简单策略：找到所有锁定任务之后的第一个空闲日期
  if (lockedTasks.length > 0) {
    const latestEnd = lockedTasks
      .map(t => t.endDate)
      .sort()
      .reverse()[0]
    currentDate = getNextWorkDay(latestEnd, config)
  }

  // 分配工作日
  const allocation = allocateWorkDays(currentDate, hoursNeeded, config)

  if (allocation.workDays.length === 0) {
    return null
  }

  return {
    commissionId: commission.id,
    startDate: allocation.workDays[0],
    endDate: allocation.workDays[allocation.workDays.length - 1],
    workDays: allocation.workDays,
    hoursPerDay: allocation.hoursPerDay,
    totalHours: hoursNeeded,
    isLocked: false,
    priorityScore: calculatePriority(
      commission,
      DEFAULT_SCHEDULE_OPTIONS.priorityWeights,
      priorityConfig || undefined,
      services
    )
  }
}

/**
 * 日历视图辅助函数
 */

/**
 * 生成日历天数据
 *
 * @param date - 日期
 * @param config - 配置
 * @param tasks - 已排单任务
 * @returns 日历天数据
 */
export function generateCalendarDay(
  date: string,
  config: SchedulerConfig,
  tasks: ScheduledTask[]
): CalendarDay {
  const isRest = config.restDays.includes(date)
  const isWknd = isWeekend(date)
  const today = getTodayString()

  // 筛选出在这一天工作的任务
  const dayTasks = tasks.filter(t => t.workDays.includes(date))

  // 计算已使用的工时
  const usedHours = dayTasks.reduce((sum, t) => sum + (t.hoursPerDay[date] || 0), 0)

  // 工作小时数
  const workHours = isRest || (config.weekendRest && isWknd)
    ? 0
    : (config.workHoursPerDay[date] || config.defaultWorkHours)

  return {
    date,
    isRestDay: isRest,
    isWeekend: isWknd,
    isToday: date === today,
    workHours,
    tasks: dayTasks,
    usedHours,
    remainingHours: Math.max(0, workHours - usedHours)
  }
}
