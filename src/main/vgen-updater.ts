// VGen 数据更新器 - 通过子进程调用脚本
import { spawn } from 'child_process'
import * as path from 'path'
import { app } from 'electron'

interface UpdateProgress {
  step: string
  progress: number
  message: string
}

export class VGenUpdater {
  private onProgress?: (progress: UpdateProgress) => void

  constructor(onProgress?: (progress: UpdateProgress) => void) {
    this.onProgress = onProgress
  }

  private progress(step: string, progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ step, progress, message })
    }
  }

  // 通过子进程运行脚本
  private async runScript(scriptName: string): Promise<{ success: boolean; count: number; error?: string }> {
    return new Promise((resolve) => {
      this.progress('prepare', 10, '准备运行脚本...')

      const scriptPath = path.join(process.cwd(), 'scripts', scriptName)

      // 设置环境变量以支持 UTF-8
      const env = { ...process.env }
      if (process.platform === 'win32') {
        // 在 Windows 上设置代码页为 UTF-8
        env.PYTHONIOENCODING = 'utf-8'
        env.NODE_OPTIONS = '--experimental-vm-modules'
      }

      const child = spawn('pnpm', ['tsx', scriptPath], {
        cwd: process.cwd(),
        shell: true,
        env,
        // 设置编码为 UTF-8
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
        console.log(text)

        // 解析进度信息
        if (text.includes('加载')) {
          this.progress('loading', 30, text.trim())
        } else if (text.includes('访问')) {
          this.progress('navigate', 40, text.trim())
        } else if (text.includes('提取')) {
          this.progress('extract', 60, text.trim())
        } else if (text.includes('保存') || text.includes('导入')) {
          this.progress('save', 80, text.trim())
        } else if (text.includes('完成')) {
          this.progress('complete', 100, text.trim())
        }
      })

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString()
        console.error(data.toString())
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
        resolve({ 
          success: false, 
          count: 0, 
          error: error.message 
        })
      })
    })
  }

  // 更新 Commissions 数据（已接订单）
  async updateCommissions(): Promise<{ success: boolean; count: number; error?: string }> {
    this.progress('start', 5, '开始更新 Commissions...')
    
    try {
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
      return { success: false, count: 0, error: error.message }
    }
  }

  // 更新 Services 数据（服务列表）
  async updateServices(): Promise<{ success: boolean; count: number; error?: string }> {
    this.progress('start', 5, '开始更新 Services...')
    
    try {
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
      return { success: false, count: 0, error: error.message }
    }
  }
}

