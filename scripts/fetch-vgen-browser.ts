/**
 * VGen Commissions 抓取脚本 (高速版)
 *
 * 优化策略：
 * - 只等待关键的 /commission/user/ API 请求
 * - 获取数据后立即完成，不等待其他请求
 * - 无头模式 + 精简日志
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { chromium } from 'playwright'

interface VGenCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  expirationDate?: number
  httpOnly?: boolean
  secure?: boolean
}

// Cookie 文件路径
const COOKIE_FILE = join(__dirname, '..', 'cookies', 'fur31mu.json')
const OUTPUT_FILE = join(__dirname, '..', 'vgen-commissions-data.json')

/**
 * 加载 Cookies
 */
function loadCookies(): VGenCookie[] {
  if (!existsSync(COOKIE_FILE)) {
    console.log('[ERROR] Cookie file not found:', COOKIE_FILE)
    process.exit(1)
  }

  const content = readFileSync(COOKIE_FILE, 'utf-8').trim()
  if (!content) {
    console.log('[ERROR] Cookie file is empty')
    process.exit(1)
  }

  const cookies = JSON.parse(content)
  console.log(`[OK] Loaded ${cookies.length} cookies`)
  return cookies
}

/**
 * 转换 cookie 格式为 Playwright 格式
 */
function convertCookies(cookies: VGenCookie[]): any[] {
  return cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain || '.vgen.co',
    path: c.path || '/',
    expires: c.expirationDate || c.expires || -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: 'Lax' as const
  }))
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now()
  console.log('[START] VGen Commissions Fetcher (Fast Mode)')
  console.log('============================================')

  // 加载 cookies
  const cookies = loadCookies()
  const playwrightCookies = convertCookies(cookies)

  console.log('[INFO] Launching browser (headless)...')
  const browser = await chromium.launch({
    headless: true
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  })

  // 添加 cookies
  await context.addCookies(playwrightCookies)

  const page = await context.newPage()

  // 用于存储关键 API 数据
  let commissionApiData: any = null
  const apiRequests: any[] = []

  // 创建 Promise 来等待关键 API
  const commissionDataPromise = new Promise<any>((resolve) => {
    page.on('response', async (response) => {
      const url = response.url()

      // 只关注关键的 commission API
      if (url.includes('/commission/user/')) {
        try {
          const contentType = response.headers()['content-type'] || ''
          if (contentType.includes('application/json')) {
            const data = await response.json()
            console.log(`[API] Commission data received (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`)

            apiRequests.push({
              url,
              method: response.request().method(),
              status: response.status(),
              data
            })

            commissionApiData = data
            resolve(data) // 立即解析，不再等待
          }
        } catch (error) {
          // 忽略解析错误
        }
      }
    })

    // 超时保护：最多等待 15 秒
    setTimeout(() => resolve(null), 15000)
  })

  console.log('[INFO] Navigating to commissions page...')

  // 并行执行：页面导航 + 等待 API
  await Promise.all([
    page.goto('https://vgen.co/creator/commissions', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }),
    commissionDataPromise
  ])

  // 如果还没拿到数据，再等一小段时间
  if (!commissionApiData) {
    console.log('[INFO] Waiting for API response...')
    await page.waitForTimeout(2000)
  }

  // 提取页面基本信息（快速）
  const pageInfo = await page.evaluate(() => ({
    pageTitle: document.title,
    url: window.location.href,
    foundCards: document.querySelectorAll('[class*="commission"]').length
  }))

  console.log(`[INFO] Page: ${pageInfo.pageTitle}, Cards: ${pageInfo.foundCards}`)

  // 保存数据
  const output = {
    timestamp: new Date().toISOString(),
    pageData: {
      ...pageInfo,
      commissions: { new: [], ready: [], wip: [], completed: [], waitlist: [], pending: [] }
    },
    apiRequests: apiRequests,
    summary: {
      totalApiRequests: apiRequests.length,
      foundCards: pageInfo.foundCards
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  // 立即关闭浏览器
  await browser.close()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`[OK] Data saved to: ${OUTPUT_FILE}`)
  console.log(`[OK] API requests captured: ${apiRequests.length}`)
  console.log(`[DONE] Completed in ${elapsed}s`)
}

// 运行
main().catch(error => {
  console.log('[ERROR]', error.message || error)
  process.exit(1)
})
