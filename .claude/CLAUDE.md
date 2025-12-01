# 🍓 BerryDone Project Memory

**项目名称**: BerryDone - VGen Commissions Timeline Manager
**版本**: 1.2.0
**最后更新**: 2024-11-27

---

## 📋 项目概述

BerryDone 是一个专为 VGen 创作者设计的桌面应用，用于管理和可视化艺术委托（Commissions）工作流。通过自动化数据抓取、智能时间线排单和可视化统计，帮助创作者高效管理多个委托项目。

### 核心价值
1. **自动化数据同步**: 从 VGen 平台自动抓取委托数据
2. **智能时间管理**: AI 驱动的智能排单算法，自动安排工作日程
3. **可视化工作流**: 多视图展示项目进度和收入统计
4. **离线优先**: 本地数据库存储，支持离线工作

---

## 🏗️ 技术架构

### 核心技术栈
- **前端**: Vue 3.5.21 (Composition API) + TypeScript 5.9.2 + Naive UI 2.43.2
- **桌面框架**: Electron 38.1.2 + Electron Vite 4.0.1
- **数据存储**: LowDB 7.0.1 (JSON文件数据库)
- **自动化**: Playwright 1.56.1 (VGen数据抓取)

### 项目结构
```
BerryDone/
├── .claude/CLAUDE.md          # 项目记忆文件
├── src/
│   ├── main/                  # Electron主进程
│   │   ├── index.ts          # 应用入口
│   │   ├── db.ts             # 数据库管理
│   │   ├── vgen.ts           # VGen API集成
│   │   └── vgen-updater.ts   # 定时更新任务
│   ├── preload/               # Preload脚本（IPC桥接）
│   └── renderer/src/          # Vue前端
│       ├── views/             # 页面组件
│       │   ├── Home.vue      # 日历视图
│       │   ├── Timeline.vue  # 智能排单
│       │   ├── Commissions.vue # 服务管理
│       │   └── Dashboard.vue # 数据统计
│       └── utils/
│           └── scheduler.ts  # 排单算法
├── scripts/                   # 工具脚本
└── cookies/                   # VGen Cookie（.gitignore）
```

---

## 🎯 核心功能

### 1. Home - 日历视图
- 月历展示所有委托项目
- 每日工时配置系统（默认8h，可自定义）
- 休息日管理（默认周末，支持自定义）
- 每日统计徽章（Ready/WIP/Completed）
- 本月收入和完成率统计

**工时管理**:
```typescript
workHoursPerDay: Record<string, number>  // 每日自定义工时
defaultWorkHours: number                 // 全局默认8小时
restDays: string[]                       // 休息日列表
```

### 2. Timeline - 智能排单
**双页签设计**:
1. **智能排单**: AI驱动的自动排单系统
2. **原始数据**: 可视化的项目时间线（只读）

**核心算法** (`utils/scheduler.ts`):
```typescript
// 排单流程
1. 筛选待排单commissions（IN_PROGRESS/PENDING）
2. 计算优先级分数（截止日期+状态+付款）
3. 按优先级排序
4. 从今日开始分配工作日
5. 跳过休息日，遵守每日工时限制

// 优先级权重
- dueDate: 临近截止日期优先
- status: IN_PROGRESS > PENDING
- payment: PAID > UNPAID
```

**UI特性**:
- 时间线网格：左侧时段标签（80px）+ 右侧任务网格
- 24小时分为12个2小时时段
- 视图模式：按周（自适应）/ 按月（固定120px/天）
- 缩放：Ctrl+滚轮（60-300px/天）
- 卡片拖动调整日期，卡片拉伸调整工时
- 状态颜色：COMPLETED(青)、IN_PROGRESS(蓝)、PENDING(橙)、DRAFT(灰)

### 3. Commissions - 服务管理
- 显示所有VGen服务（按分类分组）
- 三级工时配置：全局默认 → 分类默认 → 单个服务
- 已下单服务高亮提示
- 自动检测缺少工时的服务

**工时配置体系**:
```typescript
workHoursConfig: {
  globalDefault: 8,
  categoryDefaults: { "Illustration": 12 },
  serviceOverrides: { "service-id": 16 }
}
```

### 4. Dashboard - 数据统计
- 本月收入统计（总收入、订单数、平均单价）
- 项目状态分布饼图
- 近6个月收入趋势
- 最近完成项目列表

