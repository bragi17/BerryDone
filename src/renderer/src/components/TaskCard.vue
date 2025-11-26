<template>
  <div class="task-card">
    <!-- 支付状态标签 -->
    <div v-if="paymentStatus" class="payment-badge" :class="paymentStatus.toLowerCase()">
      {{ paymentStatus }}
    </div>
    
    <!-- 详情按钮 -->
    <div class="card-menu">
      <n-dropdown :options="menuOptions" @select="handleMenuSelect">
        <n-icon :component="ChatboxOutline" class="detail-icon" size="20" />
      </n-dropdown>
    </div>
    
    <!-- 客户名 -->
    <div class="client-name">{{ clientName }}</div>
    
    <!-- 项目名 -->
    <div class="project-name">{{ projectName }}</div>
    
    <!-- 日期 -->
    <div class="task-date">
      <n-icon :component="CalendarOutline" size="14" />
      <span>{{ formatDateRange }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NDropdown } from 'naive-ui'
import {
  CalendarOutline,
  ChatboxOutline
} from '@vicons/ionicons5'
import { Task } from '../store'

interface Props {
  task: Task
  paymentStatus?: string // PAID, UNPAID, etc.
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
}>()

// 从 title 中提取客户名和项目名
// 格式：ClientName - ProjectName
const clientName = computed(() => {
  const parts = props.task.title.split(' - ')
  return parts[0] || props.task.title
})

const projectName = computed(() => {
  const parts = props.task.title.split(' - ')
  return parts.slice(1).join(' - ') || ''
})

// 格式化日期范围
const formatDateRange = computed(() => {
  const start = new Date(props.task.startDate)
  const end = new Date(props.task.endDate)
  const formatMonth = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' })
  const formatDate = (date: Date) => `${formatMonth(date)} ${date.getFullYear()}`
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    // Same month: "Nov 2025 - Nov 30, 2025"
    return `${formatDate(start)} - ${formatMonth(end)} ${end.getDate()}, ${end.getFullYear()}`
  } else {
    return `${formatDate(start)} - ${formatDate(end)}`
  }
})

const menuOptions = [
  { label: '查看详情', key: 'detail' },
  { label: '编辑', key: 'edit' },
  { label: '删除', key: 'delete' }
]

const handleMenuSelect = (key: string) => {
  if (key === 'edit' || key === 'detail') {
    emit('edit', props.task)
  } else if (key === 'delete') {
    emit('delete', props.task.id)
  }
}
</script>

<style scoped>
.task-card {
  position: relative;
  background: linear-gradient(135deg, #3a3a4a 0%, #2a2a3a 100%);
  border-radius: 12px;
  padding: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.task-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* 支付状态标签 */
.payment-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.payment-badge.paid {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
  border: 1px solid #10B981;
}

.payment-badge.unpaid {
  background: rgba(245, 158, 11, 0.2);
  color: #F59E0B;
  border: 1px solid #F59E0B;
}

/* 详情按钮 */
.card-menu {
  position: absolute;
  top: 12px;
  right: 12px;
}

.detail-icon {
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  color: #888;
}

.detail-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

/* 客户名 */
.client-name {
  font-size: 18px;
  font-weight: 700;
  color: #e0e0e0;
  margin-top: 32px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 项目名 */
.project-name {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

/* 日期 */
.task-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #666;
  margin-top: 8px;
}

.task-date span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-date .n-icon {
  opacity: 0.6;
}
</style>

