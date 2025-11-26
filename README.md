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

## 🔮 未来计划

- [ ] VGen 双向同步
- [ ] 客户管理功能
- [ ] 发票生成
- [ ] 通知提醒
- [ ] 导出报表
- [ ] 移动端适配

## 📞 获取帮助

如遇问题请查看：
1. `FIXES_AND_FEATURES.md` - 常见问题修复
2. `HOW_TO_USE_VGEN.md` - VGen 相关问题
3. GitHub Issues - 提交新问题

## 📄 许可证

MIT License

---

**享受你的 Commission 管理之旅！** 🎉
