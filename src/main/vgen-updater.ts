// VGen 数据更新器 - 支持开发和打包环境
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

interface UpdateProgress {
  step: string
  progress: number
  message: string
  log?: string  // 终端输出日志，用于显示详细信息
}

interface UpdateResult {
  success: boolean
  count: number
  error?: string
}

export class VGenUpdater {
  private onProgress?: (progress: UpdateProgress) => void

  constructor(onProgress?: (progress: UpdateProgress) => void) {
    this.onProgress = onProgress
  }

  private progress(step: string, progress: number, message: string, log?: string) {
    if (this.onProgress) {
      this.onProgress({ step, progress, message, log })
    }
    console.log(`[VGenUpdater] ${step} (${progress}%): ${message}`)
    if (log) {
      console.log(`[VGenUpdater] log: ${log}`)
    }
  }

  // 获取脚本路径（环境自适应）
  private getScriptPath(scriptName: string): string {
    // 将 .ts 后缀改为 .js（使用预编译的脚本）
    const jsScriptName = scriptName.replace('.ts', '.js')

    if (app.isPackaged) {
      // 打包环境：scripts在resources/scripts
      return path.join(process.resourcesPath, 'scripts', jsScriptName)
    } else {
      // 开发环境：scripts在项目根目录
      return path.join(process.cwd(), 'scripts', jsScriptName)
    }
  }

