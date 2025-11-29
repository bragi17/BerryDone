// 预编译所有 TypeScript 脚本
import { build } from 'esbuild'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptsDir = __dirname

async function buildScripts() {
  console.log('🔨 编译脚本文件...')

  // 读取所有 .ts 文件
  const files = await readdir(scriptsDir)
  const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))

  console.log(`📝 找到 ${tsFiles.length} 个脚本文件`)

  for (const file of tsFiles) {
    const input = join(scriptsDir, file)
    const output = join(scriptsDir, file.replace('.ts', '.js'))

    try {
      await build({
        entryPoints: [input],
        outfile: output,
        bundle: true,  // 打包所有依赖（解决 ESM 兼容性问题）
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        sourcemap: false,
        minify: false,
        external: ['playwright', 'playwright-core'],  // playwright 需要外部引用（有二进制文件）
        packages: 'bundle'  // 打包所有 node_modules 依赖
      })
      console.log(`  ✓ ${file} -> ${file.replace('.ts', '.js')}`)
    } catch (error) {
      console.error(`  ✗ ${file} 编译失败:`, error.message)
    }
  }

  console.log('✅ 脚本编译完成!')
}

buildScripts().catch(console.error)
