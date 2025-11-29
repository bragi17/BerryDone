<template>
  <div class="commissions-view">
    <div class="commissions-header">
      <h1 class="page-title">🎨 我的服务列表</h1>
      <div class="header-actions">
        <n-button quaternary @click="showWorkHoursModal = true">
          <template #icon>
            <n-icon :component="TimerOutline" />
          </template>
          默认工时设置
        </n-button>
        <n-button
          quaternary
          @click="updateServices"
          :loading="updating"
          :disabled="updating"
        >
          <template #icon>
            <n-icon :component="updating ? SyncOutline : RefreshOutline" />
          </template>
          {{ updating ? '更新中...' : '更新数据' }}
        </n-button>
        <n-button quaternary @click="refreshData">
          <template #icon>
            <n-icon :component="ReloadOutline" />
          </template>
          刷新显示
        </n-button>
        <n-button type="primary" @click="saveAllWorkHours">
          <template #icon>
            <n-icon :component="SaveOutline" />
          </template>
          保存工时
        </n-button>
      </div>
    </div>

    <!-- 更新进度 -->
    <n-alert
      v-if="updating"
      type="info"
      class="update-progress"
      :bordered="false"
    >
      <div class="progress-content">
        <n-spin size="small" />
        <div class="progress-text">
          <span>{{ updateMessage }}</span>
          <span v-if="updateLog" class="progress-log">{{ updateLog }}</span>
        </div>
        <n-progress
          type="line"
          :percentage="updateProgress"
          :show-indicator="false"
          style="flex: 1; margin-left: 16px;"
        />
      </div>
    </n-alert>

    <!-- 筛选器 -->
    <div class="filters-bar">
      <div class="filter-section">
        <span class="filter-label">分类筛选:</span>
        <div class="category-tags">
          <n-tag
            :type="selectedCategory === null ? 'primary' : 'default'"
            :bordered="false"
            @click="selectedCategory = null"
            class="category-tag"
            checkable
            :checked="selectedCategory === null"
          >
            全部 ({{ services.length }})
          </n-tag>
          <n-tag
            v-for="category in categories"
            :key="category"
            :type="selectedCategory === category ? 'primary' : 'default'"
            :bordered="false"
            @click="selectedCategory = category"
            class="category-tag"
            checkable
            :checked="selectedCategory === category"
          >
            {{ category }} ({{ getServicesByCategory(category).length }})
          </n-tag>
        </div>
      </div>

      <div class="filter-section">
        <span class="filter-label">状态筛选:</span>
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          style="width: 150px;"
        />
      </div>
    </div>

    <!-- 统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">显示服务</span>
        <span class="stat-value">{{ filteredServices.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已设置工时</span>
        <span class="stat-value">{{ servicesWithWorkHours }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">未设置工时</span>
        <span class="stat-value">{{ servicesWithoutWorkHours }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">开放接单</span>
        <span class="stat-value">{{ openServices }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已下单未设工时</span>
        <span class="stat-value stat-warning">{{ orderedWithoutWorkHours }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">自动更新</span>
        <span class="stat-hint">每天 23:30</span>
      </div>
    </div>

    <!-- 默认工时设置弹窗 -->
    <n-modal
      v-model:show="showWorkHoursModal"
      preset="card"
      title="默认工时设置"
      :style="{ width: '700px' }"
      :bordered="false"
      :closable="true"
      :mask-closable="true"
    >
      <template #header-extra>
        <n-icon :component="TimerOutline" size="20" />
      </template>

      <div class="work-hours-modal-content">
        <!-- 全局默认工时 -->
        <div class="modal-section">
          <div class="section-header">
            <n-icon :component="GlobeOutline" size="20" />
            <span class="section-title">全局默认工时</span>
          </div>
          <div class="section-description">
            为所有未设置工时的服务设置统一的默认工时
            <br />
            <span style="color: #8B5CF6; font-size: 13px;">
              <n-icon :component="InformationCircleOutline" size="14" style="vertical-align: middle;" />
              支持手动输入，最小单位为0.5小时，输入值将自动四舍五入到最近的0.5倍数
            </span>
          </div>
          <div class="section-content">
            <n-input-number
              v-model:value="globalDefaultWorkHours"
              :min="0.5"
              :max="200"
              :step="0.5"
              placeholder="输入默认工时"
              style="width: 200px;"
              size="large"
              @blur="handleGlobalWorkHoursBlur"
            >
              <template #suffix>小时</template>
            </n-input-number>
            <n-button
              type="primary"
              size="large"
              @click="applyGlobalWorkHours"
              :disabled="!globalDefaultWorkHours"
            >
              应用到所有未设置的服务
            </n-button>
          </div>
        </div>

        <n-divider />

        <!-- 按分类设置工时 -->
        <div class="modal-section">
          <div class="section-header">
            <n-icon :component="PricetagsOutline" size="20" />
            <span class="section-title">按分类设置工时</span>
          </div>
          <div class="section-description">
            为每个服务分类设置默认工时，优先级高于全局设置
            <br />
            <span style="color: #8B5CF6; font-size: 13px;">
              <n-icon :component="InformationCircleOutline" size="14" style="vertical-align: middle;" />
              支持手动输入，最小单位为0.5小时，输入值将自动四舍五入到最近的0.5倍数
            </span>
          </div>
          <div class="section-content category-list">
            <div
              v-for="category in categories"
              :key="category"
              class="category-item"
            >
              <div class="category-info">
                <span class="category-name">{{ category }}</span>
                <span class="category-count">{{ getServicesByCategory(category).length }} 个服务</span>
              </div>
              <div class="category-actions">
                <n-input-number
                  v-model:value="categoryDefaultWorkHours[category]"
                  :min="0.5"
                  :max="200"
                  :step="0.5"
                  placeholder="工时"
                  style="width: 140px;"
                  size="medium"
                  @blur="() => handleCategoryWorkHoursBlur(category)"
                >
                  <template #suffix>小时</template>
                </n-input-number>
                <n-button
                  type="primary"
                  size="medium"
                  @click="applyCategoryWorkHours(category)"
                  :disabled="!categoryDefaultWorkHours[category]"
                >
                  应用
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 说明 -->
        <n-alert type="info" :bordered="false" style="margin-top: 20px;">
          <template #icon>
            <n-icon :component="InformationCircleOutline" />
          </template>
          <div style="line-height: 1.6;">
            <strong>优先级说明：</strong><br />
            单个服务设置 > 分类设置 > 全局设置<br />
            <strong>提示：</strong>设置后需要点击页面顶部的"保存工时"按钮才会永久保存
          </div>
        </n-alert>
      </div>
    </n-modal>

    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredServices.length === 0 && services.length > 0" class="empty-state">
      <n-icon :component="FilterOutline" size="64" color="#666" />
      <p>没有符合条件的服务</p>
      <n-button @click="clearFilters">
        清除筛选
      </n-button>
    </div>

    <div v-else-if="services.length === 0" class="empty-state">
      <n-icon :component="FolderOpenOutline" size="64" color="#666" />
      <p>暂无服务数据</p>
      <p class="hint">点击"更新数据"按钮获取最新服务列表</p>
    </div>

    <div v-else class="services-container">
      <!-- 按分类分组显示 -->
      <div 
        v-for="category in displayCategories" 
        :key="category"
        class="category-group"
      >
        <h2 class="category-group-title">{{ category || '未分类' }}</h2>
        
        <div class="services-grid">
          <div
            v-for="service in getServicesByCategory(category)"
            :key="service.id"
            class="service-card"
            :class="{
              'needs-workhours': isOrderedWithoutWorkHours(service.id),
              'has-order': orderedServiceIds.has(service.id)
            }"
            v-show="shouldShowService(service)"
          >
        <!-- 状态标签组 -->
        <div class="service-status-tags">
          <!-- 已下单标签 -->
          <n-tag
            v-if="orderedServiceIds.has(service.id)"
            :bordered="false"
            type="success"
            size="small"
            class="status-tag"
          >
            <template #icon>
              <n-icon :component="CheckmarkCircleOutline" size="14" />
            </template>
            有进行中的订单
          </n-tag>

          <!-- 需设定工时标签 -->
          <n-tag
            v-if="isOrderedWithoutWorkHours(service.id)"
            :bordered="false"
            type="warning"
            size="small"
            class="status-tag"
          >
            <template #icon>
              <n-icon :component="WarningOutline" size="14" />
            </template>
            需设定工时
          </n-tag>

          <!-- 服务状态标签 -->
          <n-tag
            v-if="!service.isOpen"
            :bordered="false"
            type="error"
            size="small"
            class="status-tag"
          >
            暂停接单
          </n-tag>
          <n-tag
            v-else-if="service.slots && service.slots.available === 0"
            :bordered="false"
            type="warning"
            size="small"
            class="status-tag"
          >
            已满
          </n-tag>
          <n-tag
            v-else
            :bordered="false"
            type="success"
            size="small"
            class="status-tag"
          >
            开放中
          </n-tag>
        </div>

        <!-- 服务信息 -->
        <div class="service-content service-content-no-image">
          <div class="service-header-row">
            <h3 class="service-title">{{ service.title }}</h3>
          </div>
          
          <div class="service-meta">
            <div class="meta-item">
              <n-icon :component="CashOutline" size="16" />
              <span>From ${{ service.price.from }} {{ service.price.currency }}</span>
            </div>
            
            <div v-if="service.deliveryTime" class="meta-item">
              <n-icon :component="TimeOutline" size="16" />
              <span>{{ service.deliveryTime }}</span>
            </div>
            
            <div v-if="service.slots" class="meta-item">
              <n-icon :component="LayersOutline" size="16" />
              <span>{{ service.slots.available }}/{{ service.slots.total }} 可用</span>
            </div>
          </div>

          <p v-if="service.description" class="service-description">
            {{ truncateText(service.description, 100) }}
          </p>

          <div v-if="service.tags && service.tags.length > 0" class="service-tags">
            <n-tag
              v-for="tag in service.tags.slice(0, 3)"
              :key="tag"
              size="small"
              :bordered="false"
            >
              {{ tag }}
            </n-tag>
          </div>

          <!-- 工时输入 -->
          <div class="workhours-section">
            <div class="workhours-label">
              <n-icon :component="TimeOutline" size="18" />
              <span>预计工时</span>
              <span style="font-size: 11px; color: #8B5CF6; margin-left: 8px;">
                (最小单位: 0.5小时)
              </span>
            </div>
            <div class="workhours-input-group">
              <n-input-number
                v-model:value="service.estimatedWorkHours"
                :min="0.5"
                :max="200"
                :step="0.5"
                placeholder="输入小时数"
                style="flex: 1;"
                @update:value="handleWorkHoursChange(service.id, $event)"
              >
                <template #suffix>
                  小时
                </template>
              </n-input-number>
              
              <!-- 快捷按钮 -->
              <div class="quick-buttons">
                <n-button 
                  size="small" 
                  quaternary 
                  @click="setWorkHours(service.id, 2)"
                >
                  2h
                </n-button>
                <n-button 
                  size="small" 
                  quaternary 
                  @click="setWorkHours(service.id, 4)"
                >
                  4h
                </n-button>
                <n-button 
                  size="small" 
                  quaternary 
                  @click="setWorkHours(service.id, 8)"
                >
                  8h
                </n-button>
              </div>
            </div>
            
            <!-- 工时提示 -->
            <div v-if="service.estimatedWorkHours" class="workhours-hint">
              <n-icon :component="InformationCircleOutline" size="14" />
              <span>约需 {{ Math.ceil(service.estimatedWorkHours / 8) }} 个工作日</span>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  NButton,
  NIcon,
  NInputNumber,
  NSpin,
  NAlert,
  NProgress,
  NTag,
  NSelect,
  NModal,
  NDivider,
  useMessage,
  useDialog
} from 'naive-ui'
import {
  RefreshOutline,
  SaveOutline,
  TimeOutline,
  TimerOutline,
  CashOutline,
  InformationCircleOutline,
  FolderOpenOutline,
  LayersOutline,
  SyncOutline,
  ReloadOutline,
  FilterOutline,
  SettingsOutline,
  GlobeOutline,
  PricetagsOutline,
  CheckmarkDoneOutline,
  SearchOutline,
  CheckmarkCircleOutline,
  WarningOutline
} from '@vicons/ionicons5'

interface VGenService {
  id: string
  serviceId: string
  title: string
  description: string
  category: string
  price: {
    from: number
    currency: string
  }
  imageUrl?: string
  isOpen: boolean
  deliveryTime?: string
  slots?: {
    total: number
    available: number
  }
  estimatedWorkHours?: number
  tags?: string[]
}

const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const loading = ref(true)
const services = ref<VGenService[]>([])
const workHoursChanges = ref<Map<string, number>>(new Map())

// 追踪是否有未保存的修改
const hasUnsavedChanges = computed(() => {
  return workHoursChanges.value.size > 0
})

// 批量工时设置相关
const showWorkHoursModal = ref(false)
const globalDefaultWorkHours = ref<number | null>(null)
const categoryDefaultWorkHours = ref<Record<string, number | null>>({})

// 已下单服务检查
const checkingOrders = ref(false)
const orderedServiceIds = ref<Set<string>>(new Set())

// 更新相关
const updating = ref(false)
const updateProgress = ref(0)
const updateMessage = ref('')
const updateLog = ref('')  // 终端日志信息

// 筛选相关
const selectedCategory = ref<string | null>(null)
const statusFilter = ref<'all' | 'open' | 'closed'>('all')

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '仅开放', value: 'open' },
  { label: '仅关闭', value: 'closed' }
]

// 统计信息
const servicesWithWorkHours = computed(() => {
  return services.value.filter(s => s.estimatedWorkHours && s.estimatedWorkHours > 0).length
})

const servicesWithoutWorkHours = computed(() => {
  return services.value.filter(s => !s.estimatedWorkHours || s.estimatedWorkHours === 0).length
})

const openServices = computed(() => {
  return services.value.filter(s => s.isOpen).length
})

// 已下单但未设置工时的服务数量
const orderedWithoutWorkHours = computed(() => {
  return Array.from(orderedServiceIds.value).filter(serviceId => {
    const service = services.value.find(s => s.id === serviceId)
    return service && (!service.estimatedWorkHours || service.estimatedWorkHours === 0)
  }).length
})

// 路由守卫 - 检测未保存的修改
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    dialog.warning({
      title: '未保存的修改',
      content: '您有未保存的工时设置，是否保存？',
      positiveText: '保存并离开',
      negativeText: '放弃修改',
      onPositiveClick: async () => {
        try {
          await saveAllWorkHours()
          next()
        } catch (error) {
          // 保存失败，取消导航
          next(false)
        }
      },
      onNegativeClick: () => {
        // 放弃修改，清空更改记录并离开
        workHoursChanges.value.clear()
        // 恢复原始值
        services.value.forEach(service => {
          const originalValue = workHoursChanges.value.get(service.id)
          if (originalValue !== undefined) {
            service.estimatedWorkHours = originalValue
          }
        })
        next()
      }
    })
  } else {
    next()
  }
})

