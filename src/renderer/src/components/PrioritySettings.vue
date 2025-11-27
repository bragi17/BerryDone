<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="优先级设置"
    style="width: 900px; max-height: 85vh;"
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

        <div class="basic-priority-grid">
          <div class="priority-row">
            <div class="priority-info">
              <span class="label-text">截止日期优先级</span>
              <span class="priority-value">{{ localConfig.deadlinePriority }}</span>
            </div>
            <div class="priority-slider">
              <n-slider
                v-model:value="localConfig.deadlinePriority"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1', 5: '5', 10: '10' }"
              />
            </div>
          </div>

          <div class="priority-row">
            <div class="priority-info">
              <span class="label-text">接单时间优先级</span>
              <span class="priority-value">{{ localConfig.orderTimePriority }}</span>
            </div>
            <div class="priority-slider">
              <n-slider
                v-model:value="localConfig.orderTimePriority"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1', 5: '5', 10: '10' }"
              />
            </div>
          </div>

          <div class="priority-row">
            <div class="priority-info">
              <span class="label-text">费用优先级</span>
              <span class="priority-value">{{ localConfig.costPriority }}</span>
            </div>
            <div class="priority-slider">
              <n-slider
                v-model:value="localConfig.costPriority"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1', 5: '5', 10: '10' }"
              />
            </div>
          </div>

          <div class="priority-row">
            <div class="priority-info">
              <span class="label-text">WIP（进行中）优先级</span>
              <span class="priority-value">{{ localConfig.wipPriority }}</span>
            </div>
            <div class="priority-slider">
              <n-slider
                v-model:value="localConfig.wipPriority"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1', 5: '5', 10: '10' }"
              />
            </div>
          </div>

          <div class="priority-row">
            <div class="priority-info">
              <span class="label-text">Ready（待处理）优先级</span>
              <span class="priority-value">{{ localConfig.readyPriority }}</span>
            </div>
            <div class="priority-slider">
              <n-slider
                v-model:value="localConfig.readyPriority"
                :min="1"
                :max="10"
                :step="1"
                :marks="{ 1: '1', 5: '5', 10: '10' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 服务优先级设置 -->
      <div class="section">
        <h3 class="section-title">服务优先级设置</h3>
        <p class="section-desc">按分类或单独设置每个服务的优先级（默认为1）</p>

        <div v-if="!servicesLoading && servicesByCategory.length > 0" class="services-list">
          <div
            v-for="categoryGroup in servicesByCategory"
            :key="categoryGroup.category"
            class="category-group"
          >
            <!-- 分类标题行 -->
            <div class="category-header">
              <div class="category-header-left" @click="toggleCategory(categoryGroup.category)">
                <n-icon
                  :component="expandedCategories.has(categoryGroup.category) ? ChevronDownIcon : ChevronForwardIcon"
                  size="18"
                />
                <span class="category-name">{{ categoryGroup.category }}</span>
                <span class="category-count">({{ categoryGroup.services.length }})</span>
                <n-tag
                  v-if="categoryGroup.hasActiveOrders"
                  type="success"
                  size="small"
                  :bordered="false"
                >
                  有订单
                </n-tag>
              </div>
              <div class="category-priority-control" @click.stop>
                <span class="priority-label-mini">分类优先级</span>
                <span class="priority-value-mini">{{ getCategoryPriority(categoryGroup.category) }}</span>
                <div class="slider-wrapper">
                  <n-slider
                    :value="getCategoryPriority(categoryGroup.category)"
                    @update:value="(val) => handleCategoryPriorityChange(categoryGroup.category, val)"
                    :min="1"
                    :max="10"
                    :step="1"
                    :tooltip="false"
                  />
                </div>
              </div>
            </div>

            <!-- 服务列表 -->
            <div v-show="expandedCategories.has(categoryGroup.category)" class="services-container">
              <div
                v-for="service in categoryGroup.services"
                :key="service.id"
                class="service-row"
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
                <div class="service-priority-control">
                  <span class="priority-value-mini">{{ getServicePriority(service.serviceId) }}</span>
                  <div class="slider-wrapper">
                    <n-slider
                      :value="getServicePriority(service.serviceId)"
                      @update:value="(val) => handleServicePriorityChange(service.serviceId, val)"
                      :min="1"
                      :max="10"
                      :step="1"
                      :tooltip="false"
                    />
                  </div>
                </div>
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
      wipPriority: newConfig.wipPriority ?? 8,
      readyPriority: newConfig.readyPriority ?? 5,
      categoryPriorities: { ...newConfig.categoryPriorities },
      servicePriorities: { ...newConfig.servicePriorities }
    }
  }
}, { immediate: true, deep: true })

// 获取分类优先级（如果未设置则返回1）
const getCategoryPriority = (category: string): number => {
  return localConfig.value.categoryPriorities[category] || 1
}

// 获取服务优先级（如果未设置则返回1）
const getServicePriority = (serviceId: string): number => {
  return localConfig.value.servicePriorities[serviceId] || 1
}

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
    wipPriority: localConfig.value.wipPriority,
    readyPriority: localConfig.value.readyPriority,
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
  max-height: 65vh;
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
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0 0 6px 0;
}

.section-desc {
  font-size: 12px;
  color: #888;
  margin: 0 0 16px 0;
}

/* 基础优先级网格 */
.basic-priority-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.priority-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 12px;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
}

.priority-row:hover {
  border-color: #8B5CF6;
  background: #1e1e1e;
}

.priority-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
}

.priority-value {
  font-size: 16px;
  font-weight: 600;
  color: #8B5CF6;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 10px;
  border-radius: 6px;
  min-width: 32px;
  text-align: center;
}

.priority-slider {
  flex: 1;
  max-width: 400px;
}

/* 服务列表 */
.services-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 4px;
}

.category-group {
  margin-bottom: 8px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
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
  padding: 10px 14px;
  background: #1e1e1e;
  gap: 16px;
}

.category-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex: 1;
  transition: all 0.2s;
}

.category-header-left:hover {
  color: #8B5CF6;
}

.category-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.category-count {
  font-size: 11px;
  color: #666;
}

.category-priority-control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
}

.priority-label-mini {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.priority-value-mini {
  font-size: 14px;
  font-weight: 600;
  color: #8B5CF6;
  background: rgba(139, 92, 246, 0.1);
  padding: 1px 8px;
  border-radius: 5px;
  min-width: 28px;
  text-align: center;
}

.slider-wrapper {
  flex: 1;
  max-width: 180px;
}

.services-container {
  padding: 6px;
  background: #1a1a1a;
}

.service-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 3px;
  border-radius: 6px;
  background: #1e1e1e;
  border: 1px solid transparent;
  transition: all 0.2s;
  gap: 16px;
}

.service-row:hover {
  background: #242424;
  border-color: #3a3a3a;
}

.service-row.has-orders {
  background: rgba(251, 191, 36, 0.05);
  border-color: rgba(251, 191, 36, 0.2);
}

.service-row.has-orders:hover {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.service-name {
  font-size: 12px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-priority-control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 230px;
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
  font-size: 13px;
}
</style>
