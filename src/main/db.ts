// 数据库配置
import { app } from 'electron'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { VGenService } from './types/vgen-service'
import type { SchedulerState } from './types/scheduler'

export interface Task {
  id: string
  title: string
  startDate: string
  endDate: string
  progress: number
  status: 'pending' | 'in-progress' | 'completed'
  color: string
  projectId: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
}

// VGen Commission 数据结构
export interface VGenCommission {
  id: string // commissionID
  commissionID: string
  serviceID?: string // service.serviceID - 用于匹配橱窗页面的服务
  clientName: string
  clientEmail: string
  projectName: string // commission 名称
  serviceName: string // service 名称
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'REFUNDED'
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  startDate: string // created date
  estimatedStartDate?: string // proposals[0].estimatedStart
  dueDate?: string // proposals[0].guaranteedDeliveryDate
  completedDate?: string // finalDelivery.created
  totalCost: number
  currency: string
  clientSocials?: {
    discord?: string
    twitter?: string
    instagram?: string
    twitch?: string
    youtube?: string
  }
  notes: string
  isArchived: boolean
  projectId: string // 关联的项目ID
  estimatedWorkHours?: number // 预计工时（小时）

  // 原始数据（可选，用于调试）
  _raw?: any
}

export interface Database {
  tasks: Task[]
  projects: Project[]
  vgenCommissions: VGenCommission[]
  vgenServices: VGenService[] // VGen 服务列表
  schedulerState?: SchedulerState // 智能排单状态
  workHoursConfig?: WorkHoursConfig // 工时配置
}

// 工时配置
export interface WorkHoursConfig {
  globalDefault: number // 全局默认工时（小时）
  categoryDefaults: Record<string, number> // 按类别设置的默认工时
  serviceOverrides: Record<string, number> // 按具体 service ID 设置的工时
}

// 默认数据
const defaultData: Database = {
  tasks: [],
  projects: [
    {
      id: 'vgen',
      name: 'VGen Commissions',
      color: '#54C5B7',
      icon: '🎨'
    }
  ],
  vgenCommissions: [],
  vgenServices: [],
  workHoursConfig: {
    globalDefault: 8,
    categoryDefaults: {},
    serviceOverrides: {}
  }
}

let db: Low<Database>

export async function initDB(): Promise<Low<Database>> {
  const dbPath = join(app.getPath('userData'), 'berrydone.json')
  const adapter = new JSONFile<Database>(dbPath)
  db = new Low<Database>(adapter, defaultData)

  await db.read()

  // 如果数据库为空，使用默认数据
  if (!db.data) {
    db.data = defaultData
    await db.write()
  }

  // 确保 workHoursConfig 存在
  if (!db.data.workHoursConfig) {
    db.data.workHoursConfig = {
      globalDefault: 8,
      categoryDefaults: {},
      serviceOverrides: {}
    }
    await db.write()
  }

  return db
}

export function getDB(): Low<Database> {
  return db
}

// 导出 VGenService 和 WorkHoursConfig 类型供其他模块使用
export type { VGenService, WorkHoursConfig }

