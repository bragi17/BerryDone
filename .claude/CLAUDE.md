# 🍓 BerryDone Project Memory

**项目名称**: BerryDone - VGen Commissions Timeline Manager
**版本**: 1.2.0
**创建日期**: 2024-11
**最后更新**: 2024-11-27

---

## 📋 项目概述

### 项目定位
BerryDone 是一个专为 VGen 创作者设计的桌面应用，用于管理和可视化艺术委托（Commissions）工作流。它通过自动化数据抓取、智能时间线排单和可视化统计，帮助创作者高效管理多个委托项目。

### 核心价值
1. **自动化数据同步**: 从 VGen 平台自动抓取委托数据，无需手动录入
2. **智能时间管理**: AI 驱动的智能排单算法，自动安排工作日程
3. **可视化工作流**: 多视图展示项目进度和收入统计
4. **离线优先**: 本地数据库存储，支持离线工作

### 主要用户场景
- 查看所有委托的日历视图和状态分布
- 使用智能排单系统规划未来工作安排
- 追踪收入、完成率和项目趋势
- 管理服务列表和预估工时配置
- 设置休息日和工作时间偏好

---

## 🏗️ 技术架构

### 技术栈

#### 前端框架
- **Vue 3.5.21** - 采用 Composition API 和 `<script setup>` 语法
- **TypeScript 5.9.2** - 完整类型安全
- **Naive UI 2.43.2** - UI 组件库（深色主题）
- **Vue Router 4.6.3** - 页面路由管理
- **@vicons/ionicons5** - 图标库

#### 桌面应用
- **Electron 38.1.2** - 跨平台桌面应用框架
- **Electron Vite 4.0.1** - 开发构建工具
- **Electron Builder 25.1.8** - 应用打包工具

#### 数据存储
- **LowDB 7.0.1** - JSON 文件数据库
- 数据文件位置: `%APPDATA%\berrydone\berrydone.json`

#### 自动化工具
- **Playwright 1.56.1** - 浏览器自动化（抓取 VGen 数据）
- **tsx** - TypeScript 脚本执行器

### 项目结构

```
BerryDone/
├── .claude/                    # Claude 项目记忆文件
│   └── CLAUDE.md              # 本文件
├── src/
│   ├── main/                  # Electron 主进程（Node.js环境）
│   │   ├── index.ts          # 应用入口，注册IPC处理器
│   │   ├── db.ts             # LowDB 数据库管理
│   │   ├── vgen.ts           # VGen API 集成
│   │   ├── vgen-updater.ts   # 定时更新任务
│   │   └── types/            # 类型定义
│   │       ├── scheduler.ts  # 排单系统类型
│   │       ├── vgen.ts       # VGen Commission 类型
│   │       └── vgen-service.ts # VGen Service 类型
│   ├── preload/               # Preload 脚本（桥接层）
│   │   ├── index.ts          # 主preload入口
│   │   ├── db.ts             # 数据库API暴露
│   │   ├── vgen.ts           # VGen API暴露
│   │   └── scheduler.ts      # 排单API暴露
│   └── renderer/              # Vue 前端（浏览器环境）
│       └── src/
│           ├── main.ts       # Vue应用入口
│           ├── App.vue       # 根组件
│           ├── router/       # 路由配置
│           ├── store/        # 全局状态管理
│           ├── views/        # 页面组件
│           │   ├── Home.vue        # 日历视图
│           │   ├── Timeline.vue    # 时间线与智能排单
│           │   ├── Commissions.vue # 服务列表与工时配置
│           │   └── Dashboard.vue   # 数据统计面板
│           ├── components/   # 可复用组件
│           │   ├── Sidebar.vue      # 侧边栏导航
│           │   ├── TaskCard.vue     # 任务卡片
│           │   ├── TaskDialog.vue   # 任务编辑对话框
│           │   └── InitialSetup.vue # 初始化向导
│           ├── utils/        # 工具函数
│           │   ├── scheduler.ts   # 智能排单算法
│           │   ├── dateUtils.ts   # 日期处理工具
│           │   └── sampleData.ts  # 示例数据
│           └── types/        # 前端类型定义
│               └── scheduler.ts
├── scripts/                   # 工具脚本
│   ├── fetch-vgen-browser.ts      # Playwright自动化抓取
│   ├── fetch-vgen-services.ts     # 抓取服务列表
│   ├── import-vgen-commissions.ts # 导入委托数据
│   └── import-vgen-services.ts    # 导入服务数据
├── cookies/                   # VGen Cookie存储（.gitignore）
├── docs/                      # 项目文档
├── build/                     # 构建配置
├── resources/                 # 应用资源（图标等）
└── out/                       # 构建输出

```

---

## 🎯 核心功能模块

### 1. Home - 日历视图 (`Home.vue`)

#### 功能特性
- 月历形式展示所有 commissions
- 每日显示 Ready、WIP、Completed 数量统计（紧凑布局）
- 彩色圆点指示器（最多显示3个）
- 右键点击日期设置/取消休息日
- 左键点击日期打开高级设置面板
- 周末默认标记为休息日（🌙图标）
- 月份导航（上月/下月/今天）
- 本月统计面板（收入、项目数量、完成率）
- **工时管理系统**（新增）：
  - 默认每日工时设置按钮（显示当前值）
  - 每日工时徽章显示（右上角）
  - 自定义工时用青色标识，默认工时用紫色标识

