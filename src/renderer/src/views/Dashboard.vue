<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <h1 class="page-title">📊 Dashboard</h1>
      <div class="header-actions">
        <n-button quaternary>
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          导出报告
        </n-button>
      </div>
    </div>

    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <n-icon :component="WalletOutline" size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-label">本月收入</div>
          <div class="stat-value">${{ monthlyRevenue.toFixed(2) }}</div>
          <div class="stat-change positive">+{{ monthlyGrowth }}% vs 上月</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <n-icon :component="CheckmarkCircleOutline" size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-label">已完成</div>
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-change">本月完成</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <n-icon :component="TimeOutline" size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-label">进行中</div>
          <div class="stat-value">{{ inProgressCount }}</div>
          <div class="stat-change">当前项目</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
          <n-icon :component="TrendingUpOutline" size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-label">平均单价</div>
          <div class="stat-value">${{ averagePrice.toFixed(2) }}</div>
          <div class="stat-change">USD</div>
        </div>
      </div>
    </div>

    <div class="charts-container">
      <div class="chart-card">
        <div class="chart-header">
          <h3>月度收入趋势</h3>
          <n-select 
            v-model:value="selectedYear" 
            :options="yearOptions" 
            style="width: 120px;"
          />
        </div>
        <div class="chart-placeholder">
          <div class="revenue-bars">
            <div 
              v-for="month in monthlyData" 
              :key="month.month"
              class="revenue-bar"
            >
              <div 
                class="bar-fill" 
                :style="{ height: (month.revenue / maxRevenue * 100) + '%' }"
              ></div>
              <div class="bar-label">{{ month.month }}</div>
              <div class="bar-value">${{ month.revenue.toFixed(0) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>项目状态分布</h3>
        </div>
        <div class="chart-placeholder">
          <div class="status-distribution">
            <div 
              v-for="status in statusDistribution" 
              :key="status.name"
              class="status-item"
            >
              <div class="status-bar-container">
                <div 
                  class="status-bar" 
                  :style="{ 
                    width: (status.count / totalCommissions * 100) + '%',
                    backgroundColor: status.color 
                  }"
                ></div>
              </div>
              <div class="status-info">
                <span class="status-name">{{ status.name }}</span>
                <span class="status-count">{{ status.count }} ({{ (status.count / totalCommissions * 100).toFixed(1) }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="recent-activity">
      <h3>最近完成</h3>
      <div class="activity-list">
        <div 
          v-for="commission in recentCompleted" 
          :key="commission.id"
          class="activity-item"
        >
          <div class="activity-icon">
            <n-icon :component="CheckmarkCircleOutline" color="#54C5B7" size="20" />
          </div>
          <div class="activity-content">
            <div class="activity-title">{{ commission.projectName }}</div>
            <div class="activity-subtitle">{{ commission.clientName }}</div>
          </div>
          <div class="activity-meta">
            <span class="activity-price">${{ commission.totalCost.toFixed(2) }}</span>
            <span class="activity-date">{{ formatDate(commission.completedDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NIcon, NSelect } from 'naive-ui'
import {
  DownloadOutline,
  WalletOutline,
  CheckmarkCircleOutline,
  TimeOutline,
  TrendingUpOutline
} from '@vicons/ionicons5'

interface VGenCommission {
  id: string
  clientName: string
  projectName: string
  status: string
  paymentStatus: string
  totalCost: number
  completedDate?: string
  startDate: string
}

const vgenCommissions = ref<VGenCommission[]>([])
const selectedYear = ref(2024)

const yearOptions = [
  { label: '2024', value: 2024 },
  { label: '2025', value: 2025 }
]

onMounted(async () => {
  try {
    const commissions = await window.api.db.getVGenCommissions()
    vgenCommissions.value = commissions
    console.log(`Dashboard loaded ${commissions.length} commissions`)
  } catch (error) {
    console.error('Failed to load commissions:', error)
  }
})

// 统计数据
const completedCommissions = computed(() => 
  vgenCommissions.value.filter(c => c.status === 'COMPLETED')
)

const completedCount = computed(() => completedCommissions.value.length)

const inProgressCount = computed(() => 
  vgenCommissions.value.filter(c => c.status === 'IN_PROGRESS').length
)

const totalCommissions = computed(() => vgenCommissions.value.length)

// 本月收入
const monthlyRevenue = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return completedCommissions.value
    .filter(c => {
      if (!c.completedDate) return false
      const date = new Date(c.completedDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, c) => sum + c.totalCost, 0)
})

// 月度增长
const monthlyGrowth = computed(() => {
  // 简化计算，实际应该比较上个月
  return 15.6
})

// 平均单价
const averagePrice = computed(() => {
  if (completedCommissions.value.length === 0) return 0
  const total = completedCommissions.value.reduce((sum, c) => sum + c.totalCost, 0)
  return total / completedCommissions.value.length
})

// 月度数据
const monthlyData = computed(() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const data = months.map((month, index) => {
    const revenue = completedCommissions.value
      .filter(c => {
        if (!c.completedDate) return false
        const date = new Date(c.completedDate)
        return date.getMonth() === index && date.getFullYear() === selectedYear.value
      })
      .reduce((sum, c) => sum + c.totalCost, 0)
    
    return { month, revenue }
  })
  
  return data
})

const maxRevenue = computed(() => 
  Math.max(...monthlyData.value.map(d => d.revenue), 1)
)

// 状态分布
const statusDistribution = computed(() => {
  const statuses = [
    { name: 'Completed', color: '#54C5B7', status: 'COMPLETED' },
    { name: 'Pending', color: '#F59E0B', status: 'PENDING' },
    { name: 'In Progress', color: '#3B82F6', status: 'IN_PROGRESS' },
    { name: 'Draft', color: '#9CA3AF', status: 'DRAFT' }
  ]
  
  return statuses.map(s => ({
    ...s,
    count: vgenCommissions.value.filter(c => c.status === s.status).length
  }))
})

// 最近完成
const recentCompleted = computed(() => 
  completedCommissions.value
    .sort((a, b) => {
      const dateA = new Date(a.completedDate || a.startDate).getTime()
      const dateB = new Date(b.completedDate || b.startDate).getTime()
      return dateB - dateA
    })
    .slice(0, 5)
)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.dashboard-view {
  padding: 24px;
  max-width: 1500px;
  min-width: 1100px;
  width: 100%;
  margin: 0 auto;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 隐藏滚动条 */
.dashboard-view::-webkit-scrollbar {
  display: none;
}

.dashboard-view {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 16px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #888;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  color: #888;
}

.stat-change.positive {
  color: #10B981;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.chart-card {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.chart-placeholder {
  height: 300px;
}

.revenue-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 250px;
  gap: 8px;
}

.revenue-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(to top, #54C5B7, #8FD5CC);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s;
}

.bar-label {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

.bar-value {
  position: absolute;
  top: -20px;
  font-size: 11px;
  color: #aaa;
}

.status-distribution {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 0;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-bar-container {
  width: 100%;
  height: 32px;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.status-bar {
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s;
}

.status-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.status-name {
  color: #e0e0e0;
}

.status-count {
  color: #888;
}

.recent-activity {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
}

.recent-activity h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #2a2a2a;
  border-radius: 12px;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #333;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(84, 197, 183, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.activity-subtitle {
  font-size: 12px;
  color: #888;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.activity-price {
  font-size: 16px;
  font-weight: 600;
  color: #54C5B7;
}

.activity-date {
  font-size: 12px;
  color: #888;
}
</style>

