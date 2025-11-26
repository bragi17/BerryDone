// 导入 VGen 服务列表到数据库
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { VGenService } from '../src/main/types/vgen-service'

interface Database {
  tasks: any[]
  projects: any[]
  vgenCommissions: any[]
  vgenServices: VGenService[]
}

const DATA_FILE = path.join(process.cwd(), 'vgen-services-data.json')

// 获取 Electron 的 userData 路径（Windows）
function getAppDataPath(): string {
  const platform = process.platform
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'berrydone')
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'berrydone')
  } else {
    return path.join(os.homedir(), '.config', 'berrydone')
  }
}

const DB_FILE = path.join(getAppDataPath(), 'berrydone.json')

async function run() {
  console.log('📦 导入 VGen 服务列表到数据库')
  console.log('================================\n')

  // 检查数据文件是否存在
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ 找不到数据文件:', DATA_FILE)
    console.log('\n请先运行: pnpm vgen:services')
    process.exit(1)
  }

  console.log('📖 读取数据文件...')
  const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))

  console.log('📊 原始数据统计:')
  console.log(`   API 请求数: ${rawData.apiRequests?.length || 0}`)
  console.log(`   提取的服务数: ${rawData.extractedCount || 0}`)

  // 尝试从 API 请求中查找服务数据
  let servicesData: any[] = []

  if (rawData.apiRequests && rawData.apiRequests.length > 0) {
    console.log('\n🔍 分析 API 请求...')
    for (const req of rawData.apiRequests) {
      console.log(`   - ${req.url}`)
      
      // 查找包含服务信息的 API 响应
      if (req.data && Array.isArray(req.data)) {
        servicesData = req.data
        console.log(`   ✅ 找到服务数据数组，包含 ${servicesData.length} 项`)
        break
      } else if (req.data && typeof req.data === 'object') {
        // 可能是对象格式，尝试查找服务数组
        const keys = Object.keys(req.data)
        for (const key of keys) {
          if (Array.isArray(req.data[key]) && req.data[key].length > 0) {
            servicesData = req.data[key]
            console.log(`   ✅ 在 "${key}" 字段中找到服务数据，包含 ${servicesData.length} 项`)
            break
          }
        }
      }
    }
  }

  if (servicesData.length === 0 && rawData.services && rawData.services.length > 0) {
    servicesData = rawData.services
    console.log(`\n✅ 使用页面提取的服务数据，包含 ${servicesData.length} 项`)
  }

  if (servicesData.length === 0) {
    console.error('\n❌ 未找到有效的服务数据')
    console.log('\n可能的原因:')
    console.log('1. VGen 页面结构发生变化')
    console.log('2. 需要登录才能查看服务列表')
    console.log('3. API 端点已更改')
    console.log('\n建议:')
    console.log('- 查看生成的 vgen-page-screenshot.png 截图')
    console.log('- 查看 vgen-page.html 了解页面结构')
    console.log('- 检查 cookies 是否有效')
    process.exit(1)
  }

  console.log('\n🔄 转换数据格式...')
  const services: VGenService[] = servicesData.map((raw: any, index: number) => {
    // 根据实际 API 结构调整字段映射
    const service: VGenService = {
      id: raw.serviceID || raw.id || `service-${index}`,
      serviceId: raw.serviceID || raw.id || `service-${index}`,
      title: raw.serviceName || raw.title || raw.name || `Service ${index}`,
      description: raw.description || '',
      category: raw.category || '',
      price: {
        from: raw.priceFrom || raw.price?.from || 0,
        currency: raw.currency || raw.price?.currency || 'USD'
      },
      imageUrl: raw.images?.[0]?.url || raw.imageUrl || raw.image,
      thumbnailUrl: raw.images?.[0]?.thumbnail || raw.thumbnailUrl,
      isOpen: raw.isActive !== false && raw.isOpen !== false,
      deliveryTime: raw.deliveryTime,
      slots: raw.slots ? {
        total: raw.slots.total || 0,
        available: (raw.slots.total || 0) - (raw.slots.used || 0)
      } : undefined,
      estimatedWorkHours: 0, // 默认为0，用户后续填写
      tags: raw.tags || [],
      createdAt: raw.created,
      updatedAt: raw.modified
    }
    
    return service
  })

  console.log(`✅ 转换完成，共 ${services.length} 个服务\n`)

  // 显示示例数据
  console.log('📝 示例数据 (前 3 个):')
  services.slice(0, 3).forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.title}`)
    console.log(`   分类: ${s.category || '未分类'}`)
    console.log(`   价格: From $${s.price.from} ${s.price.currency}`)
    console.log(`   状态: ${s.isOpen ? '开放接单' : '暂停接单'}`)
    if (s.deliveryTime) {
      console.log(`   交付: ${s.deliveryTime}`)
    }
    if (s.slots) {
      console.log(`   槽位: ${s.slots.available}/${s.slots.total}`)
    }
  })

  console.log('\n💾 初始化数据库...')
  console.log(`📂 数据库路径: ${DB_FILE}`)
  
  // 确保目录存在
  const dbDir = path.dirname(DB_FILE)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`✅ 创建数据库目录: ${dbDir}`)
  }
  
  const adapter = new JSONFile<Database>(DB_FILE)
  const db = new Low<Database>(adapter, {
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
    vgenServices: []
  })

  await db.read()

  if (!db.data.vgenServices) {
    db.data.vgenServices = []
  }

  console.log('📥 导入数据到数据库...')
  db.data.vgenServices = services

  await db.write()

  console.log(`✅ 成功导入 ${services.length} 个服务!`)
  console.log(`\n💾 数据库文件: ${DB_FILE}`)

  // 统计信息
  const stats = {
    total: services.length,
    open: services.filter(s => s.isOpen).length,
    withImage: services.filter(s => s.imageUrl).length,
    categories: new Set(services.map(s => s.category).filter(Boolean)).size
  }

  console.log('\n📊 统计信息:')
  console.log(`   总计: ${stats.total}`)
  console.log(`   开放接单: ${stats.open}`)
  console.log(`   有图片: ${stats.withImage}`)
  console.log(`   分类数: ${stats.categories}`)

  console.log('\n✨ 完成！现在可以在应用中的 Commissions 页面查看这些服务了。')
}

run().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})

