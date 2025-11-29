/**
 * VGen Commissions 抓取脚本
 * 
 * 这是一个独立的脚本，可以在 Node.js 环境中运行
 * 用于测试 VGen API 抓取功能
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface VGenCookie {
  name: string
  value: string
  domain?: string
  path?: string
}

// Cookie 文件路径
const COOKIE_FILE = join(__dirname, '..', 'data', 'cookies', 'fur31mu.json')
const OUTPUT_FILE = join(__dirname, '..', 'vgen-output.json')

/**
 * 加载 Cookies
 */
function loadCookies(): VGenCookie[] {
  if (!existsSync(COOKIE_FILE)) {
    console.error('❌ Cookie 文件不存在:', COOKIE_FILE)
    console.log('\n请按照以下步骤获取 cookies:')
    console.log('1. 在浏览器中登录 https://vgen.co')
    console.log('2. 按 F12 打开开发者工具')
    console.log('3. 进入 Application > Cookies > https://vgen.co')
    console.log('4. 复制所有 cookies，保存为 JSON 格式到 cookies/fur31mu.json')
    process.exit(1)
  }

  const content = readFileSync(COOKIE_FILE, 'utf-8').trim()
  if (!content) {
    console.error('❌ Cookie 文件为空')
    process.exit(1)
  }

  try {
    const cookies = JSON.parse(content)
    console.log(`✅ 加载了 ${cookies.length} 个 cookies`)
    return cookies
  } catch (error) {
    console.error('❌ Cookie 文件格式错误:', error)
    process.exit(1)
  }
}

/**
 * Cookies 转字符串
 */
function cookiesToString(cookies: VGenCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

/**
 * 抓取 Creator 页面
 */
async function fetchCreatorPage(cookieString: string): Promise<void> {
  console.log('\n🔍 正在抓取 VGen Creator 页面...')

  const response = await fetch('https://vgen.co/creator', {
    headers: {
      Cookie: cookieString,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  })

  console.log(`📡 HTTP 状态: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    throw new Error(`HTTP 请求失败: ${response.status}`)
  }

  const html = await response.text()
  console.log(`📄 获取到 HTML，大小: ${(html.length / 1024).toFixed(2)} KB`)

  // 检查是否登录成功
  if (html.includes('Sign in') || html.includes('Log in')) {
    console.error('❌ Cookie 无效或已过期，请重新获取')
    process.exit(1)
  }

  // 保存 HTML 用于分析
  const htmlFile = join(__dirname, '..', 'vgen-page.html')
  writeFileSync(htmlFile, html)
  console.log(`💾 HTML 已保存到: ${htmlFile}`)

  // 尝试查找 Next.js 数据
  const scriptMatch = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
  )
  if (scriptMatch) {
    try {
      const jsonData = JSON.parse(scriptMatch[1])
      console.log('\n✅ 找到 Next.js 嵌入数据!')
      console.log('顶层键:', Object.keys(jsonData))

      // 尝试提取 pageProps
      const pageProps = jsonData?.props?.pageProps
      if (pageProps) {
        console.log('PageProps 键:', Object.keys(pageProps))

        // 保存完整数据
        const dataOutput = {
          timestamp: new Date().toISOString(),
          pageProps: pageProps,
          raw: jsonData
        }

        writeFileSync(OUTPUT_FILE, JSON.stringify(dataOutput, null, 2))
        console.log(`💾 数据已保存到: ${OUTPUT_FILE}`)

        // 显示摘要
        console.log('\n📊 数据摘要:')
        console.log(JSON.stringify(pageProps, null, 2).slice(0, 500) + '...')
      }
    } catch (error) {
      console.error('⚠️  解析 Next.js 数据失败:', error)
    }
  } else {
    console.log('⚠️  未找到 Next.js 嵌入数据')
  }

  // 尝试查找其他可能的数据
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
    /window\.__APP_STATE__\s*=\s*({.*?});/s,
    /"commissions":\s*\[(.*?)\]/s
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      console.log(`\n✅ 找到匹配模式: ${pattern}`)
      console.log('匹配内容:', match[0].slice(0, 200) + '...')
    }
  }
}

/**
 * 尝试 API 端点
 */
async function tryAPIEndpoints(cookieString: string): Promise<void> {
  console.log('\n🔍 尝试 API 端点...')

  const endpoints = [
    // REST API 端点
    { url: 'https://api.vgen.co/creator/commissions', method: 'GET' },
    { url: 'https://api.vgen.co/commissions', method: 'GET' },
    { url: 'https://api.vgen.co/orders', method: 'GET' },
    { url: 'https://vgen.co/api/creator/commissions', method: 'GET' },
    
    // GraphQL 端点
    { 
      url: 'https://api.vgen.co/graphql',
      method: 'POST',
      body: JSON.stringify({
        query: `query GetCreatorCommissions {
          creatorCommissions {
            id
            title
            status
            price
            clientName
            dueDate
            createdAt
          }
        }`
      })
    }
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 尝试: ${endpoint.method} ${endpoint.url}`)
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          Cookie: cookieString,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://vgen.co',
          'Referer': 'https://vgen.co/creator/commissions'
        },
        ...(endpoint.body && { body: endpoint.body })
      })

      console.log(`   状态: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        console.log(`   类型: ${contentType}`)

        if (contentType?.includes('application/json')) {
          const data = await response.json()
          console.log('   ✅ 成功获取 JSON 数据!')
          console.log('   数据键:', Object.keys(data))

          const apiFile = join(__dirname, '..', `vgen-api-${Date.now()}.json`)
          writeFileSync(apiFile, JSON.stringify(data, null, 2))
          console.log(`   💾 已保存到: ${apiFile}`)
          
          // 如果找到数据，显示摘要
          if (data) {
            const preview = JSON.stringify(data, null, 2).slice(0, 500)
            console.log(`\n   📊 数据预览:\n${preview}...`)
          }
        } else {
          const text = await response.text()
          console.log(`   响应长度: ${text.length}`)
        }
      }
    } catch (error) {
      console.log(`   ❌ 失败:`, error.message)
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 VGen Commissions 抓取脚本')
  console.log('================================\n')

  try {
    // 加载 cookies
    const cookies = loadCookies()
    const cookieString = cookiesToString(cookies)

    // 抓取页面
    await fetchCreatorPage(cookieString)

    // 尝试 API 端点
    await tryAPIEndpoints(cookieString)

    console.log('\n✅ 抓取完成!')
    console.log('\n💡 提示:')
    console.log('   - 检查生成的文件了解数据结构')
    console.log('   - 根据实际数据结构调整解析代码')
    console.log('   - 如果 cookies 过期，需要重新获取')
  } catch (error) {
    console.error('\n❌ 错误:', error)
    process.exit(1)
  }
}

// 运行
main()