---

### 5. Widget System - 桌面小组件系统 (`widget/*`)

#### 功能概述
桌面小组件系统允许用户将关键信息以独立窗口形式固定在桌面上，实现快速查看和交互。从主程序侧边栏点击"小组件"按钮即可打开。

#### 小组件架构

##### 窗口管理 (`src/main/index.ts`)
```typescript
// 所有小组件窗口引用
let controlPanelWindow: BrowserWindow | null = null  // 控制面板
let calendarWindow: BrowserWindow | null = null      // 日历小组件
let todoWindow: BrowserWindow | null = null          // 今日待办
let appsWindow: BrowserWindow | null = null          // 应用快捷启动
let quickRepliesWindow: BrowserWindow | null = null  // 快捷回复

// 窗口特性
- frame: false           // 无边框窗口
- transparent: true      // 透明背景支持
- alwaysOnTop: true     // 始终置顶
- resizable: true       // 支持调整大小（除控制面板）
- skipTaskbar: true     // 不显示在任务栏
```

##### 窗口创建流程
```typescript
1. 主程序点击"小组件"按钮
2. 主窗口最小化
3. 创建所有小组件窗口：
   - 控制面板（右上角，270×470px）
   - 日历（左上角，340×410px）
   - 今日待办（日历右侧，320×90px）
   - 应用快捷启动（左下角，100×110px）
   - 快捷回复（待办下方，320×70px）
4. 每个窗口加载 widget.html 页面（通过 hash 区分）
```

---

#### 5.1 控制面板 (`ControlPanel.vue`)

##### 功能特性
- **返回主程序**：关闭所有小组件，恢复主窗口
- **最小化所有**：最小化所有小组件窗口
- **关闭应用**：完全退出应用
- **小组件开关**：独立控制每个小组件的显示/隐藏
  - 日历小组件
  - 今日待办
  - 应用快捷启动
  - 快捷回复

##### UI设计
```vue
<!-- 紧凑卡片式布局 -->
- 半透明黑色背景 + 毛玻璃效果
- 标题栏：拖拽区域（30px高）
- 控制按钮：返回/最小化/关闭（图标按钮）
- 小组件列表：开关切换（带状态指示）
```

##### 状态同步
```typescript
// 监听小组件状态变化
window.electron.ipcRenderer.on('widget:stateChanged', (states) => {
  widgetStates.value = states  // 实时更新UI
})

// 切换小组件
const toggleWidget = async (type: string) => {
  await window.electron.ipcRenderer.invoke('widget:toggleWidget', type)
}
```

---

#### 5.2 日历小组件 (`CalendarWidget.vue`)

##### 功能特性
- **月历视图**：显示当前月份的完整日历
- **排单任务统计**：
  - 每日显示任务数量徽章（右上角粉色圆点）
  - 统计该日期已排单的任务数量
- **日期选择**：
  - 点击日期选中（蓝色蒙版）
  - 通知待办组件更新显示
  - 默认选中今天
- **月份导航**：上月/下月/今天按钮
- **实时数据**：监听 `tasks:updated` 事件自动刷新

##### 数据加载
```typescript
// 加载排单数据
const loadTasks = async () => {
  // 1. 获取所有排单任务
  const scheduledTasks = await window.electron.ipcRenderer.invoke(
    'scheduler:getScheduledTasks'
  )

  // 2. 获取 Commission 详情
  const commissions = await window.electron.ipcRenderer.invoke(
    'db:getVGenCommissions'
  )

  // 3. 统计每日任务数量
  getTaskCountForDate(year, month, date) {
    const targetDate = new Date(year, month, date).toISOString().split('T')[0]
    return scheduledTasks.filter(task =>
      task.workDays.includes(targetDate)
    ).length
  }
}
```

##### 日期选择通知
```typescript
// 选择日期时通知待办组件
const selectDate = (year, month, date) => {
  const dateStr = new Date(year, month, date).toISOString().split('T')[0]
  selectedDate.value = dateStr

  // 通过主进程广播给待办窗口
  window.electron.ipcRenderer.invoke('widget:selectDate', dateStr)
}

// 组件挂载时通知默认日期（今天）
onMounted(() => {
  loadTasks()
  window.electron.ipcRenderer.invoke('widget:selectDate', selectedDate.value)
})
```

