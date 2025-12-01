// 抓取 VGen 创作者页面的服务列表
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const COOKIES_FILE = path.join(process.cwd(), 'data', 'cookies', 'cookies.json')
const OUTPUT_FILE = path.join(process.cwd(), 'vgen-services-data.json')

interface VGenService {
  id: string
  title: string
  description: string
  price: {
    amount: number
    currency: string
  }
  category: string
  imageUrl?: string
  isOpen: boolean
  deliveryTime?: string
  slots?: {
    total: number
    available: number
  }
}

async function loadCookies() {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookiesData = fs.readFileSync(COOKIES_FILE, 'utf-8')
    const cookies = JSON.parse(cookiesData)
    
    // 规范化 cookies 格式，修复 sameSite 等字段
    return cookies.map((cookie: any) => {
      const normalized: any = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false
      }
      
      // 规范化 sameSite 字段
      if (cookie.sameSite) {
        const sameSite = cookie.sameSite.toLowerCase()
        if (sameSite === 'strict' || sameSite === 'lax' || sameSite === 'none') {
          normalized.sameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1)
        } else if (sameSite === 'no_restriction') {
          normalized.sameSite = 'None'
        } else if (sameSite === 'unspecified' || sameSite === '') {
          normalized.sameSite = 'Lax'
        } else {
          normalized.sameSite = 'Lax'
        }
      } else {
        normalized.sameSite = 'Lax'
      }
      
      return normalized
    })
  }
  return []
}

