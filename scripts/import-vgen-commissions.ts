/**
 * 导入 VGen Commissions 到数据库
 * 
 * 从 vgen-commissions-data.json 读取数据，
 * 转换并导入到本地数据库
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

interface VGenCommission {
  id: string
  commissionID: string
  serviceID?: string // service.serviceID - 用于匹配橱窗页面的服务
  clientName: string
  clientEmail: string
  projectName: string
  serviceName: string
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'REFUNDED'
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  startDate: string
  estimatedStartDate?: string
  dueDate?: string
  completedDate?: string
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
  projectId: string
  _raw?: any
}

interface Database {
  tasks: any[]
  projects: any[]
  vgenCommissions: VGenCommission[]
}

import { app } from 'electron'

const DATA_FILE = join(__dirname, '..', 'vgen-commissions-data.json')

// 数据库路径逻辑与 src/main/db.ts 保持一致
function getDBPath(): string {
  // 检查是否有环境变量指定的路径（从 vgen-updater 传递）
  if (process.env.DB_PATH) {
    return process.env.DB_PATH
  }

  // 判断是否在打包环境
  const isPackaged = process.env.ELECTRON_IS_PACKAGED === 'true' || !process.cwd().includes('node_modules')

  if (isPackaged && process.resourcesPath) {
    // 打包环境
    return join(process.resourcesPath, 'data', 'berrydone.json')
  } else {
    // 开发环境
    return join(process.cwd(), 'data', 'berrydone.json')
  }
}

const DB_FILE = getDBPath()
console.log('[导入脚本] 数据库路径:', DB_FILE)

/**
 * 状态映射 - 使用 phaseID 字段
 * VGen 的 phaseID 包含实际的工作流阶段：WIP、READY、NEW、WAITLIST 等
 * status 字段只表示 commission 的整体状态：COMPLETED、DRAFT、CANCELLED 等
 */
function mapStatus(phaseID: string, status: string): VGenCommission['status'] {
  // 如果已完成，优先使用 COMPLETED
  if (status === 'COMPLETED') {
    return 'COMPLETED'
  }
  
  // 如果已取消或拒绝
  if (status === 'CANCELLED' || status === 'REJECTED' || status === 'DECLINED') {
    return 'CANCELLED'
  }
  
  // 使用 phaseID 来确定具体的工作阶段
  const phaseMap: Record<string, VGenCommission['status']> = {
    'WIP': 'IN_PROGRESS',
    'READY': 'PENDING', // Ready 暂时映射为 PENDING
    'NEW': 'PENDING',
    'WAITLIST': 'PENDING',
    'PENDING': 'PENDING',
    '': 'PENDING'
  }
  
  return phaseMap[phaseID] || 'PENDING'
}

/**
 * 转换 VGen 原始数据到我们的格式
 */