#### 工时管理功能（v1.2.0新增）

##### 默认工时设置
- 顶部按钮显示当前默认工时（如"默认工时: 8h"）
- 点击打开设置模态框：
  - 快速选择按钮（4h、6h、8h、10h、12h）
  - 手动输入，支持0.5小时精度
  - 自动四舍五入到最近的0.5小时
  - 友好提示最小单位说明

##### 单日工时设置
- 点击任意日期打开综合设置面板
- **紧凑布局设计**（一行式休息日切换）：
  - 日期类型切换：💼工作日 / 🌙休息日
  - 工时设置：默认模式 / 自定义模式
  - 快捷按钮：2h、4h、6h、8h、10h
  - 手动输入with自动修正
- **排单任务预览**：
  - 显示当日已排单的任务（而非原始数据）
  - 任务名称 + 分配工时
  - 使用commission状态对应颜色

#### 布局优化（v1.2.0）
```css
/* 自适应视口设计 */
- 整体页面：overflow: hidden（禁止滚动）
- 日历容器：flex: 1（自动填充剩余空间）
- 日历网格：内置精细滚动条（仅在需要时显示）
- 日期格子：80px高度（原90px）
- 各元素间距和内边距优化
- 统计面板紧凑设计
```

#### 关键实现
```typescript
// 休息日管理
- 默认周六周日为休息日
- 支持右键直接切换休息日状态
- 休息日配置保存到 schedulerState.config.restDays
- 加载时检查当前月份日期，自动初始化

// 工时配置（新增）
- workHoursPerDay: Record<string, number> // 每日自定义工时映射
- defaultWorkHours: number // 全局默认工时（8小时）
- 与Timeline排单系统共享配置
- 序列化保存到数据库

// 数据统计
- 每日统计：计算日期范围内的 commission 状态
- 月度统计：汇总当前月份的总体数据
- 状态映射：COMPLETED/IN_PROGRESS/PENDING/DRAFT
- 加载排单任务：显示智能排单结果而非原始数据
```

#### 注意事项
- 不允许修改其他月份的日期（`isOtherMonth` 检查）
- 休息日配置需要序列化处理（移除 Vue Proxy）
- 与智能排单系统共享 `restDays` 和 `workHoursPerDay` 配置
- 工时输入自动修正为0.5的倍数
- 显示排单任务需要先加载 `scheduledTasks`

---

### 2. Timeline - 时间线与智能排单 (`Timeline.vue`)

#### 双页签设计
1. **智能排单页签** - AI 驱动的自动排单系统
2. **原始数据页签** - 可视化编辑的项目时间线

#### 智能排单系统

##### 核心算法 (`utils/scheduler.ts`)
```typescript
// 排单流程
1. 筛选待排单 commissions（IN_PROGRESS/PENDING）
2. 计算优先级分数（基于截止日期、状态、付款状态）
3. 按优先级排序
4. 从今日开始，逐个分配工作日
5. 跳过休息日和周末（如果启用）
6. 根据每日工时限制分配

// 优先级权重
- dueDate: 临近截止日期优先（权重：1）
- status: IN_PROGRESS > PENDING（权重：1）
- payment: PAID > UNPAID（权重：1）
- manual: 手动调整优先级（权重：0，预留功能）

// 工时计算优先级
1. commission.estimatedWorkHours（最高）
2. serviceOverrides[serviceID]
3. categoryDefaults[category]
4. globalDefault（默认8小时）
```

##### UI 设计特点
- **时间线网格布局**：
  - 左侧固定：时段标签列（80px宽）
  - 右侧滚动：日期头部 + 任务网格
  - 24小时分为12个2小时时段
  - 自适应高度（flex: 1）

- **视图模式**：
  - **按周显示**：7天自适应宽度，flex布局均分
  - **按月显示**：固定宽度（120px/天），支持横向滚动，自动居中到今日

- **缩放功能**：
  - Ctrl + 鼠标滚轮缩放
  - 以鼠标位置为中心
  - 范围：60px - 300px/天