async function run() {
  console.log('🎨 VGen 服务列表抓取脚本')
  console.log('================================')

  const cookies = await loadCookies()
  if (!cookies || cookies.length === 0) {
    console.warn('⚠️ 未找到 cookies，将以访客身份访问')
  } else {
    console.log(`✅ 加载了 ${cookies.length} 个 cookies`)
  }

  console.log('🌐 启动浏览器...')
  const browser = await chromium.launch({ 
    headless: false // 保持可见以便调试
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })
  
  if (cookies && cookies.length > 0) {
    await context.addCookies(cookies)
    console.log('🍪 Cookies 已添加')
  }

  const page = await context.newPage()
  const apiRequests: any[] = []

  // 拦截 API 请求
  page.on('response', async (response) => {
    const url = response.url()
    
    if (url.includes('/api/') && response.request().method() === 'GET') {
      try {
        const data = await response.json()
        console.log(`📡 拦截到 API 请求: ${url}`)
        apiRequests.push({
          url,
          status: response.status(),
          data
        })
      } catch (e) {
        // 不是 JSON 响应，跳过
      }
    }
  })

  console.log('🔍 访问创作者页面...')
  await page.goto('https://vgen.co/Fur31mu', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  })

  console.log('⏳ 等待页面完全渲染...')
  await page.waitForTimeout(10000) // 等待 10 秒确保页面完全加载

  console.log('📦 从渲染后的页面提取服务信息...')
  
  // 提取所有分类和服务
  const extractedData = await page.evaluate(() => {
    const results: any[] = []
    
    // 查找所有可能的分类标题
    const categorySelectors = [
      'h2', 'h3',
      '[class*="category"]',
      '[class*="section"]'
    ]
    
    // 获取页面所有文本，查找分类关键词
    const categories = [
      'autumn ych selling',
      'Recommend Services!❤',
      '☆ Christmas Speciall YCH !!',
      '🎃Halloween YCH Teaser🕸️',
      'SPEACIAL SELLINGS ☆',
      'YCH PACKS'
    ]
    
    // 遍历整个页面，查找分类和服务
    const allElements = document.querySelectorAll('*')
    let currentCategory = ''
    
    allElements.forEach((element) => {
      const text = element.textContent?.trim() || ''
      
      // 检查是否是分类标题
      for (const cat of categories) {
        if (text === cat || text.includes(cat)) {
          currentCategory = cat
          console.log('Found category:', currentCategory)
          return
        }
      }
      
      // 查找服务链接和卡片
      if (element.tagName === 'A') {
        const href = (element as HTMLAnchorElement).href
        if (href && href.includes('/Fur31mu/') && !href.endsWith('/Fur31mu')) {
          // 这可能是一个服务链接
          const serviceCard = element
          
          // 提取标题
          let title = ''
          const titleEl = serviceCard.querySelector('h3, h4, h5, [class*="title"], [class*="Title"]')
          if (titleEl) {
            title = titleEl.textContent?.trim() || ''
          } else {
            // 尝试从卡片内所有文本中找标题
            const allText = serviceCard.textContent?.trim().split('\n').filter(t => t.trim())
            if (allText && allText.length > 0) {
              title = allText[0].trim()
            }
          }
          
          // 提取价格
          let price = ''
          const priceEl = serviceCard.querySelector('[class*="price"], [class*="Price"]')
          if (priceEl) {
            price = priceEl.textContent?.trim() || ''
          } else {
            // 尝试从文本中查找价格模式
            const cardText = serviceCard.textContent || ''
            const priceMatch = cardText.match(/(?:From\s+)?(?:CN¥|USD\s*\$|\$)[\d,]+\.?\d*/i)
            if (priceMatch) {
              price = priceMatch[0]
            }
          }
          
          // 提取图片
          let imageUrl = ''
          const img = serviceCard.querySelector('img')
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || ''
          }
          
          // 检查是否 OPEN 或 CLOSED
          let isOpen = true
          const cardText = serviceCard.textContent?.toLowerCase() || ''
          if (cardText.includes('closed')) {
            isOpen = false
          }
          // 查找 OPEN 标签
          if (cardText.includes('open')) {
            isOpen = true
          }
          
          // 提取服务ID
          const serviceId = href.split('/').filter(Boolean).pop() || ''
          
          if (title || imageUrl) {
            results.push({
              id: serviceId,
              title: title || `Service ${serviceId}`,
              price: price,
              imageUrl: imageUrl,
              category: currentCategory,
              isOpen: isOpen,
              href: href
            })
            console.log('Found service:', title, isOpen ? '[OPEN]' : '[CLOSED]')
          }
        }
      }
    })
    
    // 去重
    const uniqueResults = results.filter((service, index, self) =>
      index === self.findIndex((s) => s.id === service.id)
    )
    
    return uniqueResults
  })

  console.log(`✅ 从页面提取了 ${extractedData.length} 个服务`)
  
  if (extractedData.length > 0) {
    console.log('\n📝 提取的服务:')
    extractedData.forEach((service: any, index: number) => {
      console.log(`${index + 1}. [${service.category || '未分类'}] ${service.title}`)
      console.log(`   状态: ${service.isOpen ? '✅ OPEN' : '❌ CLOSED'}`)
      console.log(`   价格: ${service.price || '未知'}`)
      console.log(`   链接: ${service.href}`)
    })
  }

  // 保存原始数据
  const outputData = {
    timestamp: new Date().toISOString(),
    apiRequests,
    extractedCount: extractedData.length,
    services: extractedData
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2))
  console.log(`\n💾 数据已保存到: ${OUTPUT_FILE}`)

  // 保存页面截图
  const screenshotPath = path.join(process.cwd(), 'vgen-page-screenshot.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 页面截图已保存: ${screenshotPath}`)

  // 保存渲染后的 HTML
  const htmlPath = path.join(process.cwd(), 'vgen-page-rendered.html')
  const html = await page.content()
  fs.writeFileSync(htmlPath, html)
  console.log(`📄 渲染后的 HTML 已保存: ${htmlPath}`)

  console.log('\n✅ 抓取完成!')
  console.log('\n📊 统计:')
  console.log(`   API 请求数: ${apiRequests.length}`)
  console.log(`   提取的服务数: ${extractedData.length}`)
  console.log(`   OPEN 状态: ${extractedData.filter((s: any) => s.isOpen).length}`)
  console.log(`   CLOSED 状态: ${extractedData.filter((s: any) => !s.isOpen).length}`)
  
  // 按分类统计
  const categoryCounts: { [key: string]: number } = {}
  extractedData.forEach((s: any) => {
    const cat = s.category || '未分类'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })
  
  if (Object.keys(categoryCounts).length > 0) {
    console.log('\n📁 按分类统计:')
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`)
    })
  }
  
  if (apiRequests.length > 0) {
    console.log('\n📡 拦截到的 API 请求:')
    apiRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.url}`)
    })
  }

  await browser.close()
}

run().catch(error => {
  console.error('\n❌ 错误:', error)
  process.exit(1)
})
