# 🎨 BerryDone Desktop Widget Branch

## 分支信息

**分支名称**: `feature/desktop-widget`
**基于版本**: v1.2.0-release
**创建时间**: 2025-11-29

## 功能目标

开发桌面小组件功能，提供一个轻量级的桌面悬浮窗口，用于快速查看：

### 核心功能
- 📅 **日历视图**: 当月日历缩略显示
- ✅ **当日 Todo**: 今天的任务列表
- 📊 **快速统计**: Ready/WIP/Completed 数量
- 🔄 **实时同步**: 与主窗口数据同步
- 🎯 **最小化按钮**: 主窗口可快速切换为小组件模式

### 技术方案

使用 Electron 多窗口架构：
- **主窗口** (`BrowserWindow`): 完整应用界面
- **小组件窗口** (`BrowserWindow`):
  - 无边框窗口 (`frame: false`)
  - 总是在最前 (`alwaysOnTop: true`)
  - 可拖动 (`draggable: true`)
  - 透明背景 (`transparent: true`)
  - 尺寸约 300x400 像素

### 设计草图

```
┌─────────────────────┐
│  📅 2025年11月      │
│  ─────────────────  │
│  日一二三四五六      │
│  27 28 29 30  1  2  3│
│   4  5  6  7  8  9 10│
│  ...                │
│  ─────────────────  │
│  今日任务 (3)       │
│  ☐ Task 1          │
│  ☐ Task 2          │
│  ☑ Task 3          │
│  ─────────────────  │
│  Ready: 5 | WIP: 3 │
│  Completed: 12     │
└─────────────────────┘
```

## 开发步骤

### Phase 1: 窗口管理
- [ ] 创建小组件窗口配置
- [ ] 实现主窗口与小组件的切换逻辑
- [ ] 添加窗口拖动功能
- [ ] 实现窗口吸附边缘

### Phase 2: UI 组件
- [ ] 设计小组件 Vue 组件
- [ ] 实现迷你日历视图
- [ ] 实现当日任务列表
- [ ] 添加快速统计卡片

### Phase 3: 数据同步
- [ ] 实现主窗口与小组件的 IPC 通信
- [ ] 数据实时同步机制
- [ ] 点击小组件任务跳转到主窗口

### Phase 4: 优化与美化
- [ ] 添加动画效果
- [ ] 支持自定义主题
- [ ] 窗口透明度调整
- [ ] 记住窗口位置

## 数据文件

已从主项目复制以下数据：
- ✅ `cookies/fur31mu.json` - VGen 登录凭证
- ✅ `berrydone-test.json` - 测试数据库
- ✅ `data/berrydone.json` - 生产数据库

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 注意事项

1. 此分支独立于主分支开发，完成后合并到主分支
2. 保持与主分支的功能兼容性
3. 数据文件已被 .gitignore 忽略，不会提交到仓库
4. 定期从主分支同步更新

## 参考资料

- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window)
- [Frameless Window](https://www.electronjs.org/docs/latest/tutorial/window-customization)
- [IPC 通信](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

🍓 BerryDone Widget - Making task management more accessible
