/**
 * 复制测试数据库到 AppData 目录
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const TEST_DB = join(__dirname, '..', 'berrydone-test.json')
const APP_DATA_DIR = join(process.env.APPDATA || '', 'berrydone')
const PROD_DB = join(APP_DATA_DIR, 'berrydone.json')

async function main() {
  console.log('📋 复制数据库到生产环境')
  console.log('================================\n')

  // 检查测试数据库
  if (!existsSync(TEST_DB)) {
    console.error('❌ 测试数据库不存在:', TEST_DB)
    process.exit(1)
  }

  // 创建目录
  if (!existsSync(APP_DATA_DIR)) {
    console.log('📁 创建目录:', APP_DATA_DIR)
    mkdirSync(APP_DATA_DIR, { recursive: true })
  }

  // 读取测试数据
  console.log('📖 读取测试数据库...')
  const data = readFileSync(TEST_DB, 'utf-8')
  const jsonData = JSON.parse(data)

  console.log('📊 数据统计:')
  console.log(`   VGen Commissions: ${jsonData.vgenCommissions?.length || 0}`)
  console.log(`   Tasks: ${jsonData.tasks?.length || 0}`)
  console.log(`   Projects: ${jsonData.projects?.length || 0}`)

  // 写入生产数据库
  console.log('\n💾 写入到:', PROD_DB)
  writeFileSync(PROD_DB, data)

  console.log('\n✅ 完成！数据已复制到生产环境')
  console.log('\n现在可以运行: pnpm dev')
}

main().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})

