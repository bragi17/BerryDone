// 解析 VGen HTML 文件中的服务数据
import fs from 'fs'
import path from 'path'

const HTML_FILE = path.join(process.cwd(), 'vgen-page-rendered.html')
const OUTPUT_FILE = path.join(process.cwd(), 'vgen-services-data.json')

interface VGenService {
  id: string
  serviceId: string
  title: string
  description: string
  category: string
  price: {
    from: number
    currency: string
  }
  imageUrl?: string
  thumbnailUrl?: string
  isOpen: boolean
  deliveryTime?: string
  slots?: {
    total: number
    available: number
  }
  tags?: string[]
  status: string
}

interface VGenCategory {
  categoryID: string
  name: string
  services: string[]
}

async function parseHTML() {
  console.log('📄 解析 VGen HTML 文件')
  console.log('================================\n')

  // 检查文件是否存在
  if (!fs.existsSync(HTML_FILE)) {
    console.error('❌ HTML 文件不存在:', HTML_FILE)
    console.log('\n请先运行: pnpm vgen:services-manual')
    process.exit(1)
  }

  console.log('📖 读取 HTML 文件...')
  const htmlContent = fs.readFileSync(HTML_FILE, 'utf-8')

  console.log(`✅ HTML 文件大小: ${(htmlContent.length / 1024).toFixed(2)} KB`)

  // 提取 __NEXT_DATA__ JSON
  console.log('\n🔍 搜索 __NEXT_DATA__ JSON...')
  const nextDataMatch = htmlContent.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/)

  if (!nextDataMatch) {
    console.error('❌ 未找到 __NEXT_DATA__ JSON')
    process.exit(1)
  }

  const nextData = JSON.parse(nextDataMatch[1])
  const servicesData = nextData.props?.pageProps?.services || []

  console.log(`✅ 找到 ${servicesData.length} 个服务`)

  // 提取服务数据
  const services: Map<string, any> = new Map()

  for (const service of servicesData) {
    const serviceId = service.serviceID
    const serviceName = service.serviceName
    const status = service.status
    const basePrice = service.basePrice || 0
    const currency = service.currency || 'USD'
    const tags = service.tags || []
    const deliveryTime = service.guaranteedDeliveryDateOffset
      ? `${service.guaranteedDeliveryDateOffset.days || service.guaranteedDeliveryDateOffset.months * 30 || 0} days`
      : ''

    // 提取图片
    const imageUrl = service.galleryItems?.[0]?.url || ''

    if (serviceId && !services.has(serviceId)) {
      services.set(serviceId, {
        id: serviceId,
        serviceId: serviceId,
        title: serviceName,
        description: '', // 可以从 service.tagline 或 description 提取
        category: '', // 稍后关联
        price: {
          from: basePrice / 100, // basePrice 是以分为单位的，转换为元
          currency: currency
        },
        imageUrl: imageUrl,
        isOpen: status === 'OPEN',
        deliveryTime: deliveryTime,
        tags: tags,
        status: status
      })
    }
  }
  
  console.log(`✅ 找到 ${services.size} 个服务`)

  // 提取分类数据 (也从 __NEXT_DATA__ 提取)
  const categories: Map<string, VGenCategory> = new Map()
  const categoriesData = nextData.props?.pageProps?.serviceOrdering?.categories || []

  for (const category of categoriesData) {
    const categoryId = category.categoryID
    const categoryName = category.name
    const serviceIds = category.services || []

    if (categoryId && categoryName) {
      categories.set(categoryId, {
        categoryID: categoryId,
        name: categoryName,
        services: serviceIds
      })
    }
  }

  console.log(`✅ 找到 ${categories.size} 个分类`)

  // 关联服务和分类
  console.log('\n🔗 关联服务和分类...')
  for (const [categoryId, category] of categories) {
    for (const serviceId of category.services) {
      const service = services.get(serviceId)
      if (service) {
        service.category = category.name
      }
    }
  }

  // 转换为数组
  const servicesArray = Array.from(services.values())

  // 按分类分组显示
  console.log('\n📝 提取的服务:')
  
  const byCategory: { [key: string]: any[] } = {}
  servicesArray.forEach(service => {
    const cat = service.category || '未分类'
    if (!byCategory[cat]) {
      byCategory[cat] = []
    }
    byCategory[cat].push(service)
  })

  Object.entries(byCategory).forEach(([category, categoryServices]) => {
    console.log(`\n📁 ${category} (${categoryServices.length} 个服务)`)
    categoryServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title}`)
      console.log(`      状态: ${service.isOpen ? '✅ OPEN' : '❌ CLOSED'}`)
      console.log(`      价格: From ${service.price.currency} $${service.price.from.toFixed(2)}`)
      if (service.deliveryTime) {
        console.log(`      交付: ${service.deliveryTime}`)
      }
      if (service.tags && service.tags.length > 0) {
        console.log(`      标签: ${service.tags.join(', ')}`)
      }
    })
  })

  // 保存数据
  const outputData = {
    timestamp: new Date().toISOString(),
    source: 'HTML Parser',
    extractedCount: servicesArray.length,
    categories: Array.from(categories.values()),
    services: servicesArray
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2))
  console.log(`\n💾 数据已保存到: ${OUTPUT_FILE}`)

  // 统计
  console.log('\n📊 统计:')
  console.log(`   总服务数: ${servicesArray.length}`)
  console.log(`   总分类数: ${categories.size}`)
  console.log(`   OPEN: ${servicesArray.filter(s => s.isOpen).length}`)
  console.log(`   CLOSED: ${servicesArray.filter(s => !s.isOpen).length}`)
  console.log(`   有价格: ${servicesArray.filter(s => s.price.from > 0).length}`)
  console.log(`   有图片: ${servicesArray.filter(s => s.imageUrl).length}`)
  console.log(`   有标签: ${servicesArray.filter(s => s.tags && s.tags.length > 0).length}`)

  console.log('\n✅ 解析完成!')
}

parseHTML().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})

