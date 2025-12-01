# 🍓 BerryDone - VGen Commissions Timeline Manager

A desktop application designed for VGen creators to manage commissions with calendar view, intelligent scheduling, and data analytics.

## ✨ Key Features

### 📅 Home - Calendar View
- Monthly calendar displaying all commissions
- Custom work hours configuration (default 8h/day)
- Rest day management (default weekends, customizable)
- Daily statistics badges (Ready/WIP/Completed)
- Monthly revenue and completion rate stats

### 🤖 Timeline - Smart Scheduling
- **Dual-tab Design**: Smart Schedule + Raw Data view
- AI-driven priority-based scheduling algorithm
- Switch between weekly/monthly views
- Drag-and-drop to adjust dates and work hours
- Real-time schedule preview
- Automatic skip for rest days and work hour limits

### 📋 Commissions - Service Management
- VGen service listings display
- Three-tier work hours config (Global → Category → Individual)
- Auto-detect services missing work hour estimates
- One-click VGen data sync

### 📊 Dashboard - Data Analytics
- Monthly revenue statistics
- Project status distribution (Pie chart)
- 6-month revenue trend
- Recent completion list

### 🖥️ Desktop Widgets
- **Control Panel**: Manage all widgets visibility
- **Calendar Widget**: Mini calendar with commission count
- **Todo Widget**: Today's scheduled tasks
- **Timer Widget**: Time tracking with todo integration
- **Apps Launcher**: Quick app shortcuts
- **Quick Replies**: Predefined text snippets
- Magnetic snapping between widgets
- Persistent layout memory

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev
```

### Build for Production

```bash
# Build all platforms
pnpm build