// 判断某个服务是否是已下单但未设置工时
const isOrderedWithoutWorkHours = (serviceId: string) => {
  if (!orderedServiceIds.value.has(serviceId)) return false
  const service = services.value.find(s => s.id === serviceId)
  return service && (!service.estimatedWorkHours || service.estimatedWorkHours === 0)
}

// 获取所有分类
const categories = computed(() => {
  const cats = new Set(services.value.map(s => s.category || '').filter(Boolean))
  return Array.from(cats).sort()
})

// 显示的分类（根据筛选条件）
const displayCategories = computed(() => {
  if (selectedCategory.value !== null) {
    // 如果选择了特定分类，只显示该分类
    return [selectedCategory.value]
  }
  // 否则显示所有分类
  return categories.value
})

// 判断是否应该显示某个服务
const shouldShowService = (service: VGenService) => {
  // 状态筛选
  if (statusFilter.value === 'open' && !service.isOpen) {
    return false
  }
  if (statusFilter.value === 'closed' && service.isOpen) {
    return false
  }
  return true
}

// 筛选后的服务（用于统计）
const filteredServices = computed(() => {
  let filtered = services.value

  // 分类筛选
  if (selectedCategory.value !== null) {
    filtered = filtered.filter(s => s.category === selectedCategory.value)
  }

  // 状态筛选
  if (statusFilter.value === 'open') {
    filtered = filtered.filter(s => s.isOpen)
  } else if (statusFilter.value === 'closed') {
    filtered = filtered.filter(s => !s.isOpen)
  }

  return filtered
})