##### UI样式
```css
/* 紧凑布局 */
- 日历头部：月份名 + 年份 + 导航按钮
- "今天"按钮：紫色边框，hover高亮
- 星期标题：7列均分
- 日期网格：7×6网格（42个格子）
- 日期格子：aspect-ratio 1:1（正方形）
- 今日高亮：紫色背景 (#8b5cf6)
- 选中高亮：蓝色背景 (rgba(59, 130, 246, 0.6))
- 任务徽章：右上角粉色圆点 (#ff6b9d)，显示数量
```

---

#### 5.3 今日待办 (`TodoWidget.vue`)

##### 功能特性
- **动态日期显示**：
  - 默认显示"今日待办"
  - 点击日历后显示"X月X日"
- **任务列表**：
  - 显示选中日期的所有排单任务
  - 任务名称（Commission projectName）
  - 优先级标识（圆点颜色）
  - 分配工时（紫色标签）
  - 完成状态（绿色蒙版 + 勾选图标）
- **长按完成**：
  - 长按500ms标记任务完成/取消完成
  - 完成状态实时同步到数据库
  - 绿色渐变蒙版 + 弹出动画

##### 数据加载
```typescript
// 加载指定日期的待办
const loadTodosForDate = async (dateStr: string) => {
  // 1. 获取所有排单任务
  const scheduledTasks = await window.electron.ipcRenderer.invoke(
    'scheduler:getScheduledTasks'
  )

  // 2. 获取 Commission 详情
  const commissions = await window.electron.ipcRenderer.invoke(
    'db:getVGenCommissions'
  )

  // 3. 创建 commission map
  const commissionMap = new Map(
    commissions.map(c => [c.commissionID || c.id, c])
  )

  // 4. 筛选该日期的任务
  todos.value = scheduledTasks
    .filter(task => task.workDays.includes(dateStr))
    .map(task => {
      const commission = commissionMap.get(task.commissionId)
      return {
        id: task.commissionId,
        commissionId: task.commissionId,
        title: commission?.projectName || `任务 ${task.commissionId}`,
        completed: task.status === 'COMPLETED',
        priority: commission?.priority || 'NORMAL',
        hours: task.hoursPerDay[dateStr] || 0
      }
    })
}
```

##### 完成状态切换
```typescript
// 长按切换完成状态
const toggleComplete = async (task: TodoItem) => {
  // 1. 获取所有排单
  const scheduledTasks = await window.electron.ipcRenderer.invoke(
    'scheduler:getScheduledTasks'
  )

  // 2. 找到对应任务
  const taskIndex = scheduledTasks.findIndex(
    t => t.commissionId === task.commissionId
  )

  if (taskIndex !== -1) {
    // 3. 切换状态
    const newStatus = scheduledTasks[taskIndex].status === 'COMPLETED'
      ? 'NORMAL'
      : 'COMPLETED'
    scheduledTasks[taskIndex].status = newStatus

    // 4. 保存回数据库
    await window.electron.ipcRenderer.invoke(
      'scheduler:saveScheduledTasks',
      scheduledTasks
    )

    // 5. 更新本地UI
    task.completed = newStatus === 'COMPLETED'
  }
}

// 长按检测（500ms）
const startLongPress = (task) => {
  longPressTimer.value = setTimeout(() => {
    toggleComplete(task)
    longPressTimer.value = null
  }, 500)
}
```

##### 完成状态视觉效果
```css
/* 完成状态卡片 */
.todo-item.completed {
  background: rgba(76, 175, 80, 0.15);        /* 浅绿色背景 */
  border: 1px solid rgba(76, 175, 80, 0.3);  /* 绿色边框 */
}

.todo-item.completed::before {
  content: '';
  position: absolute;
  background: linear-gradient(135deg,
    rgba(76, 175, 80, 0.2),
    rgba(76, 175, 80, 0.05)
  );  /* 绿色渐变蒙版 */
}

.completed-icon {
  width: 24px;
  height: 24px;
  background: #4caf50;  /* 绿色圆形 */
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
```

##### 事件监听
```typescript
onMounted(() => {
  // 加载默认数据（今天）
  loadTodosForDate(selectedDate.value)

  // 监听任务更新
  window.electron.ipcRenderer.on('tasks:updated', () => {
    loadTodosForDate(selectedDate.value)
  })

  // 监听日历选择日期
  window.electron.ipcRenderer.on('calendar:dateSelected', (_, dateStr) => {
    selectedDate.value = dateStr
    loadTodosForDate(dateStr)
  })
})
```

