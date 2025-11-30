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
1. 读取cookies/fur31mu.json
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
**解决**: 使用EditThisCookie扩展导出新cookies到`cookies/fur31mu.json`

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

- **Cookie管理**: `cookies/fur31mu.json`（已.gitignore）
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
