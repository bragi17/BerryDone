<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="优先级设置"
    style="width: 800px; max-height: 80vh;"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <div class="priority-settings">
      <!-- 基础优先级设置 -->
      <div class="section">
        <h3 class="section-title">基础优先级设置</h3>
        <p class="section-desc">优先级范围: 1-10，数字越大优先级越高</p>

        <div class="priority-item">
          <div class="priority-label">
            <span class="label-text">截止日期优先级</span>
            <span class="priority-value">{{ localConfig.deadlinePriority }}</span>
          </div>
          <n-slider
            v-model:value="localConfig.deadlinePriority"
            :min="1"
            :max="10"
            :step="1"
            :marks="{
              1: '1',
              5: '5',
              10: '10'
            }"
          />
          <p class="priority-hint">截止日期越近的任务优先级越高</p>
        </div>

        <div class="priority-item">
          <div class="priority-label">
            <span class="label-text">接单时间优先级</span>
            <span class="priority-value">{{ localConfig.orderTimePriority }}</span>
          </div>
          <n-slider
            v-model:value="localConfig.orderTimePriority"
            :min="1"
            :max="10"
            :step="1"
            :marks="{
              1: '1',
              5: '5',
              10: '10'
            }"
          />
          <p class="priority-hint">越早接单的任务优先级越高</p>
        </div>

        <div class="priority-item">
          <div class="priority-label">
            <span class="label-text">费用优先级</span>
            <span class="priority-value">{{ localConfig.costPriority }}</span>
          </div>
          <n-slider
            v-model:value="localConfig.costPriority"
            :min="1"
            :max="10"
            :step="1"
            :marks="{
              1: '1',
              5: '5',
              10: '10'
            }"
          />
          <p class="priority-hint">费用越高的任务优先级越高</p>
        </div>
      </div>

      <!-- 服务优先级设置 -->
      <div class="section">
        <h3 class="section-title">服务优先级设置</h3>
        <p class="section-desc">按分类或单独设置每个服务的优先级</p>

        <div v-if="!servicesLoading && servicesByCategory.length > 0" class="services-list">
          <div
            v-for="categoryGroup in servicesByCategory"
            :key="categoryGroup.category"
            class="category-group"
          >
            <!-- 分类标题 -->
            <div class="category-header" @click="toggleCategory(categoryGroup.category)">
              <div class="category-header-left">
                <n-icon :component="expandedCategories.has(categoryGroup.category) ? ChevronDownIcon : ChevronForwardIcon" />
                <span class="category-name">{{ categoryGroup.category }}</span>
                <span class="category-count">({{ categoryGroup.services.length }})</span>
                <n-tag
                  v-if="categoryGroup.hasActiveOrders"
                  type="success"
                  size="small"
                  :bordered="false"
                  style="margin-left: 8px;"
                >
                  有订单
                </n-tag>
              </div>
              <div class="category-priority">
                <span class="priority-label-small">分类优先级</span>
                <n-input-number
                  v-model:value="localConfig.categoryPriorities[categoryGroup.category]"
                  :min="1"
                  :max="10"
                  :step="1"
                  size="small"
                  style="width: 80px;"
                  @click.stop
                  @update:value="(val) => handleCategoryPriorityChange(categoryGroup.category, val)"
                />
              </div>
            </div>

            <!-- 服务列表 -->
            <div v-show="expandedCategories.has(categoryGroup.category)" class="services-container">
              <div
                v-for="service in categoryGroup.services"
                :key="service.id"
                class="service-item"
                :class="{ 'has-orders': service.hasOrders }"
              >
                <div class="service-info">
                  <span class="service-name">{{ service.title }}</span>
                  <n-tag
                    v-if="service.hasOrders"
                    type="warning"
                    size="tiny"
                    :bordered="false"
                  >
                    {{ service.orderCount }} 个订单
                  </n-tag>
                </div>
                <n-input-number
                  v-model:value="localConfig.servicePriorities[service.serviceId]"
                  :min="1"
                  :max="10"
                  :step="1"
                  size="small"
                  style="width: 80px;"
                  placeholder="默认"
                  @update:value="(val) => handleServicePriorityChange(service.serviceId, val)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="servicesLoading" class="loading-state">
          <n-spin size="medium" />
          <p>加载服务数据...</p>
        </div>

        <div v-else class="empty-state">
          <p>暂无服务数据</p>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSave">
          保存设置
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NSlider,
  NButton,
  NSpace,
  NTag,
  NIcon,
  NInputNumber,
  NSpin
} from 'naive-ui'
import { ChevronForwardOutline as ChevronForwardIcon, ChevronDownOutline as ChevronDownIcon } from '@vicons/ionicons5'
import type { PriorityConfig } from '../types/scheduler'
import { DEFAULT_PRIORITY_CONFIG } from '../types/scheduler'

interface Props {
  show: boolean
  config: PriorityConfig
  services?: any[]
  commissions?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  services: () => [],
  commissions: () => []
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'save': [config: PriorityConfig]
}>()

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// 本地配置副本
const localConfig = ref<PriorityConfig>({ ...DEFAULT_PRIORITY_CONFIG })

// 展开的分类
const expandedCategories = ref<Set<string>>(new Set())