---

#### 5.4 应用快捷启动 (`AppsWidget.vue`)

##### 功能特性
- **应用管理**：
  - 添加应用（文件选择器选择.exe/.lnk/.app）
  - 显示应用网格（图标 + 名称）
  - 点击启动应用
  - 删除应用（悬停显示×按钮）
- **数据持久化**：使用 localStorage 保存应用列表
- **图标显示**：
  - 无图标：显示首字母（紫色渐变背景）
  - 有图标：显示应用图标

##### 应用启动
```typescript
// 选择应用
const addApp = async () => {
  const result = await window.electron.ipcRenderer.invoke('widget:selectApp')
  if (result && result.path) {
    apps.value.push({
      name: result.name,
      path: result.path,
      icon: result.icon
    })
    saveApps()
  }
}

// 启动应用（跨平台）
const launchApp = async (app: App) => {
  await window.electron.ipcRenderer.invoke('widget:launchApp', app.path)
}

// 主进程处理（index.ts）
ipcMain.handle('widget:launchApp', async (_, appPath: string) => {
  if (process.platform === 'win32') {
    await execAsync(`start "" "${appPath}"`, { shell: true })
  } else if (process.platform === 'darwin') {
    await execAsync(`open "${appPath}"`)
  } else {
    await execAsync(`xdg-open "${appPath}"`)
  }
})
```

##### UI布局
```css
/* 网格布局 */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 12px;
}

/* 添加按钮 - 虚线边框卡片 */
.add-item {
  border: 2px dashed rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.2);
  border-radius: 12px;
}

/* 应用图标占位符 */
.app-icon-placeholder {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-radius: 12px;
  font-size: 24px;
  color: white;
}
```

---

#### 5.5 快捷回复 (`QuickRepliesWidget.vue`)

##### 功能特性
- **回复管理**：
  - 添加快捷回复（文本输入框）
  - 显示回复列表
  - 点击复制到剪贴板
  - 删除回复（悬停显示×按钮）
- **数据持久化**：使用 localStorage 保存回复列表
- **快捷操作**：
  - Ctrl+Enter 提交
  - 一键复制
  - Naive UI Message 提示

##### 复制功能
```typescript
// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('Failed to copy:', error)
    message.error('复制失败')
  }
}
```

##### UI样式
```css
/* 添加按钮 - 矩形框 */
.add-item {
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.15);
  border: 2px dashed rgba(139, 92, 246, 0.5);
  border-radius: 6px;
}

/* 回复项 */
.reply-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-text {
  flex: 1;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-text:hover {
  background: rgba(139, 92, 246, 0.2);
}
```

---

#### 5.6 窗口交互系统

##### 拖拽功能
```typescript
// 所有小组件支持拖拽移动
// 拖拽区域：顶部30px隐藏区域

// 渲染进程（各小组件）
const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = e.screenX
  dragStartY.value = e.screenY

  // 获取当前窗口位置
  const [currentX, currentY] = await window.electron.ipcRenderer.invoke(
    'widget:getPosition',
    widgetType
  )
  windowStartX.value = currentX
  windowStartY.value = currentY
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = e.screenX - dragStartX.value
  const deltaY = e.screenY - dragStartY.value

  // 通知主进程移动窗口
  window.electron.ipcRenderer.invoke(
    'widget:setPosition',
    widgetType,
    windowStartX.value + deltaX,
    windowStartY.value + deltaY
  )
}
```

