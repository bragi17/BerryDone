/**
 * 更新现有数据库中的 commissions，添加 serviceID 字段
 * 从 _raw.service.serviceID 提取数据到顶层
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DB_FILE = join(process.env.APPDATA || '', 'berrydone', 'berrydone.json')

async function main() {
  console.log('🚀 更新 Commissions ServiceID')
  console.log('================================\n')

  // 读取数据库
  console.log('📖 读取数据库...')
  const dbContent = readFileSync(DB_FILE, 'utf-8')
  const db = JSON.parse(dbContent)

  if (!db.vgenCommissions || db.vgenCommissions.length === 0) {
    console.error('❌ 数据库中没有 commissions')
    process.exit(1)
  }

  console.log(`✅ 找到 ${db.vgenCommissions.length} 个 commissions\n`)

  // 更新数据
  console.log('🔄 提取 serviceID...')
  let updatedCount = 0
  let missingCount = 0

  db.vgenCommissions = db.vgenCommissions.map((comm: any) => {
    // 如果已经有 serviceID，跳过
    if (comm.serviceID) {
      return comm
    }

    // 从 _raw.service.serviceID 提取
    const serviceID = comm._raw?.service?.serviceID
    if (serviceID) {
      updatedCount++
      return {
        ...comm,
        serviceID: serviceID
      }
    } else {
      missingCount++
      return comm
    }
  })

  console.log(`✅ 更新了 ${updatedCount} 个 commissions`)
  console.log(`⚠️  ${missingCount} 个 commissions 没有 serviceID\n`)

  // 保存数据库
  console.log('💾 保存数据库...')
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  console.log(`✅ 数据库已更新: ${DB_FILE}`)

  // 验证匹配率
  console.log('\n📊 验证 ServiceID 匹配率...')
  const services = db.vgenServices || []
  const serviceIds = new Set(services.map((s: any) => s.serviceId))
  const commissionServiceIds = db.vgenCommissions
    .map((c: any) => c.serviceID)
    .filter(Boolean)
  const uniqueCommServiceIds = new Set(commissionServiceIds)
  const matchCount = Array.from(uniqueCommServiceIds).filter(id => serviceIds.has(id)).length

  console.log(`   Services 数量: ${services.length}`)
  console.log(`   Commissions 使用的 Service 数量: ${uniqueCommServiceIds.size}`)
  console.log(`   可以匹配的 Service 数量: ${matchCount}`)
  console.log(`   匹配率: ${((matchCount / uniqueCommServiceIds.size) * 100).toFixed(1)}%`)

  console.log('\n✨ 完成！')
}

main().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})