// 按分类获取服务
const getServicesByCategory = (category: string) => {
  return services.value.filter(s => (s.category || '') === category)
}

// 清除筛选
const clearFilters = () => {
  selectedCategory.value = null
  statusFilter.value = 'all'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const data = await window.api.db.getVGenServices()
    services.value = data
    console.log(`✅ 加载了 ${data.length} 个服务`)
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 刷新显示（从数据库重新加载）
const refreshData = async () => {
  await loadData()
  message.success('数据已刷新')
}

// 更新服务数据（从 VGen 抓取）
const updateServices = async () => {
  updating.value = true
  updateProgress.value = 0
  updateMessage.value = '开始更新...'
  
  try {
    const result = await window.api.vgen.updateServices()
    
    if (result.success) {
      message.success(`更新成功！获取了 ${result.count} 个服务`)
      await loadData()
    } else {
      message.error(`更新失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    console.error('更新失败:', error)
    message.error(`更新失败: ${error.message}`)
  } finally {
    updating.value = false
  }
}

// 设置工时
const setWorkHours = (id: string, hours: number) => {
  const service = services.value.find(s => s.id === id)
  if (service) {
    service.estimatedWorkHours = hours
    workHoursChanges.value.set(id, hours)
  }
}

// 工时改变处理
const handleWorkHoursChange = (id: string, value: number | null) => {
  if (value !== null) {
    // 自动修正到0.5的倍数
    const rounded = roundToHalfHour(value)
    if (rounded !== value) {
      const service = services.value.find(s => s.id === id)
      if (service) {
        service.estimatedWorkHours = rounded
        message.info(`已自动调整为 ${rounded} 小时（最小单位0.5小时）`)
      }
    }
    workHoursChanges.value.set(id, rounded!)
  }
}

// 保存所有工时
const saveAllWorkHours = async () => {
  if (workHoursChanges.value.size === 0) {
    message.warning('没有需要保存的更改')
    return
  }

  const changeCount = workHoursChanges.value.size

  try {
    // 保存服务的工时
    for (const [id, hours] of workHoursChanges.value) {
      await window.api.db.updateVGenServiceWorkHours(id, hours)
    }

    // 保存全局和类别默认工时到配置
    const serviceOverrides: Record<string, number> = {}
    for (const [id, hours] of workHoursChanges.value) {
      serviceOverrides[id] = hours
    }

    const config = {
      globalDefault: globalDefaultWorkHours.value || 8,
      categoryDefaults: Object.fromEntries(
        Object.entries(categoryDefaultWorkHours.value).filter(([_, v]) => v != null)
      ) as Record<string, number>,
      serviceOverrides: serviceOverrides
    }

    await window.api.db.saveWorkHoursConfig(config)

    workHoursChanges.value.clear()

    // 使用对话框显示成功消息
    dialog.success({
      title: '保存成功',
      content: `已成功保存 ${changeCount} 个工时数据及配置`,
      positiveText: '确定'
    })
  } catch (error) {
    console.error('保存工时失败:', error)
    dialog.error({
      title: '保存失败',
      content: '保存工时数据时发生错误，请重试',
      positiveText: '确定'
    })
    throw error // 重新抛出错误，让路由守卫能够捕获
  }
}

// 截断文本
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 自动修正工时到0.5的倍数
const roundToHalfHour = (value: number | null): number | null => {
  if (value === null || value === undefined) return null
  return Math.round(value * 2) / 2
}

// 处理全局工时输入框失焦
const handleGlobalWorkHoursBlur = () => {
  if (globalDefaultWorkHours.value !== null) {
    const rounded = roundToHalfHour(globalDefaultWorkHours.value)
    if (rounded !== globalDefaultWorkHours.value) {
      globalDefaultWorkHours.value = rounded
      message.info(`已自动调整为 ${rounded} 小时（最小单位0.5小时）`)
    }
  }
}

// 处理分类工时输入框失焦
const handleCategoryWorkHoursBlur = (category: string) => {
  const value = categoryDefaultWorkHours.value[category]
  if (value !== null && value !== undefined) {
    const rounded = roundToHalfHour(value)
    if (rounded !== value) {
      categoryDefaultWorkHours.value[category] = rounded
      message.info(`已自动调整为 ${rounded} 小时（最小单位0.5小时）`)
    }
  }
}

// 应用全局默认工时
const applyGlobalWorkHours = () => {
  if (!globalDefaultWorkHours.value) return

  let count = 0
  services.value.forEach(service => {
    if (!service.estimatedWorkHours || service.estimatedWorkHours === 0) {
      service.estimatedWorkHours = globalDefaultWorkHours.value
      workHoursChanges.value.set(service.id, globalDefaultWorkHours.value!)
      count++
    }
  })

  message.success(`已为 ${count} 个服务设置工时为 ${globalDefaultWorkHours.value} 小时`)
}

// 应用分类默认工时
const applyCategoryWorkHours = (category: string) => {
  const hours = categoryDefaultWorkHours.value[category]
  if (!hours) return

  let count = 0
  const categoryServices = getServicesByCategory(category)

  categoryServices.forEach(service => {
    if (!service.estimatedWorkHours || service.estimatedWorkHours === 0) {
      service.estimatedWorkHours = hours
      workHoursChanges.value.set(service.id, hours)
      count++
    }
  })

  message.success(`已为分类"${category}"的 ${count} 个服务设置工时为 ${hours} 小时`)
}

// 检查已下单服务
const checkOrderedServices = async () => {
  checkingOrders.value = true

  try {
    // 获取 VGen Commissions 数据
    const commissions = await window.api.db.getVGenCommissions()

    // 提取所有已下单的 serviceID
    const orderedIds = new Set<string>()

    commissions.forEach(commission => {
      // 使用 serviceID 进行精确匹配
      if (commission.serviceID) {
        const matchingService = services.value.find(s =>
          s.serviceId === commission.serviceID || s.id === commission.serviceID
        )

        if (matchingService) {
          orderedIds.add(matchingService.id)
        }
      }

      // 如果没有 serviceID，fallback 到名称匹配
      if (!commission.serviceID) {
        const matchingService = services.value.find(s =>
          s.title === commission.serviceName ||
          s.title === commission.projectName
        )

        if (matchingService) {
          orderedIds.add(matchingService.id)
        }
      }
    })

    orderedServiceIds.value = orderedIds

    console.log(`[Commissions] 检查完成:`, {
      totalCommissions: commissions.length,
      matchedServices: orderedIds.size,
      withoutWorkHours: orderedWithoutWorkHours.value
    })

    message.success(`检查完成！找到 ${orderedIds.size} 个已下单服务，其中 ${orderedWithoutWorkHours.value} 个未设置工时`)
  } catch (error: any) {
    console.error('检查已下单服务失败:', error)
    message.error(`检查失败: ${error.message}`)
  } finally {
    checkingOrders.value = false
  }
}

onMounted(async () => {
  await loadData()

  // 加载工时配置
  try {
    const config = await window.api.db.getWorkHoursConfig()
    if (config) {
      globalDefaultWorkHours.value = config.globalDefault || null
      categoryDefaultWorkHours.value = config.categoryDefaults || {}
    }
  } catch (error) {
    console.error('加载工时配置失败:', error)
  }

  // 自动检查已下单服务
  try {
    await checkOrderedServices()
  } catch (error) {
    console.error('自动检查已下单服务失败:', error)
  }

  // 监听更新进度
  window.api.vgen.onUpdateProgress((progress) => {
    updateProgress.value = progress.progress
    updateMessage.value = progress.message
    updateLog.value = progress.log || ''  // 更新日志信息
  })
})

onBeforeUnmount(() => {
  window.api.vgen.removeUpdateProgressListener()
})
</script>

<style scoped>
.commissions-view {
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

/* 可视化滚动条 */
.commissions-view::-webkit-scrollbar {
  width: 6px;
}

.commissions-view::-webkit-scrollbar-track {
  background: transparent;
}

.commissions-view::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.commissions-view::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.commissions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: #e0e0e0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 更新进度 */
.update-progress {
  margin-bottom: 20px;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.progress-log {
  font-size: 11px;
  color: #888;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  opacity: 0.8;
}

/* 筛选栏 */
.filters-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #1e1e1e;
  border-radius: 12px;
  margin-bottom: 20px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  color: #888;
  font-weight: 600;
  min-width: 80px;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.category-tag:hover {
  transform: translateY(-2px);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 24px;
  padding: 20px;
  background: #1e1e1e;
  border-radius: 12px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #54C5B7;
}

.stat-warning {
  color: #F59E0B;
}

.stat-hint {
  font-size: 11px;
  color: #666;
}

/* 工时配置面板 */
/* 默认工时设置弹窗样式 */
.work-hours-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.modal-section {
  padding: 20px 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.section-description {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
  line-height: 1.6;
}

.section-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.category-list {
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1e1e1e;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
  min-width: 100%;
}

.category-item:hover {
  border-color: #54C5B7;
  background: #252525;
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-name {
  font-size: 15px;
  font-weight: 500;
  color: #e0e0e0;
}

.category-count {
  font-size: 13px;
  color: #888;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 旧的面板样式（已移除，保留部分通用样式） */
.workhours-config-panel {
  background: #1e1e1e;
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid #2a2a2a;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #252525;
  border-bottom: 1px solid #2a2a2a;
  cursor: pointer;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.panel-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #252525;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.config-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.config-hint {
  font-size: 13px;
  color: #888;
  padding: 0 8px;
}

.category-configs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 12px;
}

.category-config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.category-name {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 500;
  min-width: 150px;
}

.category-config-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #888;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: #666;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}

.empty-state .hint {
  font-size: 14px;
  color: #888;
}

/* Services 容器 */
.services-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 分类组 */
.category-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-group-title {
  font-size: 24px;
  font-weight: 700;
  color: #e0e0e0;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #8B5CF6;
  display: inline-block;
  align-self: flex-start;
}

/* Services 网格 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* Service 卡片 */
.service-card {
  background: linear-gradient(135deg, #2a2a3a 0%, #1e1e2e 100%);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid #2a2a2a;
  position: relative;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  border-color: #8B5CF6;
}

/* 已下单卡片 */
.service-card.has-order {
  border-color: #54C5B7;
}

/* 缺少工时高亮 */
.service-card.needs-workhours {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 2px solid #ff9800;
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0%, 100% {
    border-color: #ff9800;
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
  }
  50% {
    border-color: #ff9800;
    box-shadow: 0 0 0 8px rgba(255, 152, 0, 0);
  }
}

.service-card.needs-workhours:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(255, 152, 0, 0.3);
}

/* 状态标签组 */
.service-status-tags {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 24px);
  justify-content: flex-end;
  z-index: 10;
}

.status-tag {
  font-size: 11px;
  font-weight: 600;
}

/* 服务头部行 */
.service-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 服务内容 */
.service-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-content-no-image {
  padding: 52px 24px 24px 24px;
}

.service-title {
  font-size: 18px;
  font-weight: 700;
  color: #e0e0e0;
  margin: 0;
  line-height: 1.4;
  flex: 1;
}

.service-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #2a2a2a;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 13px;
}

.service-description {
  color: #aaa;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 工时部分 */
.workhours-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  margin-top: 8px;
}

.workhours-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.workhours-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.quick-buttons {
  display: flex;
  gap: 4px;
}

.workhours-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
</style>