##### 磁性吸附功能
```typescript
// 主进程实现（index.ts）
const SNAP_THRESHOLD = 20        // 吸附阈值（像素）
const BREAK_THRESHOLD = 15       // 断开吸附阈值（像素）

// 检测并建立吸附关系
function checkAndSnap(movedType: string) {
  const movedWindow = getWidgetWindow(movedType)
  const movedBounds = movedWindow.getBounds()

  // 遍历其他小组件
  for (const otherType of widgetTypes) {
    const otherWindow = getWidgetWindow(otherType)
    const otherBounds = otherWindow.getBounds()

    const snapResult = shouldSnap(otherBounds, movedBounds)

    if (snapResult && snapResult.snap) {
      // 建立吸附关系
      snappedWidgets.get(otherType).push({
        type: movedType,
        offsetX: snapResult.offsetX,
        offsetY: snapResult.offsetY
      })

      // 调整位置使其精确吸附
      movedWindow.setPosition(snapX, snapY)
    }
  }
}

// 支持垂直和水平吸附
function shouldSnap(pos1, pos2) {
  // 1. 垂直吸附（下方）
  const bottomGap = pos2.y - (pos1.y + pos1.height)
  if (bottomGap >= 0 && bottomGap < SNAP_THRESHOLD) {
    return { snap: true, direction: 'bottom', ... }
  }

  // 2. 水平吸附（右侧/左侧）
  const rightGap = pos2.x - (pos1.x + pos1.width)
  if (rightGap >= 0 && rightGap < SNAP_THRESHOLD) {
    return { snap: true, direction: 'right', ... }
  }
}
```

##### 调整大小功能
```typescript
// 8个调整手柄（4边 + 4角）
const resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

// 最小尺寸限制
const MIN_WIDTH = 150
const MIN_HEIGHT = 100

// 渲染进程处理调整大小
const onResize = (e: MouseEvent, handle: string) => {
  const deltaX = e.screenX - resizeStartX.value
  const deltaY = e.screenY - resizeStartY.value

  let newWidth = originalWidth.value
  let newHeight = originalHeight.value
  let newX = originalX.value
  let newY = originalY.value

  // 根据手柄方向计算新尺寸和位置
  if (handle.includes('e')) newWidth += deltaX
  if (handle.includes('w')) { newWidth -= deltaX; newX += deltaX }
  if (handle.includes('s')) newHeight += deltaY
  if (handle.includes('n')) { newHeight -= deltaY; newY += deltaY }

  // 应用最小尺寸限制
  newWidth = Math.max(newWidth, MIN_WIDTH)
  newHeight = Math.max(newHeight, MIN_HEIGHT)

  // 通知主进程更新窗口
  window.electron.ipcRenderer.invoke(
    'widget:setBounds',
    widgetType,
    newX, newY, newWidth, newHeight
  )
}
```

---

#### 5.7 数据同步机制

##### 事件广播系统
```typescript
// 主进程（index.ts）
function broadcastTasksUpdate() {
  // 广播到主窗口
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('tasks:updated')
  }

  // 广播到日历窗口
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.webContents.send('tasks:updated')
  }

  // 广播到待办窗口
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.webContents.send('tasks:updated')
  }
}

// 保存排单时自动广播
ipcMain.handle('scheduler:saveScheduledTasks', async (_, tasks) => {
  // ... 保存逻辑 ...
  await db.write()

  // 广播更新事件
  broadcastTasksUpdate()
  return true
})
```

##### 主程序监听更新
```typescript
// App.vue
onMounted(() => {
  store.init()

  // 监听小组件的任务更新事件
  window.electron.ipcRenderer.on('tasks:updated', () => {
    console.log('[App] 收到 tasks:updated 事件，刷新数据...')
    store.init()  // 刷新所有数据
  })
})
```

##### 完整同步流程
```
1. 小组件中修改任务状态
   ↓
2. 调用 scheduler:saveScheduledTasks 保存到数据库
   ↓
3. 主进程保存成功后广播 tasks:updated 事件
   ↓
4. 主程序收到事件 → 调用 store.init() 刷新
5. 日历小组件收到事件 → 调用 loadTasks() 刷新
6. 待办小组件收到事件 → 调用 loadTodosForDate() 刷新
   ↓
7. 所有界面自动更新，无需手动刷新
```

---

#### 5.8 小组件样式系统

##### 通用样式规范
```css
/* 所有小组件共享样式 */
.widget-container {
  width: 100%;
  height: 100%;
  padding: 16px;
  background: rgba(26, 26, 26, 0.95);  /* 半透明黑色 */
  backdrop-filter: blur(20px);         /* 毛玻璃效果 */
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

/* 拖拽区域（隐藏，顶部30px） */
.drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  cursor: move;
  -webkit-app-region: drag;
}

/* 双击右键关闭 */
.widget-container {
  /* 500ms内双击右键 → 关闭窗口 */
}
```