function convertCommission(raw: any): VGenCommission {
  const proposal = raw.proposals?.[0] || {}
  const service = raw.service || {}
  
  // 计算总金额
  let totalCost = 0
  if (proposal.milestones && proposal.milestones.length > 0) {
    totalCost = proposal.milestones.reduce(
      (sum: number, m: any) => sum + (m.milestoneTotalCost || 0),
      0
    )
  } else if (proposal.projectTotalCost) {
    totalCost = proposal.projectTotalCost
  }

  return {
    id: raw.commissionID,
    commissionID: raw.commissionID,
    serviceID: service.serviceID || '', // 保存 serviceID 用于匹配橱窗服务
    clientName: raw.clientName || 'Unknown',
    clientEmail: raw.clientEmail || '',
    projectName: raw.projectName || service.serviceName || 'Untitled',
    serviceName: service.serviceName || raw.projectName || 'Untitled',
    status: mapStatus(raw.phaseID, raw.status), // 使用 phaseID 和 status
    paymentStatus: raw.paymentStatus || 'UNPAID',
    priority: raw.priority || 'NORMAL',
    startDate: raw.created,
    estimatedStartDate: proposal.estimatedStart,
    dueDate: proposal.guaranteedDeliveryDate,
    completedDate: raw.finalDelivery?.created,
    totalCost: totalCost / 100, // 转换为美元（从分）
    currency: proposal.projectCurrency || raw.formCurrency || 'USD',
    clientSocials: raw.clientSocials,
    notes: raw.notes || '',
    isArchived: raw.isArchived || false,
    projectId: 'vgen',
    _raw: raw
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 导入 VGen Commissions 到数据库')
  console.log('================================\n')

  // 检查数据文件
  if (!existsSync(DATA_FILE)) {
    console.error('❌ 找不到数据文件:', DATA_FILE)
    console.log('\n请先运行: pnpm vgen:browser')
    process.exit(1)
  }

  // 读取抓取的数据
  console.log('📖 读取数据文件...')
  const rawData = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
  
  // 找到 commissions API 数据
  const commApi = rawData.apiRequests?.find((r: any) => 
    r.url.includes('/commission/user/')
  )

  if (!commApi || !commApi.data) {
    console.error('❌ 未找到 commissions 数据')
    console.log('\n请确保已运行 pnpm vgen:browser 并成功抓取数据')
    process.exit(1)
  }

  const rawCommissions = commApi.data
  console.log(`✅ 找到 ${rawCommissions.length} 个 commissions\n`)

  // 转换数据
  console.log('🔄 转换数据格式...')
  const commissions: VGenCommission[] = rawCommissions.map(convertCommission)

  // 统计信息
  const stats = {
    total: commissions.length,
    completed: commissions.filter(c => c.status === 'COMPLETED').length,
    inProgress: commissions.filter(c => c.status === 'IN_PROGRESS').length,
    pending: commissions.filter(c => c.status === 'PENDING').length,
    draft: commissions.filter(c => c.status === 'DRAFT').length,
    paid: commissions.filter(c => c.paymentStatus === 'PAID').length,
    unpaid: commissions.filter(c => c.paymentStatus === 'UNPAID').length
  }

  console.log('📊 统计信息:')
  console.log(`   总计: ${stats.total}`)
  console.log(`   已完成: ${stats.completed}`)
  console.log(`   进行中: ${stats.inProgress}`)
  console.log(`   待处理: ${stats.pending}`)
  console.log(`   草稿: ${stats.draft}`)
  console.log(`   已付款: ${stats.paid}`)
  console.log(`   未付款: ${stats.unpaid}\n`)

  // 初始化数据库
  console.log('💾 初始化数据库...')
  const adapter = new JSONFile<Database>(DB_FILE)
  const db = new Low<Database>(adapter, {
    tasks: [],
    projects: [
      {
        id: 'website',
        name: 'Website',
        color: '#8B5CF6',
        icon: '🌐'
      },
      {
        id: 'vgen',
        name: 'VGen Commissions',
        color: '#54C5B7',
        icon: '🎨'
      }
    ],
    vgenCommissions: []
  })

  await db.read()

  // 确保数据结构存在
  if (!db.data.vgenCommissions) {
    db.data.vgenCommissions = []
  }

  // 添加 VGen 项目（如果不存在）
  const vgenProject = db.data.projects.find(p => p.id === 'vgen')
  if (!vgenProject) {
    db.data.projects.push({
      id: 'vgen',
      name: 'VGen Commissions',
      color: '#54C5B7',
      icon: '🎨'
    })
  }

  // 导入数据
  console.log('📥 导入数据到数据库...')
  db.data.vgenCommissions = commissions

  // 保存
  await db.write()

  console.log(`✅ 成功导入 ${commissions.length} 个 commissions!`)
  console.log(`\n💾 数据库文件: ${DB_FILE}`)

  // 显示一些示例数据
  console.log('\n📝 示例数据 (前 3 个):')
  commissions.slice(0, 3).forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.projectName}`)
    console.log(`   客户: ${c.clientName}`)
    console.log(`   状态: ${c.status} / ${c.paymentStatus}`)
    console.log(`   金额: $${c.totalCost.toFixed(2)} ${c.currency}`)
    console.log(`   开始: ${new Date(c.startDate).toLocaleDateString()}`)
    if (c.dueDate) {
      console.log(`   截止: ${new Date(c.dueDate).toLocaleDateString()}`)
    }
  })

  console.log('\n✨ 完成！现在可以在应用中查看这些数据了。')
}

// 运行
main().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})