  // 检查并安装Playwright浏览器
  private async ensurePlaywrightBrowser(): Promise<boolean> {
    try {
      this.progress('browser-check', 5, '检查Playwright浏览器...')

      // 获取playwright路径
      const playwrightPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'playwright')
        : path.join(process.cwd(), 'node_modules', 'playwright')

      console.log('[Browser Check] app.isPackaged:', app.isPackaged)
      console.log('[Browser Check] playwrightPath:', playwrightPath)
      console.log('[Browser Check] playwrightPath exists:', fs.existsSync(playwrightPath))

      // 检查playwright模块是否存在
      if (!fs.existsSync(playwrightPath)) {
        const error = `Playwright模块不存在: ${playwrightPath}`
        console.error('[Browser Check]', error)
        this.progress('browser-error', 0, error)
        return false
      }

      // 检查浏览器是否已安装
      const browsersPath = app.isPackaged
        ? path.join(playwrightPath, '.local-browsers')
        : path.join(require('os').homedir(), '.cache', 'ms-playwright')

      console.log('[Browser Check] browsersPath:', browsersPath)
      console.log('[Browser Check] browsersPath exists:', fs.existsSync(browsersPath))

      // 如果浏览器目录不存在，需要安装
      if (!fs.existsSync(browsersPath)) {
        this.progress('browser-install', 10, '首次运行，正在安装Playwright浏览器...')
        console.log('[Browser Install] 开始安装浏览器到:', browsersPath)

        return new Promise((resolve) => {
          const cliPath = path.join(playwrightPath, 'cli.js')
          console.log('[Browser Install] CLI path:', cliPath)
          console.log('[Browser Install] CLI exists:', fs.existsSync(cliPath))

          if (!fs.existsSync(cliPath)) {
            const error = `Playwright CLI不存在: ${cliPath}`
            console.error('[Browser Install]', error)
            this.progress('browser-error', 0, error)
            resolve(false)
            return
          }

          // 设置环境变量
          const env = { ...process.env }
          if (app.isPackaged) {
            env.PLAYWRIGHT_BROWSERS_PATH = path.join(playwrightPath, '.local-browsers')
            console.log('[Browser Install] PLAYWRIGHT_BROWSERS_PATH:', env.PLAYWRIGHT_BROWSERS_PATH)
          }

          // 禁用 GPU 缓存和沙箱，避免权限问题
          env.ELECTRON_DISABLE_GPU_CACHE = '1'
          env.PLAYWRIGHT_CHROMIUM_DISABLE_GPU = '1'

          // 使用 Electron 内置的 Node.js（设置 ELECTRON_RUN_AS_NODE 避免打开新窗口）
          env.ELECTRON_RUN_AS_NODE = '1'
          const nodePath = process.execPath
          console.log('[Browser Install] Using Node.js from:', nodePath)

          const install = spawn(nodePath, [cliPath, 'install', 'chromium', '--with-deps'], {
            cwd: playwrightPath,
            shell: false,  // 不使用 shell，直接执行
            env,
            stdio: ['pipe', 'pipe', 'pipe']
          })

          let output = ''
          let errorOutput = ''

          install.stdout?.on('data', (data) => {
            const text = data.toString().trim()
            output += text
            console.log('[Playwright Install stdout]', text)

            // 解析下载进度，并传递原始输出作为 log
            if (text.includes('Downloading')) {
              this.progress('browser-download', 30, '下载浏览器中...', text)
            } else if (text.includes('Installing')) {
              this.progress('browser-extract', 60, '安装浏览器中...', text)
            } else if (text) {
              // 传递其他输出信息
              this.progress('browser-install', 40, '正在安装浏览器...', text)
            }
          })

          install.stderr?.on('data', (data) => {
            const text = data.toString()
            errorOutput += text
            console.error('[Playwright Install stderr]', text)
          })

          install.on('close', (code) => {
            console.log('[Playwright Install] 进程退出，代码:', code)
            console.log('[Playwright Install] stdout:', output)
            console.log('[Playwright Install] stderr:', errorOutput)

            if (code === 0) {
              this.progress('browser-ready', 90, '浏览器安装完成!')
              resolve(true)
            } else {
              const error = `浏览器安装失败 (退出代码: ${code})\n${errorOutput || output}`
              console.error('[Playwright Install]', error)
              this.progress('browser-error', 0, error)
              resolve(false)
            }
          })

          install.on('error', (error) => {
            console.error('[Playwright Install] spawn error:', error)
            this.progress('browser-error', 0, `浏览器安装失败: ${error.message}`)
            resolve(false)
          })
        })
      } else {
        console.log('[Browser Check] 浏览器已存在')
        this.progress('browser-ready', 5, '浏览器已就绪')
        return true
      }
    } catch (error: any) {
      console.error('[ensurePlaywrightBrowser] Exception:', error)
      this.progress('browser-error', 0, `检查浏览器失败: ${error.message}`)
      return false
    }
  }

  // 运行脚本（环境自适应）
  private async runScript(scriptName: string): Promise<UpdateResult> {
    return new Promise((resolve) => {
      this.progress('prepare', 10, '准备运行脚本...')

      const scriptPath = this.getScriptPath(scriptName)

      // 检查脚本是否存在
      if (!fs.existsSync(scriptPath)) {
        this.progress('error', 0, `脚本不存在: ${scriptPath}`)
        return resolve({
          success: false,
          count: 0,
          error: `脚本文件不存在: ${scriptName}`
        })
      }

      // 设置环境变量
      const env = { ...process.env }

      // 配置Playwright浏览器路径和模块搜索路径
      if (app.isPackaged) {
        const playwrightPath = path.join(
          process.resourcesPath,
          'app.asar.unpacked',
          'node_modules',
          'playwright'
        )
        const nodeModulesPath = path.join(
          process.resourcesPath,
          'app.asar.unpacked',
          'node_modules'
        )

        env.PLAYWRIGHT_BROWSERS_PATH = path.join(playwrightPath, '.local-browsers')
        // 设置 NODE_PATH 让脚本能找到 playwright 模块
        env.NODE_PATH = nodeModulesPath

        console.log('[VGenUpdater] NODE_PATH:', env.NODE_PATH)
        console.log('[VGenUpdater] PLAYWRIGHT_BROWSERS_PATH:', env.PLAYWRIGHT_BROWSERS_PATH)
      }

      // 禁用 GPU 缓存，避免权限问题
      env.ELECTRON_DISABLE_GPU_CACHE = '1'
      env.PLAYWRIGHT_CHROMIUM_DISABLE_GPU = '1'

      // 设置 ELECTRON_RUN_AS_NODE=1 让 Electron 以 Node.js 模式运行（不打开新窗口）
      env.ELECTRON_RUN_AS_NODE = '1'

      // 根据环境选择命令
      let command: string
      let args: string[]

      if (app.isPackaged) {
        // 打包环境：使用 Electron 内置的 Node.js（不依赖系统安装的 Node.js）
        command = process.execPath
        args = [scriptPath]
        console.log('[VGenUpdater] Using Electron Node.js to run:', scriptPath)
        console.log('[VGenUpdater] Node path:', command)
      } else {
        // 开发环境：使用pnpm tsx 执行 .ts 文件
        const tsScriptPath = scriptPath.replace('.js', '.ts')
        command = 'pnpm'
        args = ['tsx', tsScriptPath]
        console.log('[VGenUpdater] Using dev tsx:', tsScriptPath)
      }

      // 执行子进程
      const child = spawn(command, args, {
        cwd: app.isPackaged ? process.resourcesPath : process.cwd(),
        shell: app.isPackaged ? false : true,  // 开发环境使用 shell 以找到 pnpm
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      })

      let output = ''
      let errorOutput = ''

      child.stdout?.setEncoding('utf8')
      child.stderr?.setEncoding('utf8')

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log('[Script Output]', text)

        // 获取最后一行非空输出作为 log
        const lines = text.trim().split('\n').filter((line) => line.trim())
        const lastLine = lines[lines.length - 1] || ''

        // 解析进度信息，并传递原始输出作为 log
        if (text.includes('加载')) {
          this.progress('loading', 30, text.trim(), lastLine)
        } else if (text.includes('访问')) {
          this.progress('navigate', 40, text.trim(), lastLine)
        } else if (text.includes('提取')) {
          this.progress('extract', 60, text.trim(), lastLine)
        } else if (text.includes('保存') || text.includes('导入')) {
          this.progress('save', 80, text.trim(), lastLine)
        } else if (text.includes('完成')) {
          this.progress('complete', 100, text.trim(), lastLine)
        } else if (lastLine) {
          // 对于其他输出，也传递 log
          this.progress('running', 50, '正在运行...', lastLine)
        }
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        console.error('[Script Error]', text)
      })

      child.on('close', (code) => {
        if (code === 0) {
          // 从输出中提取数量
          const countMatch = output.match(/(\d+)\s*个/)
          const count = countMatch ? parseInt(countMatch[1]) : 0

          this.progress('complete', 100, '更新完成!')
          resolve({ success: true, count })
        } else {
          this.progress('error', 0, '更新失败')
          resolve({
            success: false,
            count: 0,
            error: errorOutput || '脚本执行失败'
          })
        }
      })

      child.on('error', (error) => {
        this.progress('error', 0, `运行失败: ${error.message}`)
        console.error('[Script Spawn Error]', error)
        resolve({
          success: false,
          count: 0,
          error: error.message
        })
      })
    })
  }

  // 更新 Commissions 数据（已接订单）
  async updateCommissions(): Promise<UpdateResult> {
    this.progress('start', 0, '开始更新 Commissions...')

    try {
      // 首先确保浏览器已安装
      const browserReady = await this.ensurePlaywrightBrowser()
      if (!browserReady) {
        return {
          success: false,
          count: 0,
          error: 'Playwright浏览器未安装，请手动运行: playwright install chromium'
        }
      }

      // 运行抓取脚本
      this.progress('fetch', 20, '抓取 Commissions 数据...')
      const fetchResult = await this.runScript('fetch-vgen-browser.ts')

      if (!fetchResult.success) {
        return fetchResult
      }

      // 运行导入脚本
      this.progress('import', 60, '导入数据库...')
      const importResult = await this.runScript('import-vgen-commissions.ts')

      return importResult
    } catch (error: any) {
      this.progress('error', 0, `更新失败: ${error.message}`)
      console.error('[updateCommissions Error]', error)
      return { success: false, count: 0, error: error.message }
    }
  }

  // 更新 Services 数据（服务列表）
  async updateServices(): Promise<UpdateResult> {
    this.progress('start', 0, '开始更新 Services...')

    try {
      // 首先确保浏览器已安装
      const browserReady = await this.ensurePlaywrightBrowser()
      if (!browserReady) {
        return {
          success: false,
          count: 0,
          error: 'Playwright浏览器未安装，请手动运行: playwright install chromium'
        }
      }

      // 先运行抓取脚本
      this.progress('fetch', 10, '抓取服务数据...')
      const fetchResult = await this.runScript('fetch-vgen-services-manual.ts')

      if (!fetchResult.success) {
        return fetchResult
      }

      // 然后运行解析脚本
      this.progress('parse', 50, '解析 HTML 数据...')
      const parseResult = await this.runScript('parse-vgen-html.ts')

      if (!parseResult.success) {
        return parseResult
      }

      // 最后导入数据库
      this.progress('import', 80, '导入数据库...')
      const importResult = await this.runScript('import-vgen-services.ts')

      return importResult
    } catch (error: any) {
      this.progress('error', 0, `更新失败: ${error.message}`)
      console.error('[updateServices Error]', error)
      return { success: false, count: 0, error: error.message }
    }
  }
}
