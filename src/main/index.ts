import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDB, getDB, Task, Project, VGenService } from './db'
import { fetchVGenCommissions, saveVGenData } from './vgen'
import { VGenUpdater } from './vgen-updater'
import type { SchedulerState, SchedulerConfig, ScheduledTask, PriorityConfig } from './types/scheduler'
import { DEFAULT_PRIORITY_CONFIG } from './types/scheduler'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Widget 窗口管理
let controlPanelWindow: BrowserWindow | null = null
let calendarWindow: BrowserWindow | null = null
let todoWindow: BrowserWindow | null = null
let appsWindow: BrowserWindow | null = null
let quickRepliesWindow: BrowserWindow | null = null
let mainWindowRef: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    minWidth: 1400,
    minHeight: 1000,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 保存主窗口引用
  mainWindowRef = mainWindow

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 创建控制面板窗口
function createControlPanelWindow(): void {
  if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
    controlPanelWindow.show()
    controlPanelWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  controlPanelWindow = new BrowserWindow({
    width: 200,
    height: 150,
    x: width - 220,
    y: 20,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  controlPanelWindow.on('ready-to-show', () => {
    controlPanelWindow?.show()
  })

  controlPanelWindow.on('closed', () => {
    controlPanelWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    controlPanelWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#control`)
  } else {
    controlPanelWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'control' })
  }
}

// 创建日历窗口
function createCalendarWindow(): void {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.show()
    calendarWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  calendarWindow = new BrowserWindow({
    width: 320,
    height: 360,
    x: 20,
    y: 20,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 280,
    minHeight: 320,
    skipTaskbar: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  calendarWindow.on('ready-to-show', () => {
    calendarWindow?.show()
  })

  calendarWindow.on('closed', () => {
    calendarWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    calendarWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#calendar`)
  } else {
    calendarWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'calendar' })
  }
}

// 创建待办窗口
function createTodoWindow(): void {
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.show()
    todoWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  todoWindow = new BrowserWindow({
    width: 320,
    height: 420,
    x: 360,
    y: 20,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 280,
    minHeight: 320,
    skipTaskbar: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  todoWindow.on('ready-to-show', () => {
    todoWindow?.show()
  })

  todoWindow.on('closed', () => {
    todoWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    todoWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#todo`)
  } else {
    todoWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'todo' })
  }
}

// 创建应用快捷启动窗口
function createAppsWindow(): void {
  if (appsWindow && !appsWindow.isDestroyed()) {
    appsWindow.show()
    appsWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  appsWindow = new BrowserWindow({
    width: 320,
    height: 220,
    x: 20,
    y: 400,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 280,
    minHeight: 180,
    skipTaskbar: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  appsWindow.on('ready-to-show', () => {
    appsWindow?.show()
  })

  appsWindow.on('closed', () => {
    appsWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    appsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#apps`)
  } else {
    appsWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'apps' })
  }
}

// 创建快捷回复窗口
function createQuickRepliesWindow(): void {
  if (quickRepliesWindow && !quickRepliesWindow.isDestroyed()) {
    quickRepliesWindow.show()
    quickRepliesWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  quickRepliesWindow = new BrowserWindow({
    width: 320,
    height: 140,
    x: 360,
    y: 460,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 280,
    minHeight: 120,
    skipTaskbar: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  quickRepliesWindow.on('ready-to-show', () => {
    quickRepliesWindow?.show()
  })

  quickRepliesWindow.on('closed', () => {
    quickRepliesWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickRepliesWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#quick-replies`)
  } else {
    quickRepliesWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'quick-replies' })
  }
}

// 打开所有小组件窗口
function openAllWidgets(): void {
  // 最小化主窗口
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.minimize()
  }

  // 创建所有小组件窗口
  createControlPanelWindow()
  createCalendarWindow()
  createTodoWindow()
  createAppsWindow()
  createQuickRepliesWindow()
}

// 关闭所有小组件窗口
function closeAllWidgets(): void {
  if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
    controlPanelWindow.close()
  }
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.close()
  }
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.close()
  }
  if (appsWindow && !appsWindow.isDestroyed()) {
    appsWindow.close()
  }
  if (quickRepliesWindow && !quickRepliesWindow.isDestroyed()) {
    quickRepliesWindow.close()
  }
}

// 返回主窗口
function returnToMainWindow(): void {
  closeAllWidgets()
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.restore()
    mainWindowRef.show()
    mainWindowRef.focus()
  }
}

// 注册数据库 IPC 处理器
function registerDBHandlers(): void {
  // 任务相关
  ipcMain.handle('db:getTasks', async () => {
    const db = getDB()
    await db.read()
    return db.data.tasks
  })

  ipcMain.handle('db:addTask', async (_event, task: Omit<Task, 'id'>) => {
    const db = getDB()
    await db.read()
    const newTask: Task = {
      ...task,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
    db.data.tasks.push(newTask)
    await db.write()
    return newTask
  })

  ipcMain.handle('db:updateTask', async (_event, id: string, updates: Partial<Task>) => {
    const db = getDB()
    await db.read()
    const index = db.data.tasks.findIndex(t => t.id === id)
    if (index !== -1) {
      db.data.tasks[index] = { ...db.data.tasks[index], ...updates }
      await db.write()
    }
  })

  ipcMain.handle('db:deleteTask', async (_event, id: string) => {
    const db = getDB()
    await db.read()
    db.data.tasks = db.data.tasks.filter(t => t.id !== id)
    await db.write()
  })

  // 项目相关
  ipcMain.handle('db:getProjects', async () => {
    const db = getDB()
    await db.read()
    return db.data.projects
  })

  ipcMain.handle('db:addProject', async (_event, project: Omit<Project, 'id'>) => {
    const db = getDB()
    await db.read()
    const newProject: Project = {
      ...project,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
    db.data.projects.push(newProject)
    await db.write()
    return newProject
  })

  ipcMain.handle('db:updateProject', async (_event, id: string, updates: Partial<Project>) => {
    const db = getDB()
    await db.read()
    const index = db.data.projects.findIndex(p => p.id === id)
    if (index !== -1) {
      db.data.projects[index] = { ...db.data.projects[index], ...updates }
      await db.write()
    }
  })

  ipcMain.handle('db:deleteProject', async (_event, id: string) => {
    const db = getDB()
    await db.read()
    db.data.projects = db.data.projects.filter(p => p.id !== id)
    await db.write()
  })

  // VGen Commissions 相关
  ipcMain.handle('db:getVGenCommissions', async () => {
    const db = getDB()
    await db.read()
    return db.data.vgenCommissions || []
  })

  ipcMain.handle('db:getVGenCommissionsByStatus', async (_event, status: string) => {
    const db = getDB()
    await db.read()
    return (db.data.vgenCommissions || []).filter(c => c.status === status)
  })

  ipcMain.handle('db:updateVGenCommissionWorkHours', async (_event, id: string, workHours: number) => {
    const db = getDB()
    await db.read()
    const index = db.data.vgenCommissions.findIndex(c => c.id === id)
    if (index !== -1) {
      db.data.vgenCommissions[index].estimatedWorkHours = workHours
      await db.write()
      return true
    }
    return false
  })

  // VGen Services 相关
  ipcMain.handle('db:getVGenServices', async () => {
    const db = getDB()
    await db.read()
    return db.data.vgenServices || []
  })

  ipcMain.handle('db:updateVGenServiceWorkHours', async (_event, id: string, workHours: number) => {
    const db = getDB()
    await db.read()
    const index = db.data.vgenServices.findIndex(s => s.id === id)
    if (index !== -1) {
      db.data.vgenServices[index].estimatedWorkHours = workHours
      await db.write()
      return true
    }
    return false
  })

  ipcMain.handle('db:importVGenServices', async (_event, services: VGenService[]) => {
    const db = getDB()
    await db.read()
    db.data.vgenServices = services
    await db.write()
    return true
  })

  // WorkHoursConfig 相关
  ipcMain.handle('db:getWorkHoursConfig', async () => {
    const db = getDB()
    await db.read()
    return db.data.workHoursConfig || {
      globalDefault: 8,
      categoryDefaults: {},
      serviceOverrides: {}
    }
  })

  ipcMain.handle('db:saveWorkHoursConfig', async (_event, config: any) => {
    const db = getDB()
    await db.read()
    db.data.workHoursConfig = config
    await db.write()
    return true
  })

  // Scheduler 相关
  ipcMain.handle('scheduler:getState', async () => {
    const db = getDB()
    await db.read()
    return db.data.schedulerState || null
  })

  ipcMain.handle('scheduler:saveState', async (_event, state: SchedulerState) => {
    const db = getDB()
    await db.read()
    db.data.schedulerState = state
    await db.write()
    return true
  })

  ipcMain.handle('scheduler:getConfig', async () => {
    const db = getDB()
    await db.read()
    return db.data.schedulerState?.config || null
  })

  ipcMain.handle('scheduler:saveConfig', async (_event, config: SchedulerConfig) => {
    const db = getDB()
    await db.read()
    if (!db.data.schedulerState) {
      db.data.schedulerState = {
        config,
        scheduledTasks: [],
        lastScheduledDate: new Date().toISOString(),
        history: [],
        historyIndex: -1
      }
    } else {
      db.data.schedulerState.config = config
    }
    await db.write()
    return true
  })

  ipcMain.handle('scheduler:getScheduledTasks', async () => {
    const db = getDB()
    await db.read()
    return db.data.schedulerState?.scheduledTasks || []
  })

  ipcMain.handle('scheduler:saveScheduledTasks', async (_event, tasks: ScheduledTask[]) => {
    console.log('[Main] 收到保存排单请求, tasks:', tasks)
    try {
      const db = getDB()
      await db.read()

      // ✨ 确保 tasks 是纯 JSON 对象，保存所有必要字段
      const cleanTasks = tasks.map(task => ({
        commissionId: String(task.commissionId),
        startDate: String(task.startDate),
        endDate: String(task.endDate),
        workDays: Array.isArray(task.workDays) ? task.workDays.map(String) : [],
        hoursPerDay: task.hoursPerDay ? JSON.parse(JSON.stringify(task.hoursPerDay)) : {},
        totalHours: Number(task.totalHours),
        isLocked: Boolean(task.isLocked),
        priorityScore: task.priorityScore !== undefined ? Number(task.priorityScore) : undefined,
        // ✨ 新增：保存子任务相关信息
        parentTaskId: task.parentTaskId !== undefined ? String(task.parentTaskId) : undefined,
        subTaskIndex: task.subTaskIndex !== undefined ? Number(task.subTaskIndex) : undefined,
        subTaskCount: task.subTaskCount !== undefined ? Number(task.subTaskCount) : undefined,
        taskId: task.taskId !== undefined ? String(task.taskId) : undefined,
        // ✨ 新增：保存垂直位置信息
        startHour: (task as any).startHour !== undefined ? Number((task as any).startHour) : undefined
      }))

      if (!db.data.schedulerState) {
        // 如果还没有 scheduler state，创建一个
        db.data.schedulerState = {
          config: {
            workHoursPerDay: {},
            restDays: [],
            defaultWorkHours: 8,
            weekendRest: true
          },
          scheduledTasks: cleanTasks,
          lastScheduledDate: new Date().toISOString(),
          history: [],
          historyIndex: -1
        }
      } else {
        db.data.schedulerState.scheduledTasks = cleanTasks
        db.data.schedulerState.lastScheduledDate = new Date().toISOString()
      }

      await db.write()
      console.log('[Main] 保存排单成功')
      return true
    } catch (error: any) {
      console.error('[Main] 保存排单失败:', error)
      throw error
    }
  })

  // 优先级配置相关
  ipcMain.handle('scheduler:getPriorityConfig', async () => {
    const db = getDB()
    await db.read()
    return db.data.priorityConfig || DEFAULT_PRIORITY_CONFIG
  })

  ipcMain.handle('scheduler:savePriorityConfig', async (_event, config: PriorityConfig) => {
    const db = getDB()
    await db.read()
    db.data.priorityConfig = config
    await db.write()
    return true
  })

  // VGen 数据更新
  ipcMain.handle('vgen:updateCommissions', async (event) => {
    console.log('[Main] 开始更新 Commissions...')
    const updater = new VGenUpdater((progress) => {
      console.log('[Main] 进度更新:', progress)
      event.sender.send('vgen:updateProgress', progress)
    })
    const result = await updater.updateCommissions()
    console.log('[Main] Commissions 更新结果:', result)
    return result
  })

  ipcMain.handle('vgen:updateServices', async (event) => {
    console.log('[Main] 开始更新 Services...')
    const updater = new VGenUpdater((progress) => {
      console.log('[Main] 进度更新:', progress)
      event.sender.send('vgen:updateProgress', progress)
    })
    const result = await updater.updateServices()
    console.log('[Main] Services 更新结果:', result)
    return result
  })
}

/* 定时任务管理（预留功能，暂时未启用）
let commissionsUpdateTimer: NodeJS.Timeout | null = null
let servicesUpdateTimer: NodeJS.Timeout | null = null

function setupAutoUpdate() {
  // Services 自动更新：每天 23:30 北京时间
  function scheduleServicesUpdate() {
    const now = new Date()
    const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
    
    const targetTime = new Date(beijingTime)
    targetTime.setHours(23, 30, 0, 0)
    
    if (beijingTime > targetTime) {
      // 如果已过今天的 23:30，设置为明天
      targetTime.setDate(targetTime.getDate() + 1)
    }
    
    const delay = targetTime.getTime() - beijingTime.getTime()
    
    console.log(`[自动更新] Services 下次更新时间: ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`)
    
    if (servicesUpdateTimer) {
      clearTimeout(servicesUpdateTimer)
    }
    
    servicesUpdateTimer = setTimeout(async () => {
      console.log('[自动更新] 开始更新 Services...')
      const updater = new VGenUpdater()
      await updater.updateServices()
      
      // 重新调度下一次更新
      scheduleServicesUpdate()
    }, delay)
  }

  // Commissions 自动更新：每 2 小时
  function scheduleCommissionsUpdate() {
    const twoHours = 2 * 60 * 60 * 1000
    
    console.log(`[自动更新] Commissions 下次更新时间: ${new Date(Date.now() + twoHours).toLocaleString('zh-CN')}`)
    
    if (commissionsUpdateTimer) {
      clearInterval(commissionsUpdateTimer)
    }
    
    commissionsUpdateTimer = setInterval(async () => {
      console.log('[自动更新] 开始更新 Commissions...')
      const updater = new VGenUpdater()
      await updater.updateCommissions()
    }, twoHours)
  }

  scheduleServicesUpdate()
  scheduleCommissionsUpdate()
}
*/

// 注册 VGen IPC 处理器
function registerVGenHandlers(): void {
  // 抓取 VGen commissions
  ipcMain.handle('vgen:fetchCommissions', async () => {
    try {
      const result = await fetchVGenCommissions()
      
      // 保存结果
      if (result.success) {
        saveVGenData(result)
      }
      
      return result
    } catch (error) {
      console.error('VGen fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    }
  })
}

// 注册 Widget IPC 处理器
function registerWidgetHandlers(): void {
  // 打开小组件
  ipcMain.handle('widget:toggle', () => {
    openAllWidgets()
  })

  // 返回主窗口
  ipcMain.handle('widget:returnToMain', () => {
    returnToMainWindow()
  })

  // 关闭应用程序
  ipcMain.handle('widget:closeApp', () => {
    app.quit()
  })

  // 最小化所有小组件
  ipcMain.handle('widget:minimizeAll', () => {
    if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
      controlPanelWindow.minimize()
    }
    if (calendarWindow && !calendarWindow.isDestroyed()) {
      calendarWindow.minimize()
    }
    if (todoWindow && !todoWindow.isDestroyed()) {
      todoWindow.minimize()
    }
    if (appsWindow && !appsWindow.isDestroyed()) {
      appsWindow.minimize()
    }
    if (quickRepliesWindow && !quickRepliesWindow.isDestroyed()) {
      quickRepliesWindow.minimize()
    }
  })

  // 单独关闭窗口
  ipcMain.handle('widget:close', (_event, type: string) => {
    switch (type) {
      case 'control':
        if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
          controlPanelWindow.close()
        }
        break
      case 'calendar':
        if (calendarWindow && !calendarWindow.isDestroyed()) {
          calendarWindow.close()
        }
        break
      case 'todo':
        if (todoWindow && !todoWindow.isDestroyed()) {
          todoWindow.close()
        }
        break
      case 'apps':
        if (appsWindow && !appsWindow.isDestroyed()) {
          appsWindow.close()
        }
        break
      case 'quick-replies':
        if (quickRepliesWindow && !quickRepliesWindow.isDestroyed()) {
          quickRepliesWindow.close()
        }
        break
    }
  })

  ipcMain.handle('widget:minimize', () => {
    // 已被 widget:minimizeAll 取代
  })

  // 选择应用程序
  ipcMain.handle('widget:selectApp', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Applications',
          extensions: process.platform === 'win32' ? ['exe', 'lnk'] : ['app']
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown'
    const appName = fileName.replace(/\.(exe|lnk|app)$/i, '')

    return {
      name: appName,
      path: filePath,
      icon: null // 可以后续添加图标提取功能
    }
  })

  // 启动应用程序
  ipcMain.handle('widget:launchApp', async (_event, appPath: string) => {
    try {
      if (process.platform === 'win32') {
        // Windows: 使用 start 命令
        await execAsync(`start "" "${appPath}"`, { shell: true })
      } else if (process.platform === 'darwin') {
        // macOS: 使用 open 命令
        await execAsync(`open "${appPath}"`)
      } else {
        // Linux: 使用 xdg-open
        await execAsync(`xdg-open "${appPath}"`)
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to launch app:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化数据库
  await initDB()

  // 注册数据库处理器
  registerDBHandlers()

  // 注册 VGen 处理器
  registerVGenHandlers()

  // 注册 Widget 处理器
  registerWidgetHandlers()

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // 启动自动更新（可选功能，用户也可以手动更新）
  // setupAutoUpdate()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  /* 清理定时器（功能未启用）
  if (commissionsUpdateTimer) {
    clearInterval(commissionsUpdateTimer)
  }
  if (servicesUpdateTimer) {
    clearTimeout(servicesUpdateTimer)
  }
  */

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
