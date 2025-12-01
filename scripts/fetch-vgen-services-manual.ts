/**
 * VGen 服务列表抓取脚本 (高速版)
 *
 * 优化策略：
 * - 更快的滚动策略
 * - 精简日志输出
 * - 移除不必要的等待
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const COOKIES_FILE = path.join(process.cwd(), 'data', 'cookies', 'cookies.json')
const OUTPUT_FILE = path.join(process.cwd(), 'vgen-services-data.json')

interface VGenService {
  id: string
  title: string
  description: string
  price: string
  category: string
  imageUrl?: string
  isOpen: boolean
  href: string
}

async function loadCookies() {
  if (fs.existsSync(COOKIES_FILE)) {
    const cookiesData = fs.readFileSync(COOKIES_FILE, 'utf-8')
    const cookies = JSON.parse(cookiesData)

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

      if (cookie.sameSite) {
        const sameSite = cookie.sameSite.toLowerCase()
        if (sameSite === 'strict' || sameSite === 'lax' || sameSite === 'none') {
          normalized.sameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1)
        } else if (sameSite === 'no_restriction') {
          normalized.sameSite = 'None'
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
  const startTime = Date.now()
  console.log('[START] VGen Services Fetcher (Fast Mode)')
  console.log('=========================================')

  const cookies = await loadCookies()
  if (!cookies || cookies.length === 0) {
    console.log('[WARN] No cookies found, accessing as guest')
  } else {
    console.log(`[OK] Loaded ${cookies.length} cookies`)
  }

  console.log('[INFO] Launching browser (headless)...')
  const browser = await chromium.launch({
    headless: true
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })

  if (cookies && cookies.length > 0) {
    await context.addCookies(cookies)
  }

  const page = await context.newPage()

  console.log('[INFO] Navigating to creator page...')
  await page.goto('https://vgen.co/Fur31mu', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })

  // 等待初始内容加载
  await page.waitForTimeout(2000)

  // 快速自动滚动
  console.log('[INFO] Auto-scrolling to load content...')
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0
      const distance = 400
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 40)
    })
  })

  // 滚回顶部，等待内容稳定
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)

  console.log('[INFO] Extracting service data...')

  // 保存完整的 HTML（包含嵌入的 JSON 数据）
  const htmlContent = await page.content()
  const htmlFile = path.join(process.cwd(), 'vgen-page-rendered.html')
  fs.writeFileSync(htmlFile, htmlContent)
  console.log(`[OK] HTML saved: ${(htmlContent.length / 1024).toFixed(2)} KB`)

  // 快速提取服务数量（供统计）
  const serviceCount = (htmlContent.match(/"serviceName":/g) || []).length

  console.log(`[OK] Found ${serviceCount} services in HTML`)

  // 保存数据（空的，实际数据将由 parse 脚本提取）
  const outputData = {
    timestamp: new Date().toISOString(),
    extractedCount: 0,
    services: []
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2))

  await browser.close()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`[DONE] Completed in ${elapsed}s (HTML saved for parsing)`)
}

run().catch(error => {
  console.log('[ERROR]', error.message || error)
  process.exit(1)
})