##### 调整手柄样式
```css
/* 8个方向的调整手柄 */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
}

.resize-handle-n, .resize-handle-s {
  height: 8px;
  left: 8px;
  right: 8px;
  cursor: ns-resize;
}

.resize-handle-e, .resize-handle-w {
  width: 8px;
  top: 8px;
  bottom: 8px;
  cursor: ew-resize;
}

/* 角手柄 */
.resize-handle-ne { cursor: nesw-resize; }
.resize-handle-nw { cursor: nwse-resize; }
.resize-handle-se { cursor: nwse-resize; }
.resize-handle-sw { cursor: nesw-resize; }

/* 调整大小时高亮 */
.resizing .resize-handle {
  background: rgba(139, 92, 246, 0.3);
}
```

---

#### 5.9 关键IPC接口

```typescript
// 小组件管理
'widget:toggle'              // 打开所有小组件
'widget:returnToMain'        // 返回主程序
'widget:closeApp'           // 关闭应用
'widget:minimizeAll'        // 最小化所有
'widget:toggleWidget'       // 切换单个小组件
'widget:getStates'          // 获取所有状态

// 窗口操作
'widget:getPosition'        // 获取窗口位置
'widget:setPosition'        // 设置窗口位置
'widget:getSize'            // 获取窗口大小
'widget:setSize'            // 设置窗口大小
'widget:setBounds'          // 设置位置和大小

// 日期选择
'widget:selectDate'         // 日历选中日期

// 应用启动
'widget:selectApp'          // 选择应用文件
'widget:launchApp'          // 启动应用

// 事件广播（主进程 → 渲染进程）
'tasks:updated'             // 任务数据更新
'calendar:dateSelected'     // 日历选择日期
'widget:stateChanged'       // 小组件状态变化
```

---

#### 5.10 小组件技术要点

##### 无边框窗口拖拽
- 使用 JavaScript 手动实现拖拽（而非 `-webkit-app-region: drag`）
- 通过 IPC 控制窗口位置
- 避免透明窗口的原生拖拽问题

##### 透明背景与毛玻璃
```typescript
// 窗口配置
{
  frame: false,
  transparent: true,
  backgroundColor: '#00000000'
}

// CSS实现毛玻璃
backdrop-filter: blur(20px);
background: rgba(26, 26, 26, 0.95);
```

##### 磁性吸附算法
- 深度优先搜索构建磁吸组关系
- 只允许最高组件拖动整个磁吸组
- 非顶端组件拖动超过15px阈值后断开吸附
- 只吸附最近的边缘（避免多边缘抖动）

##### 数据持久化策略
- 应用列表、快捷回复：localStorage（小组件独立数据）
- 排单任务、Commission：LowDB（与主程序共享）
- 完成状态：保存在 ScheduledTask.status 字段

---

## 💾 数据库结构

### 存储位置
- 开发: `berrydone-test.json`
- 生产: `%APPDATA%\berrydone\berrydone.json`

### 核心数据模型

#### VGenCommission（委托）
```typescript
interface VGenCommission {
  id: string                     // 唯一标识
  commissionID: string           // VGen ID
  serviceID: string              // 服务ID
  clientName: string
  projectName: string
  serviceName: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'DRAFT'
  paymentStatus: 'PAID' | 'UNPAID'
  startDate: string
  dueDate?: string
  completedDate?: string
  totalCost: number
  currency: string
  notes: string
}
```

#### ScheduledTask（排单任务）
```typescript
interface ScheduledTask {
  commissionId: string
  startDate: string
  endDate: string
  workDays: string[]                       // 工作日列表
  hoursPerDay: Record<string, number>      // 每日工时分配
  totalHours: number
  isLocked: boolean
  priorityScore: number                    // 0-100

  // 扩展属性（用于UI定位）
  startHour?: number        // 开始小时（0-23）
  displayTop?: number       // 显示位置（百分比）
  displayHeight?: number    // 显示高度（百分比）
}
```

#### SchedulerConfig（排单配置）
```typescript
interface SchedulerConfig {
  workHoursPerDay: Record<string, number>  // 每日工时
  restDays: string[]                       // 休息日（YYYY-MM-DD）
  defaultWorkHours: number                 // 默认8小时
  weekendRest: boolean
}
```

---

## 🔧 关键技术要点