- **任务卡片**：
  - 位置：基于 startDate 和 endDate 计算
  - 高度：基于总工时和工作天数估算
  - 默认起始时间：上午9点
  - 显示：客户名、项目名、总工时、工作天数
  - 状态颜色：根据 commission 状态显示渐变背景
    - COMPLETED: 青色渐变 (#54C5B7)
    - IN_PROGRESS: 蓝色渐变 (#3B82F6)
    - PENDING: 橙色渐变 (#F59E0B)
    - DRAFT: 灰色渐变 (#9CA3AF)

##### 交互功能
- **卡片拖动（调整日期）**：
  - 鼠标按住卡片拖动，左右移动调整任务日期
  - 实时显示日期变化
  - 拖动时卡片高亮显示（橙色边框）
  - 支持跨日期拖动，保持任务时长不变

- **卡片拉伸（调整工时）**：
  - 上下边缘显示拉伸手柄（悬停时可见）
  - 垂直拖动调整任务总工时
  - 以1小时为单位调整
  - 最小工时：1小时

- **修改管理**：
  - 首次交互时自动备份原始数据
  - 修改后的卡片显示橙色高亮状态
  - 保存按钮：将所有修改同步到数据库
  - 取消按钮：恢复所有修改到原始状态
  - 修改会更新对应服务的预估工时

- **卡片点击**：
  - 点击卡片打开详情对话框
  - 可编辑预估工时
  - 显示客户名、服务名、日期范围、工作天数
  - 拖动操作不会触发点击（防止误操作）

##### 配置选项
```typescript
interface SchedulerConfig {
  workHoursPerDay: Record<string, number>  // 每日工时配置
  restDays: string[]                       // 休息日列表（YYYY-MM-DD）
  defaultWorkHours: number                 // 默认每日工时（8小时）
  weekendRest: boolean                     // 是否周末休息
}
```

#### 原始数据页签

##### 功能特性
- 横向时间轴视图
- 项目条形图（彩色，基于状态）
  - 状态颜色渐变：
    - COMPLETED: 青色渐变 (#54C5B7)
    - IN_PROGRESS: 蓝色渐变 (#3B82F6)
    - PENDING: 橙色渐变 (#F59E0B)
    - DRAFT: 灰色渐变 (#9CA3AF)
- 支付状态标签（PAID/UNPAID）
  - PAID: 绿色标签
  - UNPAID: 橙色标签
- 搜索和状态筛选
- 月份导航
- 点击卡片查看详情（只读）

##### 交互设计
- 点击任务卡片：打开详情对话框（只读模式）
  - 基本信息：客户名、项目名、服务名
  - 状态信息：项目状态、支付状态（带颜色标签）
  - 日期信息：开始日期、结束日期、截止日期、完成日期
  - 价格信息：总金额（带货币符号）
  - 备注信息：显示完整备注内容
- 滚轮缩放：Ctrl + 滚轮调整日宽度（40-200px）
- 卡片悬停效果：轻微抬起和阴影

---

### 3. Commissions - 服务列表 (`Commissions.vue`)

#### 功能特性
- 显示所有 VGen 服务（按分类分组）
- 设置每个服务的预估工时
- 批量工时设置（全局/按分类）
- 服务状态筛选（开放/关闭）
- 已下单服务高亮提示
- 快捷工时按钮（2h/4h/8h）
- 自动检测缺少工时的已下单服务

#### 工时配置系统
```typescript
// 三级配置体系
1. 全局默认工时：应用于所有未设置的服务
2. 分类默认工时：覆盖全局设置，应用于特定分类
3. 单个服务工时：最高优先级，精确控制

// 配置保存位置
workHoursConfig: {
  globalDefault: 8,
  categoryDefaults: { "Illustration": 12, "Animation": 20 },
  serviceOverrides: { "service-id-1": 16, "service-id-2": 4 }
}
```

#### 数据更新
- 手动更新：点击"更新数据"按钮
- 自动更新：每天 23:30 自动抓取（`VGenUpdater`）
- 进度显示：实时显示更新进度和消息

#### 已下单检测
```typescript
// 匹配逻辑
1. 优先使用 serviceID 精确匹配
2. Fallback 到服务名称模糊匹配
3. 标记未设置工时的已下单服务（⚠️警告样式）
```

---

### 4. Dashboard - 数据统计 (`Dashboard.vue`)

#### 功能特性
- 本月收入统计（总收入、订单数、平均单价）
- 项目状态分布（饼图）
- 收入趋势图表（近6个月）
- 最近完成项目列表
- 实时数据刷新

#### 数据指标
```typescript
// 收入统计
- 总收入：已付款 commissions 总额
- 订单数：已完成的 commissions 数量
- 平均单价：总收入 / 订单数
- 完成率：已完成 / 总数

// 状态分布
- Completed: 已完成
- In Progress: 进行中
- Pending: 待处理
- Draft: 草稿

// 趋势分析
- 按月统计收入
- 按月统计完成数量
- 图表可视化（Naive UI Charts）
```

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
- 开发环境: `berrydone-test.json`（项目根目录）
- 生产环境: `%APPDATA%\berrydone\berrydone.json`

### 数据模型

#### Tasks（任务）
```typescript
interface Task {
  id: string                 // 唯一标识
  title: string             // 任务标题
  startDate: string         // 开始日期（YYYY-MM-DD）
  endDate: string           // 结束日期（YYYY-MM-DD）
  progress: number          // 进度（0-100）
  status: 'new' | 'ready' | 'wip' | 'completed' | 'waitlist' | 'pending'
  color: string             // 颜色代码
  projectId: string         // 所属项目ID
}
```

#### Projects（项目）
```typescript
interface Project {
  id: string                // 唯一标识
  name: string              // 项目名称
  color: string             // 颜色代码
  icon: string              // emoji 图标
}
```

#### VGenCommissions（VGen委托）
```typescript
interface VGenCommission {
  id: string                     // 唯一标识
  commissionID: string           // VGen Commission ID
  serviceID: string              // VGen Service ID
  clientName: string             // 客户名称
  clientEmail: string            // 客户邮箱
  projectName: string            // 项目名称
  serviceName: string            // 服务名称
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'DRAFT' | 'CANCELLED' | 'REJECTED'
  paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED' | 'PARTIALLY_PAID'
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  startDate: string              // 开始日期（ISO格式）
  estimatedStartDate?: string    // 预计开始日期
  dueDate?: string               // 截止日期
  completedDate?: string         // 完成日期
  totalCost: number              // 总金额
  currency: string               // 货币类型（USD/EUR等）
  clientSocials: {               // 客户社交媒体
    discord?: string
    twitter?: string
    instagram?: string
    twitch?: string
    youtube?: string
  }
  notes: string                  // 备注
  isArchived: boolean            // 是否归档
  projectId: string              // 所属项目ID（通常是 'vgen'）
  _raw: any                      // 原始VGen数据（完整备份）
}
```

#### VGenServices（VGen服务）
```typescript
interface VGenService {
  id: string                     // 唯一标识
  serviceId: string              // VGen Service ID
  title: string                  // 服务标题
  description: string            // 服务描述
  category: string               // 服务分类
  price: {                       // 价格信息
    from: number                 // 起始价格
    currency: string             // 货币类型
  }
  imageUrl?: string              // 封面图URL
  isOpen: boolean                // 是否开放接单
  deliveryTime?: string          // 交付时间说明
  slots?: {                      // 名额信息
    total: number                // 总名额
    available: number            // 可用名额
  }
  estimatedWorkHours?: number    // 预估工时（小时）
  tags?: string[]                // 标签列表
}
```

#### WorkHoursConfig（工时配置）
```typescript
interface WorkHoursConfig {
  globalDefault: number                    // 全局默认工时
  categoryDefaults: Record<string, number> // 分类默认工时
  serviceOverrides: Record<string, number> // 服务特定工时
}
```

#### SchedulerState（排单状态）
```typescript
interface SchedulerState {
  config: SchedulerConfig                  // 排单配置
  scheduledTasks: ScheduledTask[]          // 已排单任务
}

interface SchedulerConfig {
  workHoursPerDay: Record<string, number>  // 每日工时映射
  restDays: string[]                       // 休息日列表
  defaultWorkHours: number                 // 默认每日工时（8）
  weekendRest: boolean                     // 是否周末休息
}

interface ScheduledTask {
  commissionId: string                     // 关联的Commission ID
  startDate: string                        // 排单开始日期
  endDate: string                          // 排单结束日期
  workDays: string[]                       // 工作日列表
  hoursPerDay: Record<string, number>      // 每日工时分配
  totalHours: number                       // 总工时
  isLocked: boolean                        // 是否锁定（手动调整）
  priorityScore: number                    // 优先级分数（100为最高）
}
```

### 数据库操作

#### 主进程（`src/main/db.ts`）
```typescript
// 初始化数据库
export async function initDB(): Promise<void>

// 获取数据库实例
export function getDB(): LowSync<Database>

// CRUD 操作（示例）
// 由 IPC handlers 调用，不直接暴露给渲染进程
```

#### Preload层（`src/preload/db.ts`）
```typescript
// 暴露安全的API给渲染进程
window.api.db = {
  // Tasks
  getTasks: () => Promise<Task[]>
  addTask: (task) => Promise<Task>
  updateTask: (id, updates) => Promise<void>
  deleteTask: (id) => Promise<void>

  // VGen Commissions
  getVGenCommissions: () => Promise<VGenCommission[]>
  updateVGenCommissionStatus: (id, status) => Promise<void>

  // VGen Services
  getVGenServices: () => Promise<VGenService[]>
  updateVGenServiceWorkHours: (id, hours) => Promise<void>

  // Configurations
  getWorkHoursConfig: () => Promise<WorkHoursConfig>
  saveWorkHoursConfig: (config) => Promise<void>
}
```

---

## 🔧 关键文件详解

### 主进程核心文件

#### `src/main/index.ts`
**职责**: Electron应用主入口，负责创建窗口和注册所有IPC处理器

**关键函数**:
- `createWindow()`: 创建主窗口（1600x1000，最小1400x900）
- `registerDBHandlers()`: 注册数据库相关IPC
- `registerVGenHandlers()`: 注册VGen相关IPC
- `registerSchedulerHandlers()`: 注册排单相关IPC

**窗口配置**:
```typescript
{
  width: 1600,
  height: 1000,
  minWidth: 1400,
  minHeight: 900,
  autoHideMenuBar: true,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false  // 需要访问Node.js API
  }
}
```

#### `src/main/db.ts`
**职责**: LowDB数据库封装，提供统一的数据访问接口

**关键函数**:
- `initDB()`: 初始化数据库，创建默认结构
- `getDB()`: 获取数据库实例
- 各种CRUD方法（通过IPC调用）

**数据迁移**:
```typescript
// 如果检测到旧版本数据结构，自动迁移
if (!db.data.workHoursConfig) {
  db.data.workHoursConfig = { /* defaults */ }
  await db.write()
}
```

#### `src/main/vgen.ts`
**职责**: VGen API集成，处理数据抓取和保存

**关键函数**:
- `fetchVGenCommissions(cookies)`: 使用Playwright抓取Commissions
- `fetchVGenServices(cookies)`: 抓取Services列表
- `saveVGenData(data)`: 保存到数据库

**抓取流程**:
```typescript
1. 读取cookies文件
2. 启动Playwright浏览器（headless模式）
3. 设置cookies
4. 访问VGen页面
5. 等待数据加载（最多30秒）
6. 提取数据（从window对象或API响应）
7. 清理和转换数据格式
8. 保存到数据库
```

#### `src/main/vgen-updater.ts`
**职责**: 定时任务管理器，自动更新VGen数据

**特性**:
- 每天23:30自动运行更新
- 使用node-cron实现
- 支持手动触发更新
- 发送更新进度到渲染进程

```typescript
class VGenUpdater {
  start(): void          // 启动定时任务
  stop(): void           // 停止定时任务
  runUpdate(): Promise   // 手动执行更新
}
```

---

### 前端核心文件

#### `src/renderer/src/App.vue`
**职责**: 应用根组件，包含侧边栏和路由视图

**布局**:
```vue
<div class="app-container">
  <Sidebar />  <!-- 左侧导航 -->
  <div class="main-content">
    <router-view />  <!-- 页面内容 -->
  </div>
</div>
```

#### `src/renderer/src/router/index.ts`
**职责**: Vue Router配置

**路由表**:
```typescript
[
  { path: '/', redirect: '/home' },
  { path: '/home', component: Home },
  { path: '/timeline', component: Timeline },
  { path: '/commissions', component: Commissions },
  { path: '/dashboard', component: Dashboard }
]
```

#### `src/renderer/src/store/index.ts`
**职责**: 全局状态管理（Composition API风格）

**状态**:
```typescript
const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const currentProject = ref<Project | null>(null)

// 方法
async function init(): Promise<void>
async function addTask(task): Promise<void>
async function updateTask(id, updates): Promise<void>
async function deleteTask(id): Promise<void>
```

#### `src/renderer/src/utils/scheduler.ts`
**职责**: 智能排单核心算法

**主要函数**:
```typescript
// 执行排单
export function scheduleCommissions(
  commissions: VGenCommission[],
  config: SchedulerConfig,
  options: ScheduleOptions,
  workHoursConfig?: WorkHoursConfig
): ScheduledTask[]

// 计算优先级
function calculatePriority(
  commission: VGenCommission,
  options: ScheduleOptions
): number

// 获取工时
export function getCommissionWorkHours(
  commission: VGenCommission,
  workHoursConfig?: WorkHoursConfig
): number
```

**算法步骤**:
1. 筛选待排单的commissions
2. 计算优先级分数（0-100）
3. 按优先级排序
4. 从起始日期开始分配工作日
5. 考虑每日工时限制和休息日
6. 生成ScheduledTask对象

---

### 工具脚本

#### `scripts/fetch-vgen-browser.ts`
**职责**: 使用Playwright自动化抓取VGen数据

**使用方法**:
```bash
pnpm vgen:browser
```

**流程**:
1. 读取 `cookies/fur31mu.json`
2. 启动Chrome浏览器（headless）
3. 访问VGen的commissions页面
4. 等待React渲染完成
5. 提取 `window.__NEXT_DATA__` 或拦截API响应
6. 保存到 `vgen-commissions-data.json`

#### `scripts/fetch-vgen-services.ts`
**职责**: 抓取用户的服务列表

**使用方法**:
```bash
pnpm vgen:services
```

#### `scripts/import-vgen-commissions.ts`
**职责**: 导入抓取的数据到数据库

**使用方法**:
```bash
pnpm vgen:import
```

**处理逻辑**:
- 读取JSON文件
- 数据清洗和转换
- 去重（基于commissionID）
- 保存到 `berrydone-test.json`

#### `scripts/import-vgen-services.ts`
**职责**: 导入服务列表到数据库

---

## 🎨 UI/UX 设计规范

### 配色方案（深色主题）

#### 主色调
```css
--primary: #8B5CF6       /* 紫色 - 主要交互元素 */
--secondary: #54C5B7     /* 青色 - 次要强调 */
--accent: #EC4899        /* 粉色 - 高亮和渐变 */
--warning: #F59E0B       /* 橙色 - 警告和休息日 */
--success: #10B981       /* 绿色 - 成功和已付款 */
--error: #EF4444         /* 红色 - 错误和删除 */
```

#### 背景色
```css
--bg-primary: #0a0a0a    /* 主背景 */
--bg-secondary: #1a1a1a  /* 卡片背景 */
--bg-tertiary: #1e1e1e   /* 容器背景 */
--bg-hover: #2a2a2a      /* 悬停背景 */
```

#### 文字颜色
```css
--text-primary: #e0e0e0  /* 主要文字 */
--text-secondary: #aaa   /* 次要文字 */
--text-tertiary: #888    /* 辅助文字 */
--text-disabled: #666    /* 禁用文字 */
```

### 组件样式约定

#### 卡片样式
```css
.card {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #2a2a2a;
  transition: all 0.3s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border-color: #8B5CF6;
}
```

#### 按钮样式
- **Primary**: 紫色渐变背景
- **Secondary**: 透明背景，紫色边框
- **Quaternary**: 透明背景，无边框（用于图标按钮）

#### 状态指示器
```typescript
// Commission状态颜色
COMPLETED: '#54C5B7'    // 青色
IN_PROGRESS: '#3B82F6'  // 蓝色
PENDING: '#F59E0B'      // 橙色
DRAFT: '#9CA3AF'        // 灰色

// 支付状态颜色
PAID: '#10B981'         // 绿色
UNPAID: '#F59E0B'       // 橙色
```

### 动画效果

#### 过渡动画
```css
transition: all 0.2s ease;          /* 快速交互 */
transition: all 0.3s cubic-bezier;  /* 平滑展开 */
```

#### 悬停效果
- `transform: translateY(-2px)` - 卡片抬起
- `box-shadow` 变化 - 增加阴影深度
- 边框颜色变化 - 突出交互区域

#### 加载状态
- Naive UI 的 `<n-spin>` 组件
- 进度条：`<n-progress>`
- 骨架屏（预留）

---

## 🔐 安全与隐私

### Cookie管理
- **存储位置**: `cookies/fur31mu.json`（.gitignore已忽略）
- **格式**: EditThisCookie扩展导出的JSON
- **有效期**: 需要定期更新（建议每周）
- **权限**: 仅主进程可访问，渲染进程无法读取

### 数据隐私
- **本地存储**: 所有数据存储在本地，不上传云端
- **敏感信息**: 客户邮箱和社交媒体信息仅本地保存
- **备份建议**: 定期备份 `berrydone.json` 文件

### IPC安全
- **Context Isolation**: 启用上下文隔离
- **Preload脚本**: 仅暴露必要的API
- **输入验证**: 所有IPC参数进行类型检查

---

## 📝 开发约定

### 代码风格

#### TypeScript规范
```typescript
// ✅ 好的做法
interface Props {
  title: string
  count: number
}

const handleClick = async (id: string): Promise<void> => {
  await updateTask(id, { status: 'completed' })
}

// ❌ 避免
function handleClick(id) {  // 缺少类型
  updateTask(id, { status: 'completed' })  // 缺少await
}
```

#### Vue组件规范
```vue
<!-- ✅ 使用 Composition API + <script setup> -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<!-- ❌ 避免使用 Options API -->
<script>
export default {
  data() {
    return { count: 0 }
  }
}
</script>
```

#### 命名约定
- **组件**: PascalCase（`TaskCard.vue`）
- **函数**: camelCase（`handleClick`、`fetchData`）
- **常量**: UPPER_SNAKE_CASE（`DEFAULT_CONFIG`）
- **类型**: PascalCase（`VGenCommission`、`SchedulerConfig`）
- **CSS类**: kebab-case（`task-card`、`btn-primary`）

### Git提交规范

```bash
# 功能
feat: 添加智能排单系统
feat(timeline): 实现按周/按月视图切换

# 修复
fix: 修复休息日保存序列化错误
fix(home): 解决周末未默认标记的问题

# 文档
docs: 更新README添加排单说明

# 样式
style: 调整时间线卡片间距

# 重构
refactor: 重构排单算法提高性能

# 测试
test: 添加工时计算单元测试

# 构建
build: 升级Electron到38.1.2

# 其他
chore: 更新依赖包
```

### 调试技巧

#### 主进程调试
```bash
# 开发模式启动（自动打开DevTools）
pnpm dev

# 查看控制台输出
# 主进程日志在终端
# 渲染进程日志在DevTools
```

#### 数据库调试
```typescript
// 主进程
console.log('[Main] Database state:', db.data)

// 渲染进程
const data = await window.api.db.getVGenCommissions()
console.log('[Renderer] Loaded commissions:', data)
```

#### 常用日志标签
```typescript
[Home]      // Home.vue
[Timeline]  // Timeline.vue
[Scheduler] // scheduler.ts
[Main]      // 主进程
[DB]        // 数据库操作
[VGen]      // VGen相关
```

---

## 🐛 常见问题与解决方案

### 1. Cookie过期导致抓取失败

**症状**:
```
Error: Failed to fetch VGen data: 401 Unauthorized
```

**解决方案**:
1. 使用浏览器登录VGen
2. 使用EditThisCookie扩展导出cookies
3. 保存到 `cookies/fur31mu.json`
4. 重新运行 `pnpm vgen:browser`

---

### 2. 数据库序列化错误

**症状**:
```
Error: An object could not be cloned
```

**原因**: Vue响应式对象（Proxy）无法被IPC序列化

**解决方案**:
```typescript
// ❌ 错误
await window.api.db.save(reactiveObject)

// ✅ 正确
await window.api.db.save(JSON.parse(JSON.stringify(reactiveObject)))

// 或者
await window.api.db.save({ ...plainObject })
```

---

### 3. 排单任务不显示

**可能原因**:
1. 没有运行排单算法
2. 服务缺少工时设置
3. 任务在当前显示周期之外

**排查步骤**:
```typescript
// 1. 检查是否有排单任务
console.log('Scheduled tasks:', scheduledTasks.value)

// 2. 检查服务工时
console.log('Service work hours:', service.estimatedWorkHours)

// 3. 检查日期范围
console.log('Current period:', schedulerDaysInPeriod.value)

// 4. 检查任务过滤
console.log('Positioned tasks:', getPositionedScheduledTasks())
```

---

### 4. 时间线缩放不工作

**症状**: Ctrl+滚轮无效

**原因**: 事件监听器未正确绑定

**解决方案**:
```typescript
// 确保在onMounted中绑定
onMounted(async () => {
  await nextTick()

  const schedulerCalendar = document.querySelector('.scheduler-calendar-view')
  if (schedulerCalendar) {
    schedulerCalendar.addEventListener('wheel', handleSchedulerWheel, {
      passive: false  // 必须设置为false才能preventDefault
    })
  }
})

// 清理
onBeforeUnmount(() => {
  schedulerCalendar?.removeEventListener('wheel', handleSchedulerWheel)
})
```

---

### 5. Autofill警告

**症状**:
```
Request Autofill.enable failed
Request Autofill.setAddresses failed
```

**说明**: 这是Chrome DevTools的正常警告，不影响功能，可以安全忽略。

---

### 6. 休息日未生效

**检查清单**:
1. 确认 `restDays` 数组包含目标日期
2. 检查日期格式（必须是 `YYYY-MM-DD`）
3. 确认配置已保存到数据库
4. 检查排单算法是否读取了配置

**调试代码**:
```typescript
// 查看休息日配置
const config = await window.api.scheduler.getConfig()
console.log('Rest days:', config.restDays)

// 验证日期格式
const today = new Date()
const dateStr = today.toISOString().split('T')[0]  // "2024-11-25"
console.log('Today:', dateStr, 'Is rest day:', config.restDays.includes(dateStr))
```

---

## 🚀 性能优化建议

### 1. 数据加载优化

#### 懒加载
```typescript
// 仅在需要时加载大数据集
const loadCommissions = async () => {
  if (!commissionsLoaded.value) {
    vgenCommissions.value = await window.api.db.getVGenCommissions()
    commissionsLoaded.value = true
  }
}
```

#### 分页加载（未来）
```typescript
// TODO: 实现虚拟滚动或分页
const pageSize = 50
const currentPage = ref(1)
const displayedCommissions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return allCommissions.value.slice(start, start + pageSize)
})
```

### 2. 计算属性优化

```typescript
// ✅ 使用computed缓存计算结果
const filteredTasks = computed(() => {
  return tasks.value.filter(t => t.status === 'active')
})

// ❌ 避免在模板中直接计算
// <div v-for="task in tasks.filter(t => t.status === 'active')">
```

### 3. 事件防抖

```typescript
import { debounce } from 'lodash-es'  // 如果安装了

// 搜索框输入防抖
const handleSearch = debounce((query: string) => {
  searchQuery.value = query
}, 300)
```

### 4. 大列表虚拟化（未来）

```typescript
// 使用 vue-virtual-scroller 或 vue-virtual-scroll-list
// 处理超过1000个项目的列表
```

---

## 🔮 未来扩展点

### 短期计划

#### 1. 通知系统
```typescript
// 功能：即将到期的委托提醒
interface Notification {
  id: string
  type: 'deadline' | 'payment' | 'update'
  title: string
  message: string
  time: Date
  isRead: boolean
}

// TODO: 实现
- 系统托盘通知（Electron Notification API）
- 浏览器通知（Web Notification API）
- 应用内通知中心
```

#### 2. 导出功能
```typescript
// 功能：导出统计报表
- CSV导出（收入、项目列表）
- PDF报告（月度/季度总结）
- Excel工作表（详细数据）

// 技术选型
- csv-export
- pdfkit / jsPDF
- xlsx / exceljs
```

#### 3. 客户管理
```typescript
// 功能：独立的客户管理页面
interface Client {
  id: string
  name: string
  email: string
  socials: Record<string, string>
  totalOrders: number
  totalRevenue: number
  averageRating: number
  tags: string[]
  notes: string
  history: Commission[]  // 历史委托
}

// 页面设计
- 客户列表视图
- 客户详情页
- 客户标签分类
- 搜索和筛选
```

#### 4. 发票生成
```typescript
// 功能：自动生成付款发票
interface Invoice {
  id: string
  invoiceNumber: string
  commissionId: string
  clientInfo: ClientInfo
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  currency: string
  issueDate: Date
  dueDate: Date
  status: 'draft' | 'sent' | 'paid' | 'overdue'
}

// 功能点
- 发票模板（可自定义）
- PDF生成和下载
- 邮件发送（可选）
- 付款追踪
```

---

### 中期计划

#### 1. 移动端支持
- 使用 Capacitor 或 React Native 构建移动应用
- 共享核心业务逻辑（TypeScript）
- 简化UI适配小屏幕
- 离线同步功能

#### 2. 云端同步（可选）
```typescript
// 架构
- 端到端加密
- 增量同步（仅同步变更）
- 冲突解决策略
- 多设备支持

// 后端技术选型
- Firebase / Supabase（快速方案）
- 自建服务（Node.js + PostgreSQL）
```

#### 3. 团队协作（可选）
```typescript
// 功能：多用户协作
interface TeamMember {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: Permission[]
}

// 权限管理
- 项目分配
- 任务共享
- 评论和@提及
- 活动日志
```

#### 4. AI辅助功能
```typescript
// 功能：智能建议
- 工时智能预测（基于历史数据）
- 自动分类新委托
- 价格建议（基于市场数据）
- 自动回复模板生成
```

---

### 长期愿景

#### 1. 插件系统
```typescript
// 允许第三方扩展
interface Plugin {
  id: string
  name: string
  version: string
  hooks: {
    beforeSave?: () => void
    afterLoad?: () => void
    onSchedule?: () => void
  }
  ui?: VueComponent
}
```

#### 2. API开放
```typescript
// RESTful API
- GET /api/commissions
- POST /api/commissions
- PUT /api/commissions/:id
- DELETE /api/commissions/:id

// Webhook支持
- commission.created
- commission.completed
- payment.received
```

#### 3. 集成更多平台
- Fiverr
- Upwork
- Ko-fi
- Patreon
- ArtStation

---

## 📚 技术债务与改进项

### 代码质量

#### 1. 类型安全
```typescript
// TODO: 完善所有any类型
- vgen.ts中的API响应类型
- 事件处理器参数类型
- 动态对象属性访问
```

#### 2. 错误处理
```typescript
// TODO: 统一错误处理
- 网络请求错误
- 数据库操作错误
- 用户输入验证
- 优雅降级策略
```

#### 3. 单元测试
```typescript
// TODO: 添加测试覆盖
- 排单算法测试（scheduler.ts）
- 日期工具函数测试（dateUtils.ts）
- 数据库CRUD测试
- 组件测试（Vue Test Utils）
```

---

### 架构改进

#### 1. 状态管理
```typescript
// 考虑引入Pinia（Vue官方推荐）
- 替代当前的简单store
- 更好的TypeScript支持
- DevTools调试
- 插件生态
```

#### 2. 路由守卫
```typescript
// TODO: 添加路由守卫
router.beforeEach((to, from, next) => {
  // 检查初始化状态
  // 数据预加载
  // 权限验证（未来）
})
```

#### 3. 组件复用
```typescript
// TODO: 提取更多可复用组件
- DatePicker（统一日期选择）
- StatusBadge（状态标签）
- CommissionCard（委托卡片）
- LoadingState（加载状态）
- EmptyState（空状态）
```

---

### 性能优化

#### 1. 懒加载路由
```typescript
// 使用动态import
const routes = [
  {
    path: '/timeline',
    component: () => import('./views/Timeline.vue')
  }
]
```

#### 2. 图片优化
- 使用WebP格式
- 实现图片懒加载
- CDN缓存（如果有云端）

#### 3. 构建优化
```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'naive-ui': ['naive-ui'],
          'vue-vendor': ['vue', 'vue-router']
        }
      }
    }
  }
}
```

---

## 🛡️ 测试策略

### 单元测试

```typescript
// tests/utils/scheduler.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePriority, getCommissionWorkHours } from '@/utils/scheduler'

describe('Scheduler', () => {
  it('should calculate priority correctly', () => {
    const commission = { /* ... */ }
    const options = { /* ... */ }
    const priority = calculatePriority(commission, options)
    expect(priority).toBeGreaterThan(0)
  })

  it('should get work hours from config', () => {
    const hours = getCommissionWorkHours(commission, config)
    expect(hours).toBe(8)
  })
})
```

### E2E测试（未来）

```typescript
// tests/e2e/timeline.spec.ts
import { test, expect } from '@playwright/test'

test('should display timeline', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Timeline')
  await expect(page.locator('.calendar-timeline')).toBeVisible()
})
```

---

## 📖 学习资源

### Electron开发
- [Electron官方文档](https://www.electronjs.org/docs)
- [Electron Vite文档](https://electron-vite.org/)

### Vue 3
- [Vue 3官方文档](https://vuejs.org/)
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

### Naive UI
- [Naive UI组件库](https://www.naiveui.com/)

### TypeScript
- [TypeScript官方文档](https://www.typescriptlang.org/docs/)

---

## 🔄 版本历史

### v1.2.0 (2024-11-27)
#### Timeline 排单系统优化
- ✅ 重构智能排单算法为逐日填充策略（Bin Packing）
  - 改进前：按任务优先级顺序依次分配（Sequential）
  - 改进后：按天填充，每天优先分配高优先级任务，再用低优先级任务填充碎片时间
  - 效果：大幅提高工时利用率，减少空闲时间
- ✅ 优化排单表格布局：缩小内边距至8px（原24px），增加32px显示空间
- ✅ 修复子任务天数计算：使用Set去重统计跨子任务的唯一天数
- ✅ 优化Tooltip显示：移除冗余的服务信息字段

#### Dashboard 统计优化
- ✅ 修复月度收入趋势图bug：柱状图高度现在正确反映实际收入差异
- ✅ 自动导航到当前年月：打开页面时自动显示当前年份统计
- ✅ 动态年份选项：根据当前年份自动生成±1年的选项

### v1.1.0 (2024-11-26)
#### Timeline 智能排单增强
- ✅ 实现卡片拖动功能（调整任务日期）
- ✅ 实现卡片拉伸功能（调整工时）
- ✅ 添加修改管理系统（保存/取消按钮）
- ✅ 实现卡片点击查看详情
- ✅ 按月视图自动滚动到今日位置
- ✅ 修复按月视图横向滚动条问题
- ✅ 添加状态颜色渐变显示
- ✅ 原始数据页签点击查看详情（只读模式）

### v1.0.0 (2024-11-25)
- ✅ 完成Home日历视图
- ✅ 完成Timeline智能排单系统
- ✅ 完成Commissions服务管理
- ✅ 完成Dashboard数据统计
- ✅ 实现VGen数据自动同步
- ✅ 实现休息日管理
- ✅ 实现工时配置系统
- ✅ 完善UI交互和样式

---

## 📞 联系与支持

### 问题反馈
- GitHub Issues: [项目仓库URL]
- Email: [开发者邮箱]

### 贡献指南
1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**最后更新**: 2024-11-27
**维护者**: BerryDone Team
**状态**: ✅ 生产就绪

---

**享受你的Commission管理之旅！** 🎉🍓
