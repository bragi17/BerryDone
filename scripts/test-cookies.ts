// 测试 Cookies 格式
import fs from 'fs'
import path from 'path'

const COOKIES_FILE = path.join(process.cwd(), 'data', 'cookies', 'fur31mu.json')

console.log('🍪 检查 Cookies 文件')
console.log('================================\n')

if (!fs.existsSync(COOKIES_FILE)) {
  console.error('❌ Cookies 文件不存在:', COOKIES_FILE)
  process.exit(1)
}

console.log('✅ Cookies 文件存在')
console.log('📄 文件路径:', COOKIES_FILE)

const cookiesData = fs.readFileSync(COOKIES_FILE, 'utf-8')
const cookies = JSON.parse(cookiesData)

console.log(`\n📊 Cookies 统计:`)
console.log(`   总数: ${cookies.length}`)

console.log(`\n🔍 Cookies 详情:`)
cookies.forEach((cookie: any, index: number) => {
  console.log(`\n${index + 1}. ${cookie.name}`)
  console.log(`   domain: ${cookie.domain}`)
  console.log(`   path: ${cookie.path || '/'}`)
  console.log(`   sameSite: ${cookie.sameSite || '(未设置)'}`)
  console.log(`   httpOnly: ${cookie.httpOnly}`)
  console.log(`   secure: ${cookie.secure}`)
  console.log(`   expires: ${cookie.expires !== undefined ? new Date(cookie.expires * 1000).toISOString() : '(session)'}`)
})

console.log(`\n🔧 检查问题:`)
const issues: string[] = []

cookies.forEach((cookie: any, index: number) => {
  if (cookie.sameSite && !['Strict', 'Lax', 'None', 'strict', 'lax', 'none', 'no_restriction', 'unspecified'].includes(cookie.sameSite)) {
    issues.push(`Cookie ${index + 1} (${cookie.name}): sameSite 值无效 "${cookie.sameSite}"`)
  }
})

if (issues.length > 0) {
  console.log('⚠️ 发现问题:')
  issues.forEach(issue => console.log(`   - ${issue}`))
  console.log('\n✅ 抓取脚本会自动修复这些问题')
} else {
  console.log('✅ Cookies 格式正确')
}

console.log('\n✨ 检查完成!')