### IPC通信（Preload层）
```typescript
window.api.db = {
  getVGenCommissions: () => Promise<VGenCommission[]>
  getVGenServices: () => Promise<VGenService[]>
  updateVGenServiceWorkHours: (id, hours) => Promise<void>
  getWorkHoursConfig: () => Promise<WorkHoursConfig>
  saveWorkHoursConfig: (config) => Promise<void>
}

window.api.scheduler = {
  getConfig: () => Promise<SchedulerConfig>
  saveConfig: (config) => Promise<void>
  getScheduledTasks: () => Promise<ScheduledTask[]>
  saveScheduledTasks: (tasks) => Promise<void>
}
```

### VGen数据抓取
```typescript
// 流程
1. 读取cookies/cookies.json
2. 启动Playwright浏览器（headless）
3. 访问VGen commissions页面
4. 提取window.__NEXT_DATA__或拦截API响应
5. 保存到数据库

// 自动更新
- 每天23:30自动运行（VGenUpdater）
- 支持手动触发更新
```

### UI配色规范
```css
/* 主色调 */
--primary: #8B5CF6    /* 紫色 - 主要交互 */
--secondary: #54C5B7  /* 青色 - 次要强调 */
--warning: #F59E0B    /* 橙色 - 警告 */
--success: #10B981    /* 绿色 - 成功 */

/* 背景色 */
--bg-primary: #0a0a0a
--bg-secondary: #1a1a1a
--bg-tertiary: #1e1e1e
```

---

## 🐛 常见问题

### 1. Cookie过期导致抓取失败
```
Error: Failed to fetch VGen data: 401 Unauthorized
```
**解决**: 使用EditThisCookie扩展导出新cookies到`cookies/cookies.json`

### 2. 数据库序列化错误
```
Error: An object could not be cloned
```
**原因**: Vue响应式对象（Proxy）无法被IPC序列化

**解决**:
```typescript
// ❌ 错误
await window.api.db.save(reactiveObject)

// ✅ 正确
await window.api.db.save(JSON.parse(JSON.stringify(reactiveObject)))
```

### 3. 排单任务不显示
**检查清单**:
1. 是否运行了排单算法
2. 服务是否设置了工时
3. 任务是否在当前显示周期内
4. 检查`scheduledTasks.value`是否有数据

### 4. 休息日未生效
**调试**:
```typescript
const config = await window.api.scheduler.getConfig()
console.log('Rest days:', config.restDays)
console.log('Date format must be YYYY-MM-DD')
```

### 5. Timeline缩放不工作
**原因**: 事件监听器未正确绑定

**解决**:
```typescript
onMounted(async () => {
  await nextTick()
  const calendar = document.querySelector('.scheduler-calendar-view')
  if (calendar) {
    calendar.addEventListener('wheel', handleWheel, {
      passive: false  // 必须设置为false
    })
  }
})
```

---

## 📝 开发规范

### 代码风格
- **组件**: PascalCase (`TaskCard.vue`)
- **函数**: camelCase (`handleClick`)
- **类型**: PascalCase (`VGenCommission`)
- **CSS类**: kebab-case (`task-card`)

### Git提交
```bash
feat: 添加智能排单系统
fix: 修复休息日保存错误
docs: 更新README
style: 调整卡片间距
refactor: 重构排单算法
```

### 调试技巧
```typescript
// 主进程（终端）
console.log('[Main] Database state:', db.data)

// 渲染进程（DevTools）
console.log('[Timeline] Scheduled tasks:', scheduledTasks.value)
console.log('[Scheduler] Current config:', config)
```

---

## 🔐 安全要点

- **Cookie管理**: `cookies/cookies.json`（已.gitignore）
- **本地存储**: 所有数据仅存储在本地
- **IPC安全**: Context Isolation启用，仅暴露必要API
- **权限控制**: Preload脚本限制渲染进程权限

---

## 🔄 当前版本

### v1.2.0 (2024-11-27) - 生产就绪
**Timeline优化**:
- 重构排单算法为逐日填充策略（Bin Packing）
- 修复子任务天数计算（Set去重）
- 优化排单表格布局（8px内边距）

**Dashboard优化**:
- 修复月度收入趋势图高度显示
- 自动导航到当前年月
- 动态年份选项

**已知问题**:
1. Timeline卡片拖动存在性能卡顿
2. 2K显示器DPI缩放问题（建议100%或200%）

---

## 📞 项目信息

**维护者**: BerryDone Team
**许可证**: MIT License
**状态**: ✅ 生产就绪

---

**享受你的Commission管理之旅！** 🎉🍓
