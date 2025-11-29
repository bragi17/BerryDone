# 🍓 BerryDone - VGen Commissions Timeline Manager

一个专为 VGen 创作者设计的 Commission 管理工具，提供日历、时间线和数据统计功能。

## ✨ 功能特性

### 📅 Home - 日历视图
- 月历形式展示所有 commissions
- 每天显示 Ready、WIP、Completed 数量
- 彩色状态指示器
- 本月统计摘要

### 🗓️ Timeline - 时间线管理
- 可视化项目时间轴
- 项目条形图展示
- 搜索和筛选功能
- 滚轮缩放时间线
- 月份导航

### 📊 Dashboard - 数据统计
- 本月收入统计
- 项目状态分布
- 收入趋势图表
- 最近完成列表
- 平均单价分析

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发模式
```bash
pnpm dev
```

### 构建应用
```bash
pnpm build          # 构建所有平台
pnpm build:win      # 仅 Windows
pnpm build:mac      # 仅 macOS
pnpm build:linux    # 仅 Linux
```

## 📦 VGen 数据同步

### 1. 获取 Cookie
使用 EditThisCookie 扩展导出 VGen 的 cookies，保存到 `cookies/fur31mu.json`

### 2. 抓取数据
```bash
pnpm vgen:browser   # 浏览器自动化抓取
```

### 3. 导入数据
```bash
pnpm vgen:import    # 导入到数据库
pnpm vgen:copy      # 复制到正式位置
```

### 4. 重启应用
```bash
pnpm dev
```

## 📊 当前数据

- **349 个 Commissions** 已导入
- **259 个已完成** (74%)
- **70 个待处理** (20%)
- **8 个草稿** (2%)
- **297 个已付款** (85%)

## 🎨 界面预览

### Home 页面
- 月历显示项目分布
- 每天的 Ready/WIP/Completed 统计
- 快速导航到今天

### Timeline 页面
- 横向时间轴
- 彩色项目条
- 实时搜索筛选

### Dashboard 页面
- 收入卡片统计
- 月度收入趋势图
- 状态分布可视化
- 最近完成列表

## 🛠 技术栈

- **Electron** - 桌面应用框架
- **Vue 3** - 前端框架
- **TypeScript** - 类型安全
- **Naive UI** - UI 组件库
- **LowDB** - 本地数据库
- **Playwright** - 浏览器自动化

## 📁 项目结构

```
BerryDone/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── db.ts       # 数据库
│   │   ├── vgen.ts     # VGen 集成
│   │   └── index.ts    # 主入口
│   ├── preload/        # Preload 脚本
│   └── renderer/       # Vue 渲染进程
│       └── src/
│           ├── views/  # 页面组件
│           │   ├── Home.vue
│           │   ├── Timeline.vue
│           │   └── Dashboard.vue
│           ├── components/  # UI 组件
│           └── store/       # 状态管理
├── scripts/            # 工具脚本
│   ├── fetch-vgen-browser.ts  # 数据抓取
│   └── import-vgen-commissions.ts  # 数据导入
└── cookies/            # Cookie 存储
```

## 🔧 npm 脚本

### 开发
- `pnpm dev` - 启动开发模式
- `pnpm build` - 构建应用

### VGen 同步
- `pnpm vgen:browser` - 抓取数据（浏览器）
- `pnpm vgen:fetch` - 抓取数据（简单）
- `pnpm vgen:import` - 导入到数据库
- `pnpm vgen:copy` - 复制到正式位置

### 代码质量
- `pnpm lint` - ESLint 检查
- `pnpm format` - Prettier 格式化
- `pnpm typecheck` - TypeScript 类型检查

## 📝 使用说明

### 查看项目
1. 启动应用
2. 在侧边栏选择项目
3. 切换不同视图（Home/Timeline/Dashboard）

### 搜索和筛选
- 使用搜索框输入关键词
- 使用筛选器选择状态
- 组合使用获得精确结果

### 更新数据
当有新的 commissions 时：
1. 运行 `pnpm vgen:browser` 抓取
2. 运行 `pnpm vgen:import` 导入
3. 运行 `pnpm vgen:copy` 复制
4. 重启应用查看更新

## ⚠️ 注意事项

1. **Cookie 安全**: 不要分享 `cookies/` 文件夹
2. **数据备份**: 定期备份 `berrydone.json`
3. **Cookie 过期**: 定期更新 VGen cookies
4. **请求频率**: 不要过于频繁抓取数据

## 🎯 v1.2.0 发布版本说明 (Production Ready)

### ✅ 生产环境打包
此版本已完成开发，**可以直接打包发布**：

```bash
# Windows 打包
pnpm build:win

# macOS 打包
pnpm build:mac

# Linux 打包
pnpm build:linux
```

打包后的安装包位于 `dist/` 目录。

### 📥 首次使用说明

**重要**: 用户在首次点击"更新数据"按钮时，应用会**自动下载并安装浏览器依赖**（Playwright）：

1. 点击"更新数据"按钮
2. 等待 Playwright 浏览器下载（约 200MB，仅首次需要）
3. 下载完成后，自动开始抓取 VGen 数据
4. 后续更新无需重复下载

### ⚠️ 已知问题

#### 1. 卡片移动性能问题
在 **Timeline 智能排单** 页面中，拖动任务卡片调整日期或工时时：
- **存在卡顿和滞后现象**（尤其在任务数量较多时）
- 建议：拖动时缓慢移动，等待UI响应
- 优化计划：后续版本将改进拖动性能

#### 2. 2K 分辨率适配问题
- 1080p 和 4K 显示器：✅ 完美显示
- 2K 显示器 (2560×1440)：⚠️ 可能存在布局异常
- 原因：Windows DPI 缩放（125%/150%）导致
- 临时方案：在系统设置中将缩放调整为 100% 或 200%

### 🚀 核心功能特性

#### Home - 日历视图
- ✅ 月历展示所有委托项目
- ✅ 每日工时配置（默认8小时，可自定义）
- ✅ 休息日管理（默认周末，可调整）
- ✅ 每日统计徽章（Ready/WIP/Completed）
- ✅ 本月收入和完成率统计

#### Timeline - 智能排单系统
- ✅ AI 驱动的优先级排单算法
- ✅ 按周/按月视图切换
- ✅ 拖动调整任务日期和工时
- ✅ 实时预览排单效果
- ✅ 休息日和工时限制智能跳过
- ⚠️ 拖动操作存在性能问题（见已知问题）

#### Commissions - 服务管理
- ✅ VGen 服务列表展示
- ✅ 三级工时配置系统（全局/分类/单项）
- ✅ 自动检测缺少工时的已下单服务
- ✅ 一键更新 VGen 数据

#### Dashboard - 数据分析
- ✅ 本月收入统计
- ✅ 项目状态分布饼图
- ✅ 近6个月收入趋势
- ✅ 最近完成项目列表

## 📖 文档

- `QUICK_START.md` - 快速开始指南
- `FIXES_AND_FEATURES.md` - 修复和功能说明
- `VGEN_INTEGRATION_COMPLETE.md` - VGen 集成文档
- `HOW_TO_USE_VGEN.md` - VGen 抓取详细说明

## 🎯 状态说明

### Commission 状态
- **COMPLETED** 🟢: 已完成
- **IN_PROGRESS** 🔵: 进行中
- **PENDING** 🟡: 待处理
- **DRAFT** ⚪: 草稿

### 付款状态
- **PAID** 💚: 已付款（绿色显示）
- **UNPAID** 🧡: 未付款（橙色显示）


## 📄 许可证

MIT License

---

