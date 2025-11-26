import { app } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import type { VGenCookie, VGenCommission, VGenFetchResult } from './types/vgen'

const COOKIES_DIR = join(app.getPath('userData'), '..', '..', 'cookies')
const COOKIE_FILE = join(COOKIES_DIR, 'fur31mu.json')

/**
 * 读取保存的 VGen Cookies
 */
export function loadVGenCookies(): VGenCookie[] | null {
  try {
    if (!existsSync(COOKIE_FILE)) {
      console.log('Cookie 文件不存在:', COOKIE_FILE)
      return null
    }

    const content = readFileSync(COOKIE_FILE, 'utf-8').trim()
    if (!content) {
      console.log('Cookie 文件为空')
      return null
    }

    const cookies = JSON.parse(content)
    console.log(`加载了 ${cookies.length} 个 cookies`)
    return cookies
  } catch (error) {
    console.error('读取 Cookie 文件失败:', error)
    return null
  }
}

/**
 * 将 Cookies 数组转换为 Cookie 字符串
 */
function cookiesToString(cookies: VGenCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

/**
 * 抓取 VGen Creator 页面的 HTML
 */
async function fetchCreatorPage(cookieString: string): Promise<string> {
  const response = await fetch('https://vgen.co/creator', {
    headers: {
      Cookie: cookieString,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
}

/**
 * 尝试从 API 获取 commissions 数据
 */
async function fetchFromAPI(cookieString: string): Promise<any> {
  // 尝试常见的 API 端点
  const endpoints = [
    'https://vgen.co/api/creator/commissions',
    'https://vgen.co/api/commissions',
    'https://vgen.co/api/v1/creator/commissions'
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`尝试 API 端点: ${endpoint}`)
      const response = await fetch(endpoint, {
        headers: {
          Cookie: cookieString,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`成功从 ${endpoint} 获取数据`)
        return data
      }
    } catch (error) {
      console.log(`${endpoint} 失败:`, error)
      continue
    }
  }

  return null
}

/**
 * 从 HTML 解析 commissions 数据
 * 注意: 这是一个简化版本，实际需要根据页面结构调整
 */
function parseCommissionsFromHTML(html: string): VGenCommission[] {
  const commissions: VGenCommission[] = []

  // 查找是否有嵌入的 JSON 数据
  const scriptMatch = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
  )
  if (scriptMatch) {
    try {
      const jsonData = JSON.parse(scriptMatch[1])
      console.log('找到 Next.js 数据:', Object.keys(jsonData))

      // 尝试提取 commissions 数据
      const pageProps = jsonData?.props?.pageProps
      if (pageProps) {
        console.log('PageProps keys:', Object.keys(pageProps))
        // 根据实际数据结构提取
      }
    } catch (error) {
      console.error('解析 Next.js 数据失败:', error)
    }
  }

  return commissions
}

/**
 * 按状态分类 commissions
 */
function categorizeCommissions(commissions: any[]): VGenFetchResult['data'] {
  const result = {
    new: [] as VGenCommission[],
    ready: [] as VGenCommission[],
    wip: [] as VGenCommission[],
    completed: [] as VGenCommission[],
    waitlist: [] as VGenCommission[],
    pending: [] as VGenCommission[]
  }

  for (const comm of commissions) {
    // 根据实际数据结构映射
    const status = comm.status?.toLowerCase() || 'pending'
    const commission: VGenCommission = {
      id: comm.id || comm._id || String(Math.random()),
      title: comm.title || comm.name || 'Untitled',
      status: status as VGenCommission['status'],
      price: comm.price || comm.amount,
      description: comm.description,
      clientName: comm.client?.name || comm.clientName,
      dueDate: comm.dueDate || comm.deadline,
      createdAt: comm.createdAt || comm.created,
      updatedAt: comm.updatedAt || comm.updated
    }

    if (result[status]) {
      result[status].push(commission)
    } else {
      result.pending.push(commission)
    }
  }

  return result
}

/**
 * 主函数: 抓取 VGen Commissions
 */
export async function fetchVGenCommissions(): Promise<VGenFetchResult> {
  const timestamp = new Date().toISOString()

  try {
    // 1. 加载 cookies
    const cookies = loadVGenCookies()
    if (!cookies || cookies.length === 0) {
      return {
        success: false,
        error: '未找到 Cookie，请先在 cookies/fur31mu.json 中添加你的 VGen cookies',
        timestamp
      }
    }

    const cookieString = cookiesToString(cookies)

    // 2. 尝试从 API 获取数据
    console.log('尝试从 API 获取数据...')
    const apiData = await fetchFromAPI(cookieString)

    if (apiData && apiData.commissions) {
      console.log(`从 API 获取到 ${apiData.commissions.length} 个 commissions`)
      const data = categorizeCommissions(apiData.commissions)
      return { success: true, data, timestamp }
    }

    // 3. 如果 API 失败，尝试解析 HTML
    console.log('API 未返回数据，尝试解析 HTML...')
    const html = await fetchCreatorPage(cookieString)

    // 检查是否成功登录
    if (html.includes('Sign in') || html.includes('Log in')) {
      return {
        success: false,
        error: 'Cookies 已过期或无效，请重新获取',
        timestamp
      }
    }

    console.log(`获取到 HTML，长度: ${html.length}`)

    // 保存 HTML 用于调试（可选）
    const debugFile = join(app.getPath('userData'), 'vgen-page.html')
    writeFileSync(debugFile, html)
    console.log('HTML 已保存到:', debugFile)

    const commissions = parseCommissionsFromHTML(html)
    const data = categorizeCommissions(commissions)

    return { success: true, data, timestamp }
  } catch (error) {
    console.error('抓取 VGen 数据失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }
  }
}

/**
 * 保存抓取结果到文件
 */
export function saveVGenData(result: VGenFetchResult): void {
  const dataFile = join(app.getPath('userData'), 'vgen-data.json')
  writeFileSync(dataFile, JSON.stringify(result, null, 2))
  console.log('数据已保存到:', dataFile)
}