// 加载状态
const servicesLoading = computed(() => {
  return !props.services || props.services.length === 0
})

// 按分类分组服务
const servicesByCategory = computed(() => {
  const groups: Record<string, {
    category: string
    services: any[]
    hasActiveOrders: boolean
  }> = {}

  // 创建serviceID到订单数量的映射
  const serviceOrderCounts = new Map<string, number>()
  const activeStatuses = ['IN_PROGRESS', 'PENDING']

  props.commissions.forEach(commission => {
    if (commission.serviceID && activeStatuses.includes(commission.status)) {
      const count = serviceOrderCounts.get(commission.serviceID) || 0
      serviceOrderCounts.set(commission.serviceID, count + 1)
    }
  })

  // 分组服务
  props.services.forEach(service => {
    const category = service.category || '其他'

    if (!groups[category]) {
      groups[category] = {
        category,
        services: [],
        hasActiveOrders: false
      }
    }

    const orderCount = serviceOrderCounts.get(service.serviceId) || serviceOrderCounts.get(service.id) || 0
    const hasOrders = orderCount > 0

    if (hasOrders) {
      groups[category].hasActiveOrders = true
    }

    groups[category].services.push({
      ...service,
      hasOrders,
      orderCount
    })
  })

  // 转换为数组并排序（有订单的分类优先）
  return Object.values(groups).sort((a, b) => {
    if (a.hasActiveOrders && !b.hasActiveOrders) return -1
    if (!a.hasActiveOrders && b.hasActiveOrders) return 1
    return a.category.localeCompare(b.category)
  })
})

// 监听props.config变化，更新本地配置
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    localConfig.value = {
      deadlinePriority: newConfig.deadlinePriority,
      orderTimePriority: newConfig.orderTimePriority,
      costPriority: newConfig.costPriority,
      categoryPriorities: { ...newConfig.categoryPriorities },
      servicePriorities: { ...newConfig.servicePriorities }
    }
  }
}, { immediate: true, deep: true })

// 切换分类展开/折叠
const toggleCategory = (category: string) => {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
}

// 处理分类优先级变化
const handleCategoryPriorityChange = (category: string, value: number | null) => {
  if (value === null || value === undefined) {
    delete localConfig.value.categoryPriorities[category]
  } else {
    localConfig.value.categoryPriorities[category] = value
  }
}

// 处理服务优先级变化
const handleServicePriorityChange = (serviceId: string, value: number | null) => {
  if (value === null || value === undefined) {
    delete localConfig.value.servicePriorities[serviceId]
  } else {
    localConfig.value.servicePriorities[serviceId] = value
  }
}

// 保存设置
const handleSave = () => {
  // 清理空值
  const cleanConfig: PriorityConfig = {
    deadlinePriority: localConfig.value.deadlinePriority,
    orderTimePriority: localConfig.value.orderTimePriority,
    costPriority: localConfig.value.costPriority,
    categoryPriorities: {},
    servicePriorities: {}
  }

  // 只保留有效的优先级设置
  Object.entries(localConfig.value.categoryPriorities).forEach(([key, value]) => {
    if (value && value !== 1) { // 只保存非默认值
      cleanConfig.categoryPriorities[key] = value
    }
  })

  Object.entries(localConfig.value.servicePriorities).forEach(([key, value]) => {
    if (value && value !== 1) { // 只保存非默认值
      cleanConfig.servicePriorities[key] = value
    }
  })

  emit('save', cleanConfig)
  visible.value = false
}

// 取消
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.priority-settings {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

/* 自定义滚动条 */
.priority-settings::-webkit-scrollbar {
  width: 6px;
}

.priority-settings::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 3px;
}

.priority-settings::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.priority-settings::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 区块样式 */
.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 13px;
  color: #aaa;
  margin: 0 0 20px 0;
}

/* 优先级项 */
.priority-item {
  margin-bottom: 24px;
  padding: 16px;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
}

.priority-item:hover {
  border-color: #8B5CF6;
  background: #1e1e1e;
}

.priority-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
}

.priority-value {
  font-size: 18px;
  font-weight: 600;
  color: #8B5CF6;
  background: rgba(139, 92, 246, 0.1);
  padding: 4px 12px;
  border-radius: 8px;
}

.priority-hint {
  font-size: 12px;
  color: #888;
  margin: 8px 0 0 0;
}

/* 服务列表 */
.services-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.category-group {
  margin-bottom: 12px;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a1a;
  transition: all 0.2s;
}

.category-group:hover {
  border-color: #3a3a3a;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  background: #1e1e1e;
  transition: all 0.2s;
}

.category-header:hover {
  background: #242424;
}

.category-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.category-count {
  font-size: 12px;
  color: #888;
}

.category-priority {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-label-small {
  font-size: 12px;
  color: #aaa;
}

.services-container {
  padding: 8px;
  background: #1a1a1a;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  background: #1e1e1e;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.service-item:hover {
  background: #242424;
  border-color: #3a3a3a;
}

.service-item.has-orders {
  background: rgba(251, 191, 36, 0.05);
  border-color: rgba(251, 191, 36, 0.2);
}

.service-item.has-orders:hover {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-name {
  font-size: 13px;
  color: #e0e0e0;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #888;
}

.loading-state p,
.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