# Platform-specific builds
pnpm build:win      # Windows
pnpm build:mac      # macOS
pnpm build:linux    # Linux
```

The installer will be generated in the `dist/` directory.

## 📦 VGen Data Sync

### 1. Export VGen Cookies

1. Install [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie) browser extension
2. Log in to [VGen.co](https://vgen.co)
3. Click EditThisCookie icon → Export → Copy JSON
4. Save as `cookies/cookies.json`

See `cookies/README.md` for details.

### 2. Sync Data

In the app, click **"Update Data"** button to automatically:
- Fetch commissions from VGen
- Fetch service listings
- Save to local database

**First-time users**: The app will auto-download Playwright browsers (~200MB) on first sync.

### 3. Configure Work Hours

1. Go to **Commissions** tab
2. Set global default work hours
3. Set category-specific defaults (optional)
4. Set individual service overrides (optional)

The three-tier system: `Global Default` → `Category Default` → `Service Override`

### 4. Generate Schedule

1. Go to **Timeline** tab → **Smart Schedule** sub-tab
2. Click **"Generate Schedule"** button
3. Review AI-generated schedule
4. Drag cards to adjust dates/hours if needed
5. Schedule is auto-saved

## 🛠 Tech Stack

- **Electron 38** - Desktop application framework
- **Vue 3.5** - Progressive JavaScript framework (Composition API)
- **TypeScript 5.9** - Type-safe JavaScript
- **Naive UI 2.43** - Vue 3 component library
- **LowDB 7.0** - Simple JSON database
- **Playwright 1.56** - Browser automation for VGen sync
- **Electron Vite 4.0** - Lightning fast HMR

## 📁 Project Structure

```
BerryDone/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # App entry point
│   │   ├── db.ts               # Database manager
│   │   ├── vgen.ts             # VGen integration
│   │   └── vgen-updater.ts     # Auto-update scheduler
│   ├── preload/                # Preload scripts (IPC bridge)
│   └── renderer/src/           # Vue frontend
│       ├── views/              # Page components
│       │   ├── Home.vue        # Calendar view
│       │   ├── Timeline.vue    # Smart scheduling
│       │   ├── Commissions.vue # Service management
│       │   └── Dashboard.vue   # Analytics
│       ├── components/
│       │   └── widget/         # Desktop widget components
│       └── utils/
│           └── scheduler.ts    # Scheduling algorithm
├── scripts/                    # Utility scripts
├── cookies/                    # VGen cookies (gitignored)
├── data/                       # Local database (gitignored)
└── build/                      # Build resources (icons, etc.)
```

## 🔧 npm Scripts

### Development
```bash
pnpm dev              # Start dev mode with HMR
pnpm build            # Build production app
pnpm build:no-check   # Build without type checking (faster)
```

### VGen Sync (CLI - for advanced users)
```bash
pnpm vgen:browser     # Fetch data via browser automation
pnpm vgen:import      # Import fetched data to database
pnpm vgen:copy        # Copy test DB to production location
```

### Code Quality
```bash
pnpm lint             # ESLint check
pnpm format           # Prettier format
pnpm typecheck        # TypeScript check
```

## 📖 Usage Guide

### Calendar & Work Hours Configuration

1. **Set Default Work Hours**:
   - Click "Default Work Hours" button in Home view
   - Set daily work hours (e.g., 8 hours)
   - This applies to all days without custom settings

2. **Set Rest Days**:
   - Right-click any date in calendar → Toggle rest day
   - Default: Weekends (Saturday & Sunday)
   - Custom rest days supported

3. **Custom Day Hours**:
   - Click any date in calendar
   - Toggle work day / rest day
   - Set custom work hours for specific dates

### Smart Scheduling Algorithm

The scheduler uses a bin-packing strategy:

1. **Priority Calculation**:
   - Due date urgency: Closer deadlines = higher priority
   - Status weight: IN_PROGRESS > PENDING > DRAFT
   - Payment status: PAID > UNPAID

2. **Daily Allocation**:
   - Start from today
   - Fill each day up to work hour limit
   - Auto-skip rest days
   - Respect custom work hours

3. **Manual Adjustments**:
   - Drag cards horizontally → Change dates
   - Drag card edges → Adjust work hours
   - Changes auto-save to database

### Widget System

1. Click 🍓 button in main app → Switch to widget mode
2. Main app minimizes, desktop widgets appear
3. Drag widgets to arrange layout
4. Widgets snap to each other magnetically
5. Layout persists across sessions
6. Click "Return to Main" to restore main app

## ⚠️ Known Issues

### 1. Card Drag Performance
- **Issue**: Timeline card dragging may lag with many tasks
- **Workaround**: Drag slowly, wait for UI response
- **Status**: Optimization planned for future release

### 2. 2K Display Scaling
- **Affected**: 2560×1440 displays with Windows DPI scaling (125%/150%)
- **Working**: 1080p and 4K displays
- **Workaround**: Set Windows scaling to 100% or 200%
- **Status**: Under investigation

## 🔐 Security & Privacy

- ✅ **Local-first**: All data stored locally, never uploaded
- ✅ **Open source**: Full source code available for audit
- ✅ **No telemetry**: No tracking or analytics
- ✅ **Privacy-safe**: Cookies and database gitignored
- ⚠️ **Cookie security**: Keep `cookies/` secure, contains auth data

## 🗺️ Roadmap

### v1.2.0 (Current)
- ✅ Core features complete
- ✅ Desktop widgets system
- ✅ Smart scheduling algorithm
- ✅ VGen data sync
- ⚠️ Timeline drag performance needs optimization
- ⚠️ 2K display adaptation

### Future Plans
- [ ] Optimize card dragging performance
- [ ] Fix 2K display scaling issues
- [ ] Export reports (PDF/Excel)
- [ ] Multi-language support
- [ ] Cloud backup (optional)
- [ ] Mobile companion app

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make changes and commit: `git commit -m "Add feature"`
6. Push to your fork: `git push origin feature/your-feature`
7. Open a Pull Request

### Coding Guidelines

- Use TypeScript for type safety
- Follow Vue 3 Composition API patterns
- Use kebab-case for CSS classes
- Use camelCase for JS/TS variables
- Use PascalCase for components and types
- Add comments for complex logic

## 📄 License

MIT License

Copyright (c) 2024 BerryDone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Made with 🍓 for VGen creators**
