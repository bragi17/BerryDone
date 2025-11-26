/**
 * 设置所有服务的默认工时为 4.5 小时
 */

import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 数据库路径
const dbPath = path.join(__dirname, '..', 'berrydone-test.json')

interface Database {
  workHoursConfig: {
    globalDefault: number
    categoryDefaults: Record<string, number>
    serviceOverrides: Record<string, number>
  }
  vgenServices: Array<{
    id: string
    serviceId: string
    estimatedWorkHours?: number
  }>
}

async function setDefaultHours() {
  console.log('📝 设置默认工时为 4.5 小时...')

  // 初始化数据库
  const adapter = new JSONFileSync<Database>(dbPath)
  const db = new LowSync<Database>(adapter, {
    workHoursConfig: {
      globalDefault: 8,
      categoryDefaults: {},
      serviceOverrides: {}
    },
    vgenServices: []
  })

  // 读取数据
  await db.read()

  // 设置全局默认工时为 4.5 小时
  if (!db.data.workHoursConfig) {
    db.data.workHoursConfig = {
      globalDefault: 4.5,
      categoryDefaults: {},
      serviceOverrides: {}
    }
  } else {
    db.data.workHoursConfig.globalDefault = 4.5
  }

  // 为每个服务设置默认工时
  if (db.data.vgenServices) {
    db.data.vgenServices.forEach(service => {
      // 设置每个服务的默认工时为 4.5
      db.data.workHoursConfig.serviceOverrides[service.serviceId] = 4.5
    })
    console.log(`✅ 已为 ${db.data.vgenServices.length} 个服务设置默认工时为 4.5 小时`)
  }

  // 保存数据
  await db.write()

  console.log('✅ 工时配置已更新:')
  console.log(`   全局默认: ${db.data.workHoursConfig.globalDefault} 小时`)
  console.log(`   服务覆盖: ${Object.keys(db.data.workHoursConfig.serviceOverrides).length} 个`)
  console.log('\n请重新运行智能排单以查看效果！')
}

// 运行脚本
setDefaultHours().catch(console.error)