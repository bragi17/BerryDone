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
let timerWindow: BrowserWindow | null = null
let mainWindowRef: BrowserWindow | null = null

// 磁性吸附管理
const SNAP_THRESHOLD = 20 // 吸附阈值（像素）
const BREAK_THRESHOLD = 15 // 断开吸附阈值（像素）

// 调整大小状态管理（用于全局鼠标追踪）
interface ResizeState {
  isResizing: boolean
  widgetType: string
  direction: string
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  intervalId: NodeJS.Timeout | null
}

const resizeState: ResizeState = {
  isResizing: false,
  widgetType: '',
  direction: '',
  startMouseX: 0,
  startMouseY: 0,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  intervalId: null
}
interface SnappedWidget {
  type: string
  offsetX: number // 相对于父组件的 X 偏移
  offsetY: number // 相对于父组件的 Y 偏移
}

// 记录每个小组件下方吸附的子组件
const snappedWidgets: Map<string, SnappedWidget[]> = new Map()

// 获取小组件窗口
function getWidgetWindow(type: string): BrowserWindow | null {
  switch (type) {
    case 'calendar':
      return calendarWindow
    case 'todo':
      return todoWindow
    case 'apps':
      return appsWindow
    case 'quick-replies':
      return quickRepliesWindow
    case 'timer':
      return timerWindow
    default:
      return null
  }
}

// 获取小组件尺寸
function getWidgetSize(type: string): { width: number; height: number } {
  const window = getWidgetWindow(type)
  if (window && !window.isDestroyed()) {
    return window.getBounds()
  }
  // 默认尺寸（根据不同类型返回合适的默认值）
  switch (type) {
    case 'calendar':
      return { width: 340, height: 410 }
    case 'todo':
      return { width: 320, height: 90 }
    case 'apps':
      return { width: 100, height: 110 }
    case 'quick-replies':
      return { width: 320, height: 70 }
    case 'timer':
      return { width: 320, height: 100 }
    default:
      return { width: 320, height: 360 }
  }
}

// 检测两个小组件是否应该吸附
function shouldSnap(
  pos1: { x: number; y: number; width: number; height: number },
  pos2: { x: number; y: number; width: number; height: number }
): { snap: boolean; offsetX: number; offsetY: number; direction: 'bottom' | 'right' | 'left' } | null {
  // 1. 检测垂直吸附（pos2 在 pos1 下方）
  const horizontalOverlap =
    Math.max(pos1.x, pos2.x) < Math.min(pos1.x + pos1.width, pos2.x + pos2.width) + SNAP_THRESHOLD

  if (horizontalOverlap) {
    const bottomGap = pos2.y - (pos1.y + pos1.height)
    if (bottomGap >= 0 && bottomGap < SNAP_THRESHOLD) {
      return {
        snap: true,
        offsetX: pos2.x - pos1.x,
        offsetY: pos2.y - pos1.y,
        direction: 'bottom'
      }
    }
  }

  // 2. 检测水平吸附（pos2 在 pos1 右侧或左侧）
  const verticalOverlap =
    Math.max(pos1.y, pos2.y) < Math.min(pos1.y + pos1.height, pos2.y + pos2.height) + SNAP_THRESHOLD

  if (verticalOverlap) {
    // 检测 pos2 是否在 pos1 右侧
    const rightGap = pos2.x - (pos1.x + pos1.width)
    if (rightGap >= 0 && rightGap < SNAP_THRESHOLD) {
      return {
        snap: true,
        offsetX: pos2.x - pos1.x,
        offsetY: pos2.y - pos1.y,
        direction: 'right'
      }
    }

    // 检测 pos2 是否在 pos1 左侧
    const leftGap = pos1.x - (pos2.x + pos2.width)
    if (leftGap >= 0 && leftGap < SNAP_THRESHOLD) {
      return {
        snap: true,
        offsetX: pos2.x - pos1.x,
        offsetY: pos2.y - pos1.y,
        direction: 'left'
      }
    }
  }

  return null
}

// 检测并建立吸附关系
function checkAndSnap(movedType: string) {
  const movedWindow = getWidgetWindow(movedType)
  if (!movedWindow || movedWindow.isDestroyed()) return

  const movedBounds = movedWindow.getBounds()
  const movedPos = {
    x: movedBounds.x,
    y: movedBounds.y,
    width: movedBounds.width,
    height: movedBounds.height
  }

  const widgetTypes = ['calendar', 'todo', 'apps', 'quick-replies', 'timer'].filter((t) => t !== movedType)

  // 清除该组件之前作为子组件的吸附关系
  for (const [parentType, children] of snappedWidgets.entries()) {
    const filtered = children.filter((child) => child.type !== movedType)
    if (filtered.length !== children.length) {
      snappedWidgets.set(parentType, filtered)
    }
  }

  // 收集所有可能的吸附目标
  interface SnapTarget {
    otherType: string
    otherBounds: { x: number; y: number; width: number; height: number }
    snapResult: { snap: boolean; offsetX: number; offsetY: number; direction: 'bottom' | 'right' | 'left' }
    distance: number
    snapX: number
    snapY: number
  }

  const snapTargets: SnapTarget[] = []

  for (const otherType of widgetTypes) {
    const otherWindow = getWidgetWindow(otherType)
    if (!otherWindow || otherWindow.isDestroyed() || !otherWindow.isVisible()) continue

    const otherBounds = otherWindow.getBounds()
    const otherPos = {
      x: otherBounds.x,
      y: otherBounds.y,
      width: otherBounds.width,
      height: otherBounds.height
    }

    const snapResult = shouldSnap(otherPos, movedPos)
    if (snapResult && snapResult.snap) {
      // 计算吸附后的位置
      let snapX = otherBounds.x
      let snapY = otherBounds.y

      if (snapResult.direction === 'bottom') {
        snapX = otherBounds.x + snapResult.offsetX
        snapY = otherBounds.y + otherBounds.height
      } else if (snapResult.direction === 'right') {
        snapX = otherBounds.x + otherBounds.width
        snapY = otherBounds.y + snapResult.offsetY
      } else if (snapResult.direction === 'left') {
        snapX = otherBounds.x - movedBounds.width
        snapY = otherBounds.y + snapResult.offsetY
      }

      // 计算当前位置与吸附目标的距离
      const dx = movedBounds.x - snapX
      const dy = movedBounds.y - snapY
      const distance = Math.sqrt(dx * dx + dy * dy)

      snapTargets.push({
        otherType,
        otherBounds,
        snapResult,
        distance,
        snapX,
        snapY
      })
    }
  }

  // 横向和纵向分开处理，实现直角吸附
  if (snapTargets.length > 0) {
    // 按方向分组：横向（left/right）和纵向（bottom）
    const horizontalTargets = snapTargets.filter(
      (t) => t.snapResult.direction === 'left' || t.snapResult.direction === 'right'
    )
    const verticalTargets = snapTargets.filter((t) => t.snapResult.direction === 'bottom')

    let finalX = movedBounds.x
    let finalY = movedBounds.y

    // 横向吸附：选择最近的
    if (horizontalTargets.length > 0) {
      horizontalTargets.sort((a, b) => a.distance - b.distance)
      const closestH = horizontalTargets[0]

      // 建立横向吸附关系
      if (!snappedWidgets.has(closestH.otherType)) {
        snappedWidgets.set(closestH.otherType, [])
      }
      const childrenH = snappedWidgets.get(closestH.otherType)!
      childrenH.push({
        type: movedType,
        offsetX: closestH.snapResult.offsetX,
        offsetY: closestH.snapResult.offsetY
      })

      finalX = closestH.snapX
    }

    // 纵向吸附：选择最近的
    if (verticalTargets.length > 0) {
      verticalTargets.sort((a, b) => a.distance - b.distance)
      const closestV = verticalTargets[0]

      // 建立纵向吸附关系（可能与横向吸附到不同的父组件）
      if (!snappedWidgets.has(closestV.otherType)) {
        snappedWidgets.set(closestV.otherType, [])
      }
      const childrenV = snappedWidgets.get(closestV.otherType)!
      childrenV.push({
        type: movedType,
        offsetX: closestV.snapResult.offsetX,
        offsetY: closestV.snapResult.offsetY
      })

      finalY = closestV.snapY
    }

    // 如果有任何吸附，调整位置
    if (horizontalTargets.length > 0 || verticalTargets.length > 0) {
      movedWindow.setPosition(finalX, finalY)
    }
  }
}

// 移动小组件及其吸附的子组件
function moveWidgetWithChildren(type: string, deltaX: number, deltaY: number) {
  const children = snappedWidgets.get(type)
  if (!children || children.length === 0) return

  for (const child of children) {
    const childWindow = getWidgetWindow(child.type)
    if (!childWindow || childWindow.isDestroyed()) continue

    const childBounds = childWindow.getBounds()
    childWindow.setPosition(childBounds.x + deltaX, childBounds.y + deltaY)

    // 递归移动子组件的子组件
    moveWidgetWithChildren(child.type, deltaX, deltaY)
  }
}

// 构建磁吸组 - 找到与某个组件相连的所有组件（深度优先搜索）
function getSnapGroup(type: string): Set<string> {
  const group = new Set<string>()
  const toVisit = [type]

  while (toVisit.length > 0) {
    const current = toVisit.pop()!
    if (group.has(current)) continue

    group.add(current)

    // 找到当前组件的所有子组件
    const children = snappedWidgets.get(current) || []
    for (const child of children) {
      if (!group.has(child.type)) {
        toVisit.push(child.type)
      }
    }

    // 找到当前组件作为子组件的父组件
    for (const [parentType, childrenList] of snappedWidgets.entries()) {
      if (childrenList.some(c => c.type === current) && !group.has(parentType)) {
        toVisit.push(parentType)
      }
    }
  }

  return group
}

// 找到磁吸组中最高的组件（y值最小的）
function getTopWidgetsInGroup(group: Set<string>): string[] {
  let minY = Infinity
  const topWidgets: string[] = []

  // 先找到最小的 y 值
  for (const widgetType of group) {
    const window = getWidgetWindow(widgetType)
    if (!window || window.isDestroyed()) continue

    const bounds = window.getBounds()
    if (bounds.y < minY) {
      minY = bounds.y
    }
  }

  // 找到所有 y 值等于最小 y 值的组件
  for (const widgetType of group) {
    const window = getWidgetWindow(widgetType)
    if (!window || window.isDestroyed()) continue

    const bounds = window.getBounds()
    if (bounds.y === minY) {
      topWidgets.push(widgetType)
    }
  }

  return topWidgets
}

// 移动整个磁吸组
function moveSnapGroup(movedType: string, deltaX: number, deltaY: number) {
  const group = getSnapGroup(movedType)

  for (const widgetType of group) {
    // 跳过触发移动的组件，它已经在外面被移动了
    if (widgetType === movedType) continue

    const window = getWidgetWindow(widgetType)
    if (!window || window.isDestroyed()) continue

    const bounds = window.getBounds()
    window.setPosition(bounds.x + deltaX, bounds.y + deltaY)
  }
}

// 断开组件的所有吸附关系
function breakSnapRelations(type: string) {
  // 移除该组件作为父组件的所有子组件关系
  snappedWidgets.delete(type)

  // 移除该组件作为子组件的父子关系
  for (const [parentType, children] of snappedWidgets.entries()) {
    const filtered = children.filter((child) => child.type !== type)
    if (filtered.length !== children.length) {
      snappedWidgets.set(parentType, filtered)
    }
    // 如果父组件没有子组件了，删除这个键
    if (filtered.length === 0) {
      snappedWidgets.delete(parentType)
    }
  }
}

// 获取所有小组件的显示状态
function getWidgetStates() {
  return {
    calendar: calendarWindow !== null && !calendarWindow.isDestroyed() && calendarWindow.isVisible(),
    todo: todoWindow !== null && !todoWindow.isDestroyed() && todoWindow.isVisible(),
    apps: appsWindow !== null && !appsWindow.isDestroyed() && appsWindow.isVisible(),
    'quick-replies': quickRepliesWindow !== null && !quickRepliesWindow.isDestroyed() && quickRepliesWindow.isVisible(),
    timer: timerWindow !== null && !timerWindow.isDestroyed() && timerWindow.isVisible()
  }
}

// 广播状态变化到控制面板
function broadcastStateChange() {
  if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
    controlPanelWindow.webContents.send('widget:stateChanged', getWidgetStates())
  }
}

// 保存小组件布局到数据库
async function saveWidgetLayout() {
  const db = getDB()
  if (!db) return

  const layout: Record<string, any> = {}

  // 保存每个小组件的位置、大小和可见性
  const widgets: Array<{ type: string; window: BrowserWindow | null }> = [
    { type: 'calendar', window: calendarWindow },
    { type: 'todo', window: todoWindow },
    { type: 'apps', window: appsWindow },
    { type: 'quick-replies', window: quickRepliesWindow },
    { type: 'timer', window: timerWindow }
  ]

  for (const { type, window } of widgets) {
    if (window && !window.isDestroyed()) {
      const bounds = window.getBounds()
      layout[type] = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        visible: window.isVisible()
      }
    } else {
      // 窗口不存在，标记为不可见，使用默认尺寸
      const defaultSize = getWidgetSize(type)
      layout[type] = {
        x: 0,
        y: 0,
        width: defaultSize.width,
        height: defaultSize.height,
        visible: false
      }
    }
  }

  db.data.widgetLayout = layout
  await db.write()
  console.log('[Main] 小组件布局已保存:', layout)
}

// 从数据库加载小组件布局
function loadWidgetLayout(): Record<string, any> | null {
  const db = getDB()
  if (!db || !db.data.widgetLayout) return null

  console.log('[Main] 加载小组件布局:', db.data.widgetLayout)
  return db.data.widgetLayout as Record<string, any>
}

// 广播任务更新到所有窗口
function broadcastTasksUpdate() {
  console.log('[Main] broadcastTasksUpdate 开始')
  // 广播到主窗口
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    console.log('[Main] 发送 tasks:updated 到主窗口')
    mainWindowRef.webContents.send('tasks:updated')
  }
  // 广播到日历窗口
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    console.log('[Main] 发送 tasks:updated 到日历窗口')
    calendarWindow.webContents.send('tasks:updated')
  }
  // 广播到待办窗口
  if (todoWindow && !todoWindow.isDestroyed()) {
    console.log('[Main] 发送 tasks:updated 到待办窗口')
    todoWindow.webContents.send('tasks:updated')
  }
  console.log('[Main] broadcastTasksUpdate 完成')
}

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

  mainWindow.on('closed', () => {
    // 主窗口关闭时，关闭所有小组件
    closeAllWidgets()
    mainWindowRef = null
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
    width: 270,
    height: 520,
    x: width - 290,
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
    // 延迟一下确保窗口完全加载后再广播状态
    setTimeout(() => {
      broadcastStateChange()
    }, 100)
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

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()
  const calendarLayout = savedLayout?.calendar

  calendarWindow = new BrowserWindow({
    width: calendarLayout?.width || 340,
    height: calendarLayout?.height || 410,
    minWidth: 150,
    minHeight: 100,
    x: calendarLayout?.x || 20,
    y: calendarLayout?.y || 20,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
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
    broadcastStateChange()
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

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()
  const todoLayout = savedLayout?.todo

  todoWindow = new BrowserWindow({
    width: todoLayout?.width || 320,
    height: todoLayout?.height || 90,
    minWidth: 150,
    minHeight: 100,
    x: todoLayout?.x || 360,
    y: todoLayout?.y || 20,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
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
    broadcastStateChange()
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

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()
  const appsLayout = savedLayout?.apps

  appsWindow = new BrowserWindow({
    width: appsLayout?.width || 100,
    height: appsLayout?.height || 110,
    minWidth: 150,
    minHeight: 100,
    x: appsLayout?.x || 20,
    y: appsLayout?.y || 400,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
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
    broadcastStateChange()
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

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()
  const quickRepliesLayout = savedLayout?.['quick-replies']

  quickRepliesWindow = new BrowserWindow({
    width: quickRepliesLayout?.width || 320,
    height: quickRepliesLayout?.height || 70,
    minWidth: 150,
    minHeight: 100,
    x: quickRepliesLayout?.x || 360,
    y: quickRepliesLayout?.y || 460,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
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
    broadcastStateChange()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickRepliesWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#quick-replies`)
  } else {
    quickRepliesWindow.loadFile(join(__dirname, '../renderer/widget.html'), {
      hash: 'quick-replies'
    })
  }
}

// 创建计时器窗口
function createTimerWindow(): void {
  if (timerWindow && !timerWindow.isDestroyed()) {
    timerWindow.show()
    timerWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()
  const timerLayout = savedLayout?.timer

  timerWindow = new BrowserWindow({
    width: timerLayout?.width || 320,
    height: timerLayout?.height || 100,
    minWidth: 150,
    minHeight: 100,
    x: timerLayout?.x || 20,
    y: timerLayout?.y || 540,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  timerWindow.on('ready-to-show', () => {
    timerWindow?.show()
  })

  timerWindow.on('closed', () => {
    timerWindow = null
    broadcastStateChange()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    timerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html#timer`)
  } else {
    timerWindow.loadFile(join(__dirname, '../renderer/widget.html'), { hash: 'timer' })
  }
}

// 打开所有小组件窗口
function openAllWidgets(): void {
  // 最小化主窗口
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.minimize()
  }

  // 加载保存的布局
  const savedLayout = loadWidgetLayout()

  // 控制面板始终打开
  createControlPanelWindow()

  // 根据保存的可见性状态决定是否打开其他小组件
  // 如果没有保存的布局或者 visible !== false，则打开
  if (!savedLayout?.calendar || savedLayout.calendar.visible !== false) {
    createCalendarWindow()
  }
  if (!savedLayout?.todo || savedLayout.todo.visible !== false) {
    createTodoWindow()
  }
  if (!savedLayout?.apps || savedLayout.apps.visible !== false) {
    createAppsWindow()
  }
  if (!savedLayout?.['quick-replies'] || savedLayout['quick-replies'].visible !== false) {
    createQuickRepliesWindow()
  }
  if (!savedLayout?.timer || savedLayout.timer.visible !== false) {
    createTimerWindow()
  }
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
  if (timerWindow && !timerWindow.isDestroyed()) {
    timerWindow.close()
  }
}

// 返回主窗口
async function returnToMainWindow(): Promise<void> {
  // 先保存布局再关闭
  await saveWidgetLayout()
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
    // 广播任务更新
    broadcastTasksUpdate()
    return newTask
  })

  ipcMain.handle('db:updateTask', async (_event, id: string, updates: Partial<Task>) => {
    const db = getDB()
    await db.read()
    const index = db.data.tasks.findIndex(t => t.id === id)
    if (index !== -1) {
      db.data.tasks[index] = { ...db.data.tasks[index], ...updates }
      await db.write()
      // 广播任务更新
      broadcastTasksUpdate()
    }
  })

  ipcMain.handle('db:deleteTask', async (_event, id: string) => {
    const db = getDB()
    await db.read()
    db.data.tasks = db.data.tasks.filter(t => t.id !== id)
    await db.write()
    // 广播任务更新
    broadcastTasksUpdate()
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

  // Refunds 相关
  ipcMain.handle('db:getRefunds', async () => {
    const db = getDB()
    await db.read()
    return db.data.refunds || []
  })

  ipcMain.handle('db:addRefund', async (_event, refund: any) => {
    const db = getDB()
    await db.read()
    if (!db.data.refunds) {
      db.data.refunds = []
    }
    db.data.refunds.push(refund)
    await db.write()
    return true
  })

  ipcMain.handle('db:deleteRefund', async (_event, id: string) => {
    const db = getDB()
    await db.read()
    if (db.data.refunds) {
      db.data.refunds = db.data.refunds.filter(r => r.id !== id)
      await db.write()
    }
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
    console.log('[Main] 收到保存排单请求, tasks 数量:', tasks.length)

    // 打印前3个任务的状态信息
    tasks.slice(0, 3).forEach((task, idx) => {
      console.log(`[Main] Task ${idx}: commissionId=${task.commissionId}, status=${task.status}`)
    })

    try {
      const db = getDB()
      await db.read()

      // ✨ 确保 tasks 是纯 JSON 对象，保存所有必要字段（包括 status）
      const cleanTasks = tasks.map(task => ({
        commissionId: String(task.commissionId),
        startDate: String(task.startDate),
        endDate: String(task.endDate),
        workDays: Array.isArray(task.workDays) ? task.workDays.map(String) : [],
        hoursPerDay: task.hoursPerDay ? JSON.parse(JSON.stringify(task.hoursPerDay)) : {},
        totalHours: Number(task.totalHours),
        isLocked: Boolean(task.isLocked),
        status: task.status || 'NORMAL', // ✨ 确保保存 status 字段，默认为 NORMAL
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

      // 打印保存后的前3个任务状态
      cleanTasks.slice(0, 3).forEach((task, idx) => {
        console.log(`[Main] 保存后 Task ${idx}: commissionId=${task.commissionId}, status=${task.status}`)
      })

      // 广播排单更新
      console.log('[Main] 广播排单更新事件...')
      broadcastTasksUpdate()
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
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.minimize()
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
      case 'timer':
        if (timerWindow && !timerWindow.isDestroyed()) {
          timerWindow.close()
        }
        break
    }
  })

  // 切换小组件显示/隐藏
  ipcMain.handle('widget:toggleWidget', (_event, type: string) => {
    let window: BrowserWindow | null = null
    let createFunc: (() => void) | null = null

    switch (type) {
      case 'calendar':
        window = calendarWindow
        createFunc = createCalendarWindow
        break
      case 'todo':
        window = todoWindow
        createFunc = createTodoWindow
        break
      case 'apps':
        window = appsWindow
        createFunc = createAppsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        createFunc = createQuickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        createFunc = createTimerWindow
        break
    }

    if (window && !window.isDestroyed()) {
      // 窗口存在，切换显示/隐藏
      if (window.isVisible()) {
        window.hide()
      } else {
        window.show()
      }
    } else if (createFunc) {
      // 窗口不存在，创建
      createFunc()
    }

    // 广播状态变化
    setTimeout(() => broadcastStateChange(), 100)

    // 返回新状态
    return window && !window.isDestroyed() && window.isVisible()
  })

  // 获取所有小组件状态
  ipcMain.handle('widget:getStates', () => {
    return getWidgetStates()
  })

  // 选择日期（日历通知待办组件）
  ipcMain.handle('widget:selectDate', (_event, dateStr: string) => {
    console.log('[Main] 日历选择日期:', dateStr)
    // 广播给待办窗口
    if (todoWindow && !todoWindow.isDestroyed()) {
      todoWindow.webContents.send('calendar:dateSelected', dateStr)
    }
  })

  ipcMain.handle('widget:minimize', () => {
    // 已被 widget:minimizeAll 取代
  })

  // 获取窗口位置
  ipcMain.handle('widget:getPosition', (_event, type: string) => {
    let window: BrowserWindow | null = null
    switch (type) {
      case 'control':
        window = controlPanelWindow
        break
      case 'calendar':
        window = calendarWindow
        break
      case 'todo':
        window = todoWindow
        break
      case 'apps':
        window = appsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        break
    }
    if (window && !window.isDestroyed()) {
      return window.getPosition()
    }
    return [0, 0]
  })

  // 获取窗口大小
  ipcMain.handle('widget:getSize', (_event, type: string) => {
    let window: BrowserWindow | null = null
    switch (type) {
      case 'control':
        window = controlPanelWindow
        break
      case 'calendar':
        window = calendarWindow
        break
      case 'todo':
        window = todoWindow
        break
      case 'apps':
        window = appsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        break
    }
    if (window && !window.isDestroyed()) {
      const size = window.getSize()
      return { width: size[0], height: size[1] }
    }
    return { width: 0, height: 0 }
  })

  // 设置窗口大小
  ipcMain.handle('widget:setSize', (_event, type: string, width: number, height: number) => {
    let window: BrowserWindow | null = null
    switch (type) {
      case 'control':
        window = controlPanelWindow
        break
      case 'calendar':
        window = calendarWindow
        break
      case 'todo':
        window = todoWindow
        break
      case 'apps':
        window = appsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        break
    }
    if (window && !window.isDestroyed()) {
      window.setSize(Math.round(width), Math.round(height))
    }
  })

  // 设置窗口位置和大小（用于调整左/上边缘时）
  ipcMain.handle('widget:setBounds', (_event, type: string, x: number, y: number, width: number, height: number) => {
    let window: BrowserWindow | null = null
    switch (type) {
      case 'control':
        window = controlPanelWindow
        break
      case 'calendar':
        window = calendarWindow
        break
      case 'todo':
        window = todoWindow
        break
      case 'apps':
        window = appsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        break
    }
    if (window && !window.isDestroyed()) {
      window.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height)
      })
    }
  })

  // 开始全局调整大小（解决鼠标移出窗口时无法继续调整的问题）
  ipcMain.handle('widget:startGlobalResize', (_event, type: string, direction: string, mouseX: number, mouseY: number) => {
    const window = getWidgetWindow(type)
    if (!window || window.isDestroyed()) return false

    const bounds = window.getBounds()

    // 设置调整状态
    resizeState.isResizing = true
    resizeState.widgetType = type
    resizeState.direction = direction
    resizeState.startMouseX = mouseX
    resizeState.startMouseY = mouseY
    resizeState.startX = bounds.x
    resizeState.startY = bounds.y
    resizeState.startWidth = bounds.width
    resizeState.startHeight = bounds.height

    const minWidth = 150
    const minHeight = 100

    // 使用定时器持续追踪鼠标位置
    resizeState.intervalId = setInterval(() => {
      if (!resizeState.isResizing) {
        if (resizeState.intervalId) {
          clearInterval(resizeState.intervalId)
          resizeState.intervalId = null
        }
        return
      }

      const targetWindow = getWidgetWindow(resizeState.widgetType)
      if (!targetWindow || targetWindow.isDestroyed()) {
        resizeState.isResizing = false
        if (resizeState.intervalId) {
          clearInterval(resizeState.intervalId)
          resizeState.intervalId = null
        }
        return
      }

      // 获取全局鼠标位置
      const cursorPoint = screen.getCursorScreenPoint()
      const deltaX = cursorPoint.x - resizeState.startMouseX
      const deltaY = cursorPoint.y - resizeState.startMouseY

      let newX = resizeState.startX
      let newY = resizeState.startY
      let newWidth = resizeState.startWidth
      let newHeight = resizeState.startHeight

      const dir = resizeState.direction

      // 处理不同方向的调整
      if (dir.includes('e')) {
        newWidth = Math.max(minWidth, resizeState.startWidth + deltaX)
      }
      if (dir.includes('w')) {
        const proposedWidth = Math.max(minWidth, resizeState.startWidth - deltaX)
        const widthDiff = resizeState.startWidth - proposedWidth
        newWidth = proposedWidth
        newX = resizeState.startX + widthDiff
      }
      if (dir.includes('s')) {
        newHeight = Math.max(minHeight, resizeState.startHeight + deltaY)
      }
      if (dir.includes('n')) {
        const proposedHeight = Math.max(minHeight, resizeState.startHeight - deltaY)
        const heightDiff = resizeState.startHeight - proposedHeight
        newHeight = proposedHeight
        newY = resizeState.startY + heightDiff
      }

      // 更新窗口
      targetWindow.setBounds({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      })
    }, 16) // ~60fps

    return true
  })

  // 停止全局调整大小
  ipcMain.handle('widget:stopGlobalResize', () => {
    resizeState.isResizing = false
    if (resizeState.intervalId) {
      clearInterval(resizeState.intervalId)
      resizeState.intervalId = null
    }
  })

  // 设置窗口位置
  ipcMain.handle('widget:setPosition', (_event, type: string, x: number, y: number) => {
    // 控制面板不参与吸附
    if (type === 'control') {
      if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
        controlPanelWindow.setPosition(Math.round(x), Math.round(y))
      }
      return
    }

    let window: BrowserWindow | null = null
    switch (type) {
      case 'calendar':
        window = calendarWindow
        break
      case 'todo':
        window = todoWindow
        break
      case 'apps':
        window = appsWindow
        break
      case 'quick-replies':
        window = quickRepliesWindow
        break
      case 'timer':
        window = timerWindow
        break
    }

    if (window && !window.isDestroyed()) {
      // 记录旧位置，用于计算移动距离
      const oldBounds = window.getBounds()
      const oldX = oldBounds.x
      const oldY = oldBounds.y

      // 计算移动距离
      const deltaX = Math.round(x) - oldX
      const deltaY = Math.round(y) - oldY
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 检查是否在磁吸组中
      const snapGroup = getSnapGroup(type)

      if (snapGroup.size > 1) {
        // 在磁吸组中，检查是否是最高的组件之一
        const topWidgets = getTopWidgetsInGroup(snapGroup)
        const isTopWidget = topWidgets.includes(type)

        if (isTopWidget) {
          // 是最高组件之一，允许拖动整个磁吸组
          window.setPosition(Math.round(x), Math.round(y))

          // 移动整个磁吸组
          if (deltaX !== 0 || deltaY !== 0) {
            moveSnapGroup(type, deltaX, deltaY)
          }
        } else {
          // 不是最高组件，检查移动距离
          if (moveDistance > BREAK_THRESHOLD) {
            // 移动距离超过阈值，断开吸附关系
            breakSnapRelations(type)
            // 然后正常移动
            window.setPosition(Math.round(x), Math.round(y))
          } else {
            // 移动距离不足，不允许移动
            return
          }
        }
      } else {
        // 不在磁吸组中，单独移动
        window.setPosition(Math.round(x), Math.round(y))
      }

      // 检测是否应该吸附到其他小组件
      setTimeout(() => checkAndSnap(type), 50)
    }
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

    // 提取应用程序图标
    let iconDataUrl: string | null = null
    try {
      const nativeImage = await app.getFileIcon(filePath, { size: 'normal' })
      if (!nativeImage.isEmpty()) {
        iconDataUrl = nativeImage.toDataURL()
      }
    } catch (error) {
      console.error('Failed to extract icon:', error)
    }

    return {
      name: appName,
      path: filePath,
      icon: iconDataUrl
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

// 在应用退出前保存小组件布局
app.on('before-quit', async (event) => {
  // 阻止立即退出，等待保存完成
  event.preventDefault()
  await saveWidgetLayout()
  // 保存完成后真正退出
  app.exit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
