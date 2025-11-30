<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <h1 class="page-title">📊 Dashboard</h1>
      <div class="header-actions">
        <n-button quaternary @click="showRefundModal = true">
          <template #icon>
            <n-icon :component="RemoveCircleOutline" />
          </template>
          记录退款
        </n-button>
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
          <div class="stat-header">
            <div class="stat-label">本月收入</div>
            <n-switch
              v-model:value="includeNonCompletedPaid"
              size="small"
            >
              <template #checked>
                全部已付
              </template>
              <template #unchecked>
                仅完成
              </template>
            </n-switch>
          </div>
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
          <div class="revenue-bars-container">
            <div
              v-for="month in monthlyData"
              :key="month.month"
              class="revenue-bar-wrapper"
            >
              <!-- 收入区域（上半部分） -->
              <div class="revenue-section">
                <div class="bar-value revenue-value">${{ month.revenue.toFixed(0) }}</div>
                <div
                  class="bar-fill bar-revenue"
                  :style="{ height: (month.revenue / maxRevenue * 85) + '%' }"
                >
                  <div class="bar-shine"></div>
                </div>
              </div>

              <!-- 中间标签区域 -->
              <div class="bar-center">
                <div class="bar-label">{{ month.month }}</div>
                <div class="bar-net-income" :class="{ 'negative': month.netIncome < 0 }">
                  ${{ Math.abs(month.netIncome).toFixed(0) }}
                </div>
              </div>

              <!-- 退款区域（下半部分） -->
              <div class="refund-section">
                <div
                  class="bar-fill bar-refund"
                  :style="{ height: (month.refund / maxRevenue * 85) + '%' }"
                >
                  <div class="bar-shine"></div>
                </div>
                <div class="bar-value refund-value" v-if="month.refund > 0">
                  -${{ month.refund.toFixed(0) }}
                </div>
              </div>
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

    <!-- 退款记录 -->
    <div class="refunds-section">
      <div class="section-header">
        <h3>退款记录</h3>
        <n-button quaternary size="small" @click="openAddRefundModal">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          添加退款
        </n-button>
      </div>

      <div v-if="refunds.length === 0" class="empty-state">
        <n-icon :component="InformationCircleOutline" size="48" color="#666" />
        <p>暂无退款记录</p>
      </div>

      <div v-else class="refunds-list">
        <div
          v-for="refund in sortedRefunds"
          :key="refund.id"
          class="refund-item"
        >
          <div class="refund-main">
            <div class="refund-date">
              <n-icon :component="CalendarOutline" size="16" />
              <span>{{ refund.date }}</span>
            </div>
            <div class="refund-amount">-${{ refund.amount.toFixed(2) }}</div>
          </div>

          <div class="refund-details">
            <div class="refund-reason">
              <span class="label">原因:</span>
              <span class="value">{{ refund.reason }}</span>
            </div>

            <div v-if="refund.commissionId" class="refund-commission">
              <span class="label">关联订单:</span>
              <span class="value">{{ getCommissionLabel(refund.commissionId) }}</span>
            </div>

            <div v-if="refund.notes" class="refund-notes">
              <span class="label">备注:</span>
              <span class="value">{{ refund.notes }}</span>
            </div>
          </div>

          <div class="refund-actions">
            <n-button quaternary size="small" @click="handleEditRefund(refund)">
              <template #icon>
                <n-icon :component="CreateOutline" />
              </template>
              编辑
            </n-button>
            <n-button quaternary size="small" type="error" @click="handleDeleteRefund(refund)">
              <template #icon>
                <n-icon :component="TrashOutline" />
              </template>
              删除
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 退款录入/编辑对话框 -->
    <n-modal v-model:show="showRefundModal" preset="card" :title="isEditMode ? '编辑退款' : '记录退款'" style="width: 600px;">
      <n-form ref="refundFormRef" :model="refundForm" :rules="refundFormRules">
        <n-form-item label="关联订单" path="commissionId">
          <n-auto-complete
            v-model:value="refundForm.searchQuery"
            :options="commissionSearchOptions"
            placeholder="搜索客户名/服务名/日期"
            clearable
            @select="handleSelectCommission"
            style="width: 100%;"
          />
        </n-form-item>

        <!-- 显示选中的订单信息 -->
        <div v-if="selectedCommission" class="selected-commission-info">
          <div class="info-row">
            <span class="info-label">客户:</span>
            <span class="info-value">{{ selectedCommission.clientName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">服务:</span>
            <span class="info-value">{{ selectedCommission.serviceName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">金额:</span>
            <span class="info-value price">${{ selectedCommission.totalCost.toFixed(2) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">日期:</span>
            <span class="info-value">{{ selectedCommission.startDate }}</span>
          </div>
        </div>

        <n-form-item label="日期" path="date">
          <n-date-picker
            v-model:value="refundForm.dateTimestamp"
            type="date"
            clearable
            style="width: 100%;"
          />
        </n-form-item>
        <n-form-item label="金额 (USD)" path="amount">
          <n-input-number
            v-model:value="refundForm.amount"
            :min="0"
            :step="0.01"
            placeholder="请输入退款金额"
            style="width: 100%;"
          >
            <template #prefix>$</template>
          </n-input-number>
        </n-form-item>
        <n-form-item label="退款原因" path="reason">
          <n-input
            v-model:value="refundForm.reason"
            placeholder="请输入退款原因"
            type="textarea"
            :rows="3"
          />
        </n-form-item>
        <n-form-item label="备注" path="notes">
          <n-input
            v-model:value="refundForm.notes"
            placeholder="可选：补充说明"
            type="textarea"
            :rows="2"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <n-button @click="handleCancelRefund">取消</n-button>
          <n-button type="primary" @click="handleSaveRefund">{{ isEditMode ? '保存' : '确定' }}</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NIcon, NSelect, NSwitch, NModal, NForm, NFormItem, NInput, NInputNumber, NDatePicker, NAutoComplete, useMessage, useDialog } from 'naive-ui'
import {
  DownloadOutline,
  WalletOutline,
  CheckmarkCircleOutline,
  TimeOutline,
  TrendingUpOutline,
  RemoveCircleOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  CalendarOutline,
  InformationCircleOutline
} from '@vicons/ionicons5'
import { parseDateString, formatDateString } from '../utils/dateUtils'

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

interface Refund {
  id: string
  date: string
  amount: number
  reason: string
  commissionId?: string
  notes?: string
}

const message = useMessage()
const dialog = useDialog()
const vgenCommissions = ref<VGenCommission[]>([])
const refunds = ref<Refund[]>([])
const selectedYear = ref(new Date().getFullYear()) // 自动设置为当前年份
const includeNonCompletedPaid = ref(true) // 默认包含所有已付费订单

// 退款表单
const showRefundModal = ref(false)
const refundFormRef = ref()
const isEditMode = ref(false)
const editingRefundId = ref<string | null>(null)
const refundForm = ref({
  dateTimestamp: Date.now(),
  amount: 0,
  reason: '',
  notes: '',
  commissionId: undefined as string | undefined,
  searchQuery: ''
})
const refundFormRules = {
  amount: { required: true, message: '请输入退款金额', trigger: 'blur', type: 'number' },
  reason: { required: true, message: '请输入退款原因', trigger: 'blur' }
}

// 选中的订单
const selectedCommission = ref<VGenCommission | null>(null)

// 订单搜索选项
const commissionSearchOptions = computed(() => {
  const query = refundForm.value.searchQuery.toLowerCase().trim()

  if (!query) {
    // 显示最近的20个订单
    return vgenCommissions.value
      .slice(0, 20)
      .map(comm => ({
        label: `${comm.clientName} - ${comm.serviceName} ($${comm.totalCost.toFixed(2)}) - ${comm.startDate}`,
        value: comm.id
      }))
  }

  // 按客户名、服务名、日期搜索
  return vgenCommissions.value
    .filter(comm => {
      const clientMatch = comm.clientName.toLowerCase().includes(query)
      const serviceMatch = comm.serviceName.toLowerCase().includes(query)
      const dateMatch = comm.startDate.includes(query) ||
                        comm.completedDate?.includes(query) ||
                        comm.dueDate?.includes(query)
      return clientMatch || serviceMatch || dateMatch
    })
    .slice(0, 20)
    .map(comm => ({
      label: `${comm.clientName} - ${comm.serviceName} ($${comm.totalCost.toFixed(2)}) - ${comm.startDate}`,
      value: comm.id
    }))
})

// 选择订单
const handleSelectCommission = (value: string) => {
  const commission = vgenCommissions.value.find(c => c.id === value)
  if (commission) {
    selectedCommission.value = commission
    refundForm.value.commissionId = commission.id
    refundForm.value.amount = commission.totalCost
    refundForm.value.searchQuery = `${commission.clientName} - ${commission.serviceName}`
  }
}

// 动态生成年份选项（当前年份及前后各一年）
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return [
    { label: String(currentYear - 1), value: currentYear - 1 },
    { label: String(currentYear), value: currentYear },
    { label: String(currentYear + 1), value: currentYear + 1 }
  ]
})

onMounted(async () => {
  try {
    const commissions = await window.api.db.getVGenCommissions()
    vgenCommissions.value = commissions

    const refundsData = await window.api.db.getRefunds()
    refunds.value = refundsData

    console.log(`Dashboard loaded ${commissions.length} commissions and ${refundsData.length} refunds for year ${selectedYear.value}`)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

// 退款记录相关函数

// 按日期排序退款记录（最新的在前）
const sortedRefunds = computed(() => {
  return [...refunds.value].sort((a, b) => {
    return b.date.localeCompare(a.date)
  })
})

// 获取订单标签
const getCommissionLabel = (commissionId: string) => {
  const commission = vgenCommissions.value.find(c => c.id === commissionId)
  if (commission) {
    return `${commission.clientName} - ${commission.serviceName} ($${commission.totalCost.toFixed(2)})`
  }
  return '未知订单'
}

// 打开添加退款对话框
const openAddRefundModal = () => {
  isEditMode.value = false
  editingRefundId.value = null
  refundForm.value = {
    dateTimestamp: Date.now(),
    amount: 0,
    reason: '',
    notes: '',
    commissionId: undefined,
    searchQuery: ''
  }
  selectedCommission.value = null
  showRefundModal.value = true
}

// 打开编辑退款对话框
const handleEditRefund = (refund: Refund) => {
  isEditMode.value = true
  editingRefundId.value = refund.id

  // 填充表单数据
  const date = parseDateString(refund.date)
  refundForm.value = {
    dateTimestamp: date.getTime(),
    amount: refund.amount,
    reason: refund.reason,
    notes: refund.notes || '',
    commissionId: refund.commissionId,
    searchQuery: ''
  }

  // 如果有关联订单，设置选中的订单
  if (refund.commissionId) {
    const commission = vgenCommissions.value.find(c => c.id === refund.commissionId)
    if (commission) {
      selectedCommission.value = commission
      refundForm.value.searchQuery = `${commission.clientName} - ${commission.serviceName}`
    }
  } else {
    selectedCommission.value = null
  }

  showRefundModal.value = true
}

// 保存退款（新增或编辑）
const handleSaveRefund = async () => {
  try {
    await refundFormRef.value?.validate()

    // 转换时间戳为日期字符串
    const date = new Date(refundForm.value.dateTimestamp)
    const dateStr = formatDateString(date)

    if (isEditMode.value && editingRefundId.value) {
      // 编辑模式：更新现有退款
      const index = refunds.value.findIndex(r => r.id === editingRefundId.value)
      if (index !== -1) {
        const updatedRefund: Refund = {
          id: editingRefundId.value,
          date: dateStr,
          amount: refundForm.value.amount,
          reason: refundForm.value.reason,
          commissionId: refundForm.value.commissionId,
          notes: refundForm.value.notes || undefined
        }

        // 更新数组和数据库
        refunds.value[index] = updatedRefund
        await window.api.db.deleteRefund(editingRefundId.value)
        await window.api.db.addRefund(updatedRefund)

        message.success('退款记录已更新')
      }
    } else {
      // 新增模式：添加新退款
      const newRefund: Refund = {
        id: `refund-${Date.now()}`,
        date: dateStr,
        amount: refundForm.value.amount,
        reason: refundForm.value.reason,
        commissionId: refundForm.value.commissionId,
        notes: refundForm.value.notes || undefined
      }

      await window.api.db.addRefund(newRefund)
      refunds.value.push(newRefund)

      message.success('退款记录已添加')
    }

    handleCancelRefund()
  } catch (error) {
    message.error(isEditMode.value ? '更新退款失败' : '添加退款失败')
    console.error(error)
  }
}

// 取消退款操作
const handleCancelRefund = () => {
  showRefundModal.value = false
  isEditMode.value = false
  editingRefundId.value = null
  selectedCommission.value = null
  refundForm.value = {
    dateTimestamp: Date.now(),
    amount: 0,
    reason: '',
    notes: '',
    commissionId: undefined,
    searchQuery: ''
  }
}

// 删除退款
const handleDeleteRefund = (refund: Refund) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除这条退款记录吗？\n金额: $${refund.amount.toFixed(2)}\n原因: ${refund.reason}`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await window.api.db.deleteRefund(refund.id)
        const index = refunds.value.findIndex(r => r.id === refund.id)
        if (index !== -1) {
          refunds.value.splice(index, 1)
        }
        message.success('退款记录已删除')
      } catch (error) {
        message.error('删除失败')
        console.error(error)
      }
    }
  })
}

// 统计数据
// 根据开关状态决定收入计算范围
const paidCommissions = computed(() => {
  if (includeNonCompletedPaid.value) {
    // 包含所有已付费订单（不论状态）
    return vgenCommissions.value.filter(c => c.paymentStatus === 'PAID')
  } else {
    // 仅包含已完成的订单
    return vgenCommissions.value.filter(c => c.status === 'COMPLETED')
  }
})

const completedCommissions = computed(() =>
  vgenCommissions.value.filter(c => c.status === 'COMPLETED')
)

const completedCount = computed(() => completedCommissions.value.length)

const inProgressCount = computed(() => 
  vgenCommissions.value.filter(c => c.status === 'IN_PROGRESS').length
)

const totalCommissions = computed(() => vgenCommissions.value.length)

// 本月收入（根据开关使用不同数据源）
const monthlyRevenue = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return paidCommissions.value
    .filter(c => {
      // 使用 parseDateString 确保正确解析日期（避免UTC转换）
      const dateStr = c.completedDate || c.startDate
      const date = parseDateString(dateStr)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, c) => sum + c.totalCost, 0)
})

// 月度增长
const monthlyGrowth = computed(() => {
  // 简化计算，实际应该比较上个月
  return 15.6
})

// 平均单价（根据开关使用不同数据源）
const averagePrice = computed(() => {
  if (paidCommissions.value.length === 0) return 0
  const total = paidCommissions.value.reduce((sum, c) => sum + c.totalCost, 0)
  return total / paidCommissions.value.length
})

// 月度数据（根据开关使用不同数据源，包含退款）
const monthlyData = computed(() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const data = months.map((month, index) => {
    const revenue = paidCommissions.value
      .filter(c => {
        // 使用 parseDateString 确保正确解析日期（避免UTC转换）
        const dateStr = c.completedDate || c.startDate
        const date = parseDateString(dateStr)
        return date.getMonth() === index && date.getFullYear() === selectedYear.value
      })
      .reduce((sum, c) => sum + c.totalCost, 0)

    // 计算当月退款 - 使用 parseDateString 避免UTC转换
    const refundAmount = refunds.value
      .filter(r => {
        const date = parseDateString(r.date)
        return date.getMonth() === index && date.getFullYear() === selectedYear.value
      })
      .reduce((sum, r) => sum + r.amount, 0)

    return {
      month,
      revenue,
      refund: refundAmount,
      netIncome: revenue - refundAmount
    }
  })

  return data
})

const maxRevenue = computed(() => {
  // 找出所有月份中收入和退款的最大值
  const maxRevenueValue = Math.max(...monthlyData.value.map(d => d.revenue))
  const maxRefundValue = Math.max(...monthlyData.value.map(d => d.refund))
  const overallMax = Math.max(maxRevenueValue, maxRefundValue)
  return Math.max(overallMax, 1) // 至少为1，避免除以0
})

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
  min-width: 900px;  /* 降低最小宽度以支持2K及更小屏幕 */
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

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #888;
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
  height: 340px;
  overflow: hidden;
}

.revenue-bars-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 4px;
  padding: 8px 0;
}

.revenue-bar-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  transition: transform 0.2s;
}

.revenue-bar-wrapper:hover {
  transform: scale(1.05);
  z-index: 10;
}

/* 收入区域（上半部分） */
.revenue-section {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}

/* 退款区域（下半部分） */
.refund-section {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
}

/* 柱子基础样式 */
.bar-fill {
  width: 100%;
  max-width: 32px;
  border-radius: 5px;
  min-height: 4px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.revenue-bar-wrapper:hover .bar-fill {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

/* 收入柱子（向上，绿色渐变） */
.bar-revenue {
  background: linear-gradient(to top, #10B981, #34D399, #6EE7B7);
  border-radius: 5px 5px 2px 2px;
}

.revenue-bar-wrapper:hover .bar-revenue {
  background: linear-gradient(to top, #059669, #10B981, #34D399);
}

/* 退款柱子（向下，红色渐变） */
.bar-refund {
  background: linear-gradient(to bottom, #EF4444, #DC2626, #B91C1C);
  border-radius: 2px 2px 5px 5px;
}

.revenue-bar-wrapper:hover .bar-refund {
  background: linear-gradient(to bottom, #DC2626, #B91C1C, #991B1B);
}

/* 柱子内部光泽效果 */
.bar-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent);
  border-radius: 5px 5px 0 0;
  pointer-events: none;
}

.bar-refund .bar-shine {
  top: auto;
  bottom: 0;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.15), transparent);
  border-radius: 0 0 5px 5px;
}

/* 中间标签区域 */
.bar-center {
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 6px;
  min-width: 45px;
  transition: background 0.2s;
}

.revenue-bar-wrapper:hover .bar-center {
  background: rgba(139, 92, 246, 0.1);
}

/* 月份标签 */
.bar-label {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* 净收入显示 */
.bar-net-income {
  font-size: 13px;
  font-weight: 700;
  color: #10B981;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.bar-net-income.negative {
  color: #EF4444;
}

/* 数值标签（收入/退款金额） */
.bar-value {
  font-size: 10px;
  font-weight: 600;
  margin: 3px 0;
  transition: all 0.2s;
  min-height: 14px;
}

.revenue-value {
  color: #10B981;
  text-shadow: 0 1px 2px rgba(16, 185, 129, 0.3);
  margin-bottom: 2px;
}

.refund-value {
  color: #EF4444;
  text-shadow: 0 1px 2px rgba(239, 68, 68, 0.3);
  margin-top: 2px;
}

.revenue-bar-wrapper:hover .bar-value {
  transform: scale(1.1);
  font-weight: 700;
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

/* 退款对话框 - 选中订单信息样式 */
.selected-commission-info {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.selected-commission-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.selected-commission-info .info-row:not(:last-child) {
  border-bottom: 1px solid rgba(139, 92, 246, 0.08);
}

.selected-commission-info .info-label {
  font-size: 13px;
  color: #888;
  font-weight: 500;
}

.selected-commission-info .info-value {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 600;
}

.selected-commission-info .info-value.price {
  color: #54C5B7;
  font-size: 16px;
}

/* 退款记录区域 */
.refunds-section {
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
  margin-top: 32px;
}

.refunds-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.refunds-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.refunds-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.refund-item {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.refund-item:hover {
  background: #333;
  border-color: rgba(239, 68, 68, 0.3);
  transform: translateY(-2px);
}

.refund-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #3a3a3a;
}

.refund-date {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 14px;
}

.refund-amount {
  font-size: 24px;
  font-weight: 700;
  color: #EF4444;
}

.refund-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.refund-details > div {
  display: flex;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.refund-details .label {
  color: #888;
  font-weight: 500;
  min-width: 80px;
  flex-shrink: 0;
}

.refund-details .value {
  color: #e0e0e0;
  flex: 1;
}

.refund-commission .value {
  color: #8B5CF6;
  font-weight: 600;
}

.refund-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>

