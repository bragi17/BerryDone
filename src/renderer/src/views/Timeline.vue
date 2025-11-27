<template>
  <div class="timeline-view">
    <div class="timeline-header">
      <div class="header-left">
        <h1 class="page-title">
          🎨 VGen Commissions
          <span style="font-size: 14px; opacity: 0.7;">
            ({{ vgenCommissions.length }} commissions)
          </span>
        </h1>
      </div>
      <div class="header-right">
        <n-button 
          quaternary 
          @click="updateCommissions" 
          :loading="updating"
          :disabled="updating"
        >
          <template #icon>
            <n-icon :component="updating ? SyncOutline : RefreshOutline" />
          </template>
          {{ updating ? '更新中...' : '更新数据' }}
        </n-button>
        <n-button quaternary>
          <template #icon>
            <n-icon :component="DownloadOutline" />
          </template>
          导出为 CSV
        </n-button>
        <n-button type="primary" @click="handleCreateTask">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          创建任务
        </n-button>
      </div>
    </div>

    <!-- 更新进度 -->
    <n-alert 
      v-if="updating" 
      type="info" 
      class="update-progress"
      :bordered="false"
      style="margin-bottom: 16px;"
    >
      <div class="progress-content">
        <n-spin size="small" />
        <span>{{ updateMessage }}</span>
        <n-progress 
          type="line" 
          :percentage="updateProgress" 
          :show-indicator="false"
          style="flex: 1; margin-left: 16px;"
        />
      </div>
    </n-alert>

    <!-- 自动更新提示 -->
    <n-alert 
      type="info" 
      :bordered="false"
      style="margin-bottom: 16px;"
      closable
    >
      <template #icon>
        <n-icon :component="InformationCircleOutline" />
      </template>
      💡 Commissions 数据每 2 小时自动更新一次，您也可以手动点击"更新数据"按钮刷新
    </n-alert>

    <div class="view-tabs">
      <n-tabs v-model:value="activeTab" type="line">
        <n-tab-pane name="scheduler" tab="智能排单">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 8px;">
              <n-icon :component="CalendarOutline" />
              智能排单
            </span>
          </template>
        </n-tab-pane>
        <n-tab-pane name="raw" tab="原始数据">
          <template #tab>
            <span style="display: flex; align-items: center; gap: 8px;">
              <n-icon :component="ListOutline" />
              原始数据
            </span>
          </template>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- 智能排单视图 -->
    <template v-if="activeTab === 'scheduler'">
      <!-- 排单控制栏 -->
      <div class="timeline-controls">
        <div class="month-selector">
          <n-button text @click="previousSchedulerPeriod">
            <n-icon :component="ChevronBack" size="20" />
          </n-button>
          <input
            v-if="editingSchedulerMonth"
            ref="schedulerMonthInput"
            v-model="schedulerMonthInputValue"
            class="month-input"
            @blur="applySchedulerMonthEdit"
            @keyup.enter="applySchedulerMonthEdit"
            @keyup.esc="cancelSchedulerMonthEdit"
          />
          <span
            v-else
            class="current-month"
            @click="startEditSchedulerMonth"
          >
            {{ schedulerPeriodText }}
          </span>
          <n-button text @click="nextSchedulerPeriod">
            <n-icon :component="ChevronForward" size="20" />
          </n-button>
          <n-button quaternary @click="goToTodayScheduler" style="margin-left: 8px;">
            今天
          </n-button>
        </div>

        <div class="controls-right">
          <n-button-group>
            <n-button
              :type="schedulerViewMode === 'week' ? 'primary' : 'default'"
              @click="schedulerViewMode = 'week'"
            >
              按周
            </n-button>
            <n-button
              :type="schedulerViewMode === 'month' ? 'primary' : 'default'"
              @click="schedulerViewMode = 'month'"
            >
              按月
            </n-button>
          </n-button-group>
          <n-divider vertical />
          <n-button
            type="primary"
            @click="runScheduling"
            :disabled="isScheduling || vgenCommissions.length === 0"
            style="min-width: 130px;"
          >
            <template #icon>
              <n-icon :component="isScheduling ? SyncOutline : CalendarOutline" :class="{ 'icon-spin': isScheduling }" />
            </template>
            {{ isScheduling ? '排单中...' : '运行智能排单' }}
          </n-button>
          <n-button
            quaternary
            @click="showPrioritySettings = true"
          >
            <template #icon>
              <n-icon :component="SettingsOutline" />
            </template>
            优先级设置
          </n-button>
          <n-button quaternary @click="saveSchedulerConfig">
            保存配置
          </n-button>
          <n-divider vertical />
          <span class="info-text">
            待排单: {{ vgenCommissions.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PENDING').length }} 个
          </span>
          <span class="info-text">
            已排单: {{ scheduledTasks.length }} 个
          </span>
          <n-divider vertical />
          <n-input-number
            v-model:value="schedulerConfig.defaultWorkHours"
            :min="1"
            :max="24"
            style="width: 120px;"
            @update:value="saveSchedulerConfig"
          >
            <template #prefix>
              每日工时:
            </template>
            <template #suffix>
              小时
            </template>
          </n-input-number>
        </div>
      </div>

      <!-- 排单日历视图 -->
      <div
        class="calendar-view scheduler-calendar-view"
        :class="{ 'week-view-mode': schedulerViewMode === 'week' }"
        ref="schedulerCalendarView"
      >
        <div v-if="scheduledTasks.length === 0" class="empty-schedule">
          <n-icon :component="CalendarOutline" size="64" color="#666" />
          <h3>还没有排单任务</h3>
          <p>点击"运行智能排单"按钮开始排单</p>
        </div>
        <div
          v-else
          class="calendar-timeline scheduler-calendar-timeline"
          :class="{ 'week-view-mode': schedulerViewMode === 'week' }"
        >
          <!-- 时间线网格 -->
          <div class="scheduler-timeline-grid">
            <!-- 左侧时段标签列 -->
            <div class="scheduler-time-labels">
              <!-- 顶部占位，对齐日期头部 -->
              <div class="time-label-header"></div>
              <!-- 时段标签 -->
              <div
                v-for="slot in 12"
                :key="slot"
                class="time-label-item"
              >
                <span class="time-text">{{ String((slot - 1) * 2).padStart(2, '0') }}:00</span>
              </div>
            </div>

            <!-- 右侧日期和任务区域 -->
            <div class="scheduler-calendar-content">
              <!-- 日期头部 -->
              <div class="timeline-days">
                <div
                  v-for="day in schedulerDaysInMonth"
                  :key="day.date"
                  class="timeline-day"
                  :class="{
                    'is-today': day.isToday,
                    'is-weekend': day.isWeekend
                  }"
                  :style="schedulerViewMode === 'month' ? { width: schedulerDayWidth + 'px' } : {}"
                >
                  <div class="day-header">
                    <div class="day-weekday">{{ day.weekday }}</div>
                    <div class="day-number">{{ day.dayNumber }}</div>
                  </div>
                </div>
              </div>

              <!-- 任务网格和背景 -->
              <div class="scheduler-tasks-container">
                <!-- 背景网格 -->
                <div class="scheduler-grid-background">
                  <div
                    v-for="day in schedulerDaysInMonth"
                    :key="day.date"
                    class="grid-day-column"
                    :class="{
                      'is-today': day.isToday,
                      'is-weekend': day.isWeekend
                    }"
                    :style="schedulerViewMode === 'month' ? { width: schedulerDayWidth + 'px' } : {}"
                  >
                    <!-- 12个2小时时段块 -->
                    <div
                      v-for="slot in 12"
                      :key="slot"
                      class="grid-time-block"
                    ></div>
                  </div>
                </div>

                <!-- 任务卡片层 -->
                <div class="tasks-overlay">
                  <!-- 任务卡片 -->
                  <n-tooltip
                    v-for="task in getPositionedScheduledTasks()"
                    :key="task.taskId || task.commissionId"
                    :delay="500"
                    placement="top"
                  >
                    <template #trigger>
                      <div
                        class="scheduled-task-card"
                        :class="{
                          'is-modified': hasUnsavedChanges && interactingTask?.commissionId === task.commissionId,
                          'is-dragging': isDraggingCard && interactingTask?.commissionId === task.commissionId,
                          'is-squeezed': (task as any)._isSqueezed,
                          'is-invalid': (task as any)._isInvalid,
                          'is-warning': (task as any)._isWarning,
                          'is-sub-task': task.parentTaskId !== undefined,
                          '_isMergeTarget': (task as any)._isMergeTarget,
                          '_isMergeReady': (task as any)._isMergeReady,
                          'is-small-card': isSmallCard(task),
                          'is-locked': task.status === TaskStatus.LOCKED,
                          'is-completed': task.status === TaskStatus.COMPLETED
                        }"
                        :style="getScheduledTaskStyle(task)"
                        @mousedown="handleCardDragStart($event, task)"
                        @click="handleScheduledTaskClick(task)"
                        @contextmenu.prevent="handleCardRightClick($event, task)"
                      >
                        <!-- 上方拉伸手柄 -->
                        <div
                          v-if="task.status !== TaskStatus.LOCKED && task.status !== TaskStatus.COMPLETED"
                          class="card-resize-handle card-resize-top"
                          @mousedown.stop="handleCardResizeStart($event, task, 'top')"
                        >
                          <div class="resize-indicator"></div>
                        </div>

                        <!-- 状态徽章 (优雅设计) -->
                        <div class="task-status-badge" :class="`status-${(task.status || TaskStatus.NORMAL).toLowerCase()}`">
                          <!-- 锁定状态图标 -->
                          <svg v-if="task.status === TaskStatus.LOCKED" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <!-- 完成状态图标 -->
                          <svg v-else-if="task.status === TaskStatus.COMPLETED" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="8 12 11 15 16 9"/>
                          </svg>
                          <!-- 普通状态图标 -->
                          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="9" y1="13" x2="15" y2="13"/>
                            <line x1="9" y1="17" x2="15" y2="17"/>
                          </svg>
                        </div>

                        <div class="task-card-header">
                          <div class="task-card-title">
                            {{ getCommissionById(task.commissionId)?.clientName }}
                          </div>
                        </div>
                        <div class="task-card-subtitle">
                          {{ getCommissionById(task.commissionId)?.projectName }}
                        </div>
                        <div class="task-card-meta">
                          <n-tag
                            type="info"
                            size="small"
                            :bordered="false"
                            class="task-meta-tag"
                          >
                            ⏱️ {{ task.totalHours }}h
                          </n-tag>
                          <n-tag
                            type="success"
                            size="small"
                            :bordered="false"
                            class="task-meta-tag"
                          >
                            📅 {{ getTaskUniqueDays(task) }}天
                          </n-tag>
                          <n-tag
                            v-if="task.parentTaskId && task.subTaskIndex !== undefined"
                            type="warning"
                            size="small"
                            :bordered="false"
                            class="task-meta-tag"
                          >
                            #{{ task.subTaskIndex + 1 }}/{{ task.subTaskCount }}
                          </n-tag>
                        </div>

                        <!-- 下方拉伸手柄 -->
                        <div
                          v-if="task.status !== TaskStatus.LOCKED && task.status !== TaskStatus.COMPLETED"
                          class="card-resize-handle card-resize-bottom"
                          @mousedown.stop="handleCardResizeStart($event, task, 'bottom')"
                        >
                          <div class="resize-indicator"></div>
                        </div>
                      </div>
                    </template>
                    <div class="task-tooltip-content">
                      <div class="tooltip-row">
                        <strong>客户:</strong> {{ getCommissionById(task.commissionId)?.clientName }}
                      </div>
                      <div class="tooltip-row">
                        <strong>项目:</strong> {{ getCommissionById(task.commissionId)?.projectName }}
                      </div>
                      <div class="tooltip-divider"></div>
                      <div class="tooltip-row">
                        <strong>总工时:</strong> {{ task.totalHours }} 小时
                      </div>
                      <div class="tooltip-row">
                        <strong>日期:</strong> {{ task.startDate }} ~ {{ task.endDate }}
                      </div>
                      <div class="tooltip-row">
                        <strong>工作天数:</strong> {{ getTaskUniqueDays(task) }} 天
                      </div>
                      <div class="tooltip-row" v-if="task.parentTaskId">
                        <strong>子任务:</strong> #{{ task.subTaskIndex + 1 }} / {{ task.subTaskCount }}
                      </div>
                      <div class="tooltip-row">
                        <strong>状态:</strong> {{ getCommissionById(task.commissionId)?.status }}
                      </div>
                    </div>
                  </n-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 原始数据视图 -->
    <template v-if="activeTab === 'raw'">
      <div class="timeline-controls">
        <div class="month-selector">
          <n-button text @click="previousMonth">
            <n-icon :component="ChevronBack" size="20" />
          </n-button>
          <input
            v-if="editingMonth"
            ref="monthInput"
            v-model="monthInputValue"
            class="month-input"
            @blur="applyMonthEdit"
            @keyup.enter="applyMonthEdit"
            @keyup.esc="cancelMonthEdit"
          />
          <span
            v-else
            class="current-month"
            @click="startEditMonth"
          >
            {{ currentMonthText }}
          </span>
          <n-button text @click="nextMonth">
            <n-icon :component="ChevronForward" size="20" />
          </n-button>
        </div>

        <div class="controls-right">
          <n-input
            v-model:value="searchQuery"
            placeholder="搜索任务标题..."
            style="width: 200px;"
            clearable
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
          <n-popover trigger="click" placement="bottom-end" style="padding: 0;">
            <template #trigger>
              <n-button quaternary>
                <template #icon>
              <n-icon :component="FunnelOutline" />
            </template>
                筛选状态 ({{ selectedFilterCount }})
              </n-button>
            </template>
            <div class="filter-menu">
              <div class="filter-header">
                <span>选择状态</span>
                <n-button text size="small" @click="clearAllFilters">清除</n-button>
              </div>
              <div class="filter-options">
                <div
                  class="filter-option"
                  @click="toggleAllFilters"
                >
                  <n-checkbox :checked="isAllSelected" @update:checked="toggleAllFilters">
                    全部状态
                  </n-checkbox>
                </div>
                <div
                  v-for="option in filterOptions"
                  :key="option.value"
                  class="filter-option"
                >
                  <n-checkbox
                    :checked="filterStatus.includes(option.value)"
                    @update:checked="(checked) => toggleFilter(option.value, checked)"
                  >
                    {{ option.label }}
                  </n-checkbox>
                </div>
              </div>
            </div>
          </n-popover>
        </div>
      </div>

      <div class="calendar-view">
        <div class="calendar-header">
          <div class="month-label">{{ currentMonthLabel }}</div>
        </div>

        <div class="calendar-timeline">
          <div class="timeline-days">
            <div
              v-for="day in allDaysInMonth"
              :key="day.date"
              class="timeline-day"
              :style="{ minWidth: dayWidth + 'px' }"
              :class="{
                'is-today': isToday(day.date),
                'is-weekend': day.isWeekend
              }"
            >
              <div class="day-header">
                <div class="day-weekday">{{ day.weekday }}</div>
                <div class="day-number">{{ day.dayNumber }}</div>
              </div>
            </div>
          </div>

          <div class="tasks-overlay">
            <div
              v-for="task in positionedTasks"
              :key="task.id"
                class="task-bar task-bar-readonly"
                :style="getTaskStyle(task)"
                @click="handleRawDataTaskClick(task)"
              >
                <div class="task-bar-content">
                  <!-- 支付状态标签 -->
                  <div v-if="getTaskPaymentStatus(task)" class="payment-badge-timeline" :class="getTaskPaymentStatus(task).toLowerCase()">
                    {{ getTaskPaymentStatus(task) }}
                  </div>
                  <div class="task-bar-info">
                    <div class="task-bar-client">{{ getClientName(task.title) }}</div>
                    <div class="task-bar-project">{{ getProjectName(task.title) }}</div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </template>

    <task-dialog
      v-model:show="showTaskDialog"
      :task="editingTask"
      @submit="handleTaskSubmit"
    />

    <!-- 排单卡片详情对话框 -->
    <n-modal
      v-model:show="showScheduledTaskDialog"
      preset="card"
      title="编辑排单工时"
      style="width: 500px;"
      :bordered="false"
    >
      <div v-if="editingScheduledTask" class="scheduled-task-details">
        <!-- 客户名称（只读） -->
        <div class="detail-field">
          <label class="detail-label">客户名称</label>
          <n-input
            :value="getCommissionById(editingScheduledTask.commissionId)?.clientName"
            readonly
            disabled
          />
        </div>

        <!-- 服务名称（只读） -->
        <div class="detail-field">
          <label class="detail-label">服务名称</label>
          <n-input
            :value="getCommissionById(editingScheduledTask.commissionId)?.serviceName || getCommissionById(editingScheduledTask.commissionId)?.projectName"
            readonly
            disabled
          />
        </div>

        <!-- 工时（可编辑） -->
        <div class="detail-field">
          <label class="detail-label">预估工时（小时）</label>
          <n-input-number
            v-model:value="editingScheduledTaskHours"
            :min="1"
            :max="999"
            style="width: 100%"
          >
            <template #suffix>
              小时
            </template>
          </n-input-number>
        </div>

        <!-- 排单信息（只读） -->
        <div class="detail-info">
          <div class="info-row">
            <span class="info-label">开始日期：</span>
            <span class="info-value">{{ editingScheduledTask.startDate }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">结束日期：</span>
            <span class="info-value">{{ editingScheduledTask.endDate }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">工作天数：</span>
            <span class="info-value">{{ editingScheduledTask.workDays.length }} 天</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <n-button @click="handleScheduledTaskCancel">取消</n-button>
          <n-button type="primary" @click="handleScheduledTaskSave">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 原始数据详情对话框（只读） -->
    <n-modal
      v-model:show="showRawDataDialog"
      preset="card"
      title="Commission 详情"
      style="width: 600px;"
      :bordered="false"
    >
      <div v-if="editingRawDataTask" class="raw-data-details">
        <!-- 获取对应的commission数据 -->
        <template v-if="vgenCommissions.find(c => c.id === editingRawDataTask.id)">
          <div class="detail-section">
            <h3 class="section-title">基本信息</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item-label">客户名称</span>
                <span class="detail-item-value">{{ getClientName(editingRawDataTask.title) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item-label">项目名称</span>
                <span class="detail-item-value">{{ getProjectName(editingRawDataTask.title) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item-label">服务名称</span>
                <span class="detail-item-value">{{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.serviceName || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-title">状态信息</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item-label">项目状态</span>
                <n-tag
                  :type="vgenCommissions.find(c => c.id === editingRawDataTask.id)?.status === 'COMPLETED' ? 'success' :
                         vgenCommissions.find(c => c.id === editingRawDataTask.id)?.status === 'IN_PROGRESS' ? 'info' :
                         vgenCommissions.find(c => c.id === editingRawDataTask.id)?.status === 'PENDING' ? 'warning' : 'default'"
                  size="small"
                >
                  {{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.status }}
                </n-tag>
              </div>
              <div class="detail-item">
                <span class="detail-item-label">支付状态</span>
                <n-tag
                  :type="vgenCommissions.find(c => c.id === editingRawDataTask.id)?.paymentStatus === 'PAID' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.paymentStatus }}
                </n-tag>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-title">日期信息</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item-label">开始日期</span>
                <span class="detail-item-value">{{ editingRawDataTask.startDate }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-item-label">结束日期</span>
                <span class="detail-item-value">{{ editingRawDataTask.endDate }}</span>
              </div>
              <div class="detail-item" v-if="vgenCommissions.find(c => c.id === editingRawDataTask.id)?.dueDate">
                <span class="detail-item-label">截止日期</span>
                <span class="detail-item-value">{{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.dueDate }}</span>
              </div>
              <div class="detail-item" v-if="vgenCommissions.find(c => c.id === editingRawDataTask.id)?.completedDate">
                <span class="detail-item-label">完成日期</span>
                <span class="detail-item-value">{{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.completedDate }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-title">价格信息</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-item-label">总金额</span>
                <span class="detail-item-value price-value">
                  {{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.currency }}
                  {{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.totalCost }}
                </span>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="vgenCommissions.find(c => c.id === editingRawDataTask.id)?.notes">
            <h3 class="section-title">备注</h3>
            <div class="notes-content">
              {{ vgenCommissions.find(c => c.id === editingRawDataTask.id)?.notes }}
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <n-button type="primary" @click="handleRawDataDialogClose">关闭</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 优先级设置对话框 -->
    <PrioritySettings
      v-model:show="showPrioritySettings"
      :config="priorityConfig"
      :services="vgenServices"
      :commissions="vgenCommissions"
      @save="handleSavePriorityConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  NButton,
  NIcon,
  NTabs,
  NTabPane,
  NInput,
  NAlert,
  NPopover,
  NCheckbox,
  NSpin,
  NProgress,
  NButtonGroup,
  NDivider,
  NInputNumber,
  NTag,
  NModal,
  NTooltip,
  useMessage,
  useDialog
} from 'naive-ui'
import {
  AddOutline,
  DownloadOutline,
  ListOutline,
  CalendarOutline,
  SearchOutline,
  FunnelOutline,
  ChevronBack,
  ChevronForward,
  CheckmarkCircleOutline,
  EllipseOutline,
  RefreshOutline,
  SyncOutline,
  InformationCircleOutline,
  SettingsOutline
} from '@vicons/ionicons5'
import TaskCard from '../components/TaskCard.vue'
import TaskDialog from '../components/TaskDialog.vue'
import PrioritySettings from '../components/PrioritySettings.vue'
import { useStore, Task, taskStatusConfig } from '../store'
import { parseDateString, formatDateString, getTodayString } from '../utils/dateUtils'
import { scheduleCommissions, type ScheduledTask, type SchedulerConfig, type PriorityConfig, DEFAULT_SCHEDULER_CONFIG, DEFAULT_PRIORITY_CONFIG, TaskStatus } from '../utils/scheduler'
import type { VGenCommission } from '../store'

const store = useStore()
const { addTask, updateTask, deleteTask } = store
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

// 路由守卫 - 检测未保存的修改
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    dialog.warning({
      title: '未保存的排单修改',
      content: '您有未保存的排单修改，是否保存？',
      positiveText: '保存并离开',
      negativeText: '放弃修改',
      onPositiveClick: async () => {
        try {
          await saveSchedulerConfig()
          next()
        } catch (error) {
          // 保存失败，取消导航
          next(false)
        }
      },
      onNegativeClick: () => {
        // 放弃修改，恢复原始状态
        handleCancelScheduleChanges()
        next()
      }
    })
  } else {
    next()
  }
})

// 更新相关状态
const updating = ref(false)
const updateProgress = ref(0)
const updateMessage = ref('')

// VGen Commissions 数据
interface VGenCommission {
  id: string
  commissionID: string
  clientName: string
  projectName: string
  status: string
  paymentStatus: string
  startDate: string
  dueDate?: string
  completedDate?: string
  totalCost: number
  currency: string
}

const vgenCommissions = ref<VGenCommission[]>([])
const vgenDataLoaded = ref(false)
const vgenServices = ref<any[]>([])

// 智能排单相关状态
const schedulerConfig = ref<SchedulerConfig>(DEFAULT_SCHEDULER_CONFIG)
const scheduledTasks = ref<ScheduledTask[]>([])
const schedulerLoaded = ref(false)
const priorityConfig = ref<PriorityConfig>(DEFAULT_PRIORITY_CONFIG)
const showPrioritySettings = ref(false)
const isScheduling = ref(false)
const schedulerCurrentDate = ref(new Date()) // 排单视图的当前日期
const schedulerViewMode = ref<'week' | 'month'>('week') // 视图模式：周/月
const schedulerDayWidth = ref(120) // 排单页面每日宽度 px（增加默认宽度）
const schedulerMinZoom = 60 // 最小60px/天
const schedulerMaxZoom = 300 // 最大300px/天

const activeTab = ref('scheduler') // 默认显示智能排单
const showTaskDialog = ref(false)
const editingTask = ref<Task | null>(null)
const currentDate = ref(new Date()) // 默认当前日期
const dayWidth = ref(60) // 默认每日宽度 px

// 排单卡片详情对话框
const showScheduledTaskDialog = ref(false)
const editingScheduledTask = ref<ScheduledTask | null>(null)
const editingScheduledTaskHours = ref(0)

// 原始数据卡片详情对话框
const showRawDataDialog = ref(false)
const editingRawDataTask = ref<Task | null>(null)

// 排单卡片交互状态（拖动和拉伸）
const isDraggingCard = ref(false) // 是否正在拖动卡片
const isResizingCard = ref(false) // 是否正在拉伸卡片
const interactingTask = ref<ScheduledTask | null>(null) // 当前交互的任务
const dragStartX = ref(0) // 拖动起始X坐标
const dragStartY = ref(0) // 拖动起始Y坐标
const didDragMove = ref(false) // 是否实际移动了（用于区分点击和拖动）
const originalTaskState = ref<{
  startDate: string
  endDate: string
  totalHours: number
  workDays: string[]
  startHour?: number // 添加：开始小时数
} | null>(null) // 原始任务状态

// ✨ 新增：统一的操作状态管理（确保操作互斥）
type OperationType = 'dragging' | 'resizing' | 'clicking' | null
const currentOperation = ref<OperationType>(null)

// 碰撞合并状态
const collisionStartTime = ref<number | null>(null) // 碰撞开始时间
const collidingTarget = ref<ScheduledTask | null>(null) // 正在碰撞的目标任务
const collisionDuration = ref(0) // 当前碰撞持续时间（毫秒）
const COLLISION_MERGE_THRESHOLD = 500 // 碰撞0.5秒后触发合并

// 扩展 ScheduledTask 类型，添加垂直位置信息
interface ExtendedScheduledTask extends ScheduledTask {
  startHour?: number // 任务开始的小时数（0-23）
  displayTop?: number // 显示位置（百分比）
  displayHeight?: number // 显示高度（百分比）
}

// 修改追踪（用于保存/取消功能）
const hasUnsavedChanges = ref(false) // 是否有未保存的修改
const modifiedTasksBackup = ref<ScheduledTask[]>([]) // 修改前的任务备份

// 月份编辑相关状态（原始数据页面）
const editingMonth = ref(false)
const monthInputValue = ref('')
const monthInput = ref<HTMLInputElement | null>(null)

// 月份编辑相关状态（排单页面）
const editingSchedulerMonth = ref(false)
const schedulerMonthInputValue = ref('')
const schedulerMonthInput = ref<HTMLInputElement | null>(null)

// 搜索和筛选状态
const searchQuery = ref('')
const filterStatus = ref<string[]>(['new', 'ready', 'wip', 'completed', 'waitlist', 'pending']) // 默认全选

// 缩放级别 (像素/天)
const zoomLevel = ref(80) // 默认每天80px
const minZoom = 40 // 最小40px/天
const maxZoom = 200 // 最大200px/天

// 拖拽调整大小的状态
const resizing = ref<{
  task: Task
  type: 'start' | 'end'
  startX: number
  originalStartDate: string
  originalEndDate: string
} | null>(null)

// Timeline 和 TodoList 高度控制
const timelineHeight = ref(600) // Timeline 默认高度
const todoHeight = ref(400) // TodoList 默认高度
const isResizingPanels = ref(false)
const startY = ref(0)
const startTimelineHeight = ref(0)

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Watch for view mode changes and auto-scroll in month mode
watch(schedulerViewMode, async (newMode) => {
  if (newMode === 'month') {
    // 等待DOM完全渲染后再滚动
    await nextTick()
    // 再等待一帧，确保布局计算完成
    requestAnimationFrame(() => {
      setTimeout(() => {
        console.log('[Timeline] 视图模式切换到月视图，执行滚动')
        scrollToToday()
      }, 100)
    })
  }
})

// 今日待办事项
const todayTodos = computed(() => {
  const today = getTodayString()
  return searchedAndFilteredTasks.value.filter(task => {
    const taskStart = new Date(task.startDate).toISOString().split('T')[0]
    const taskEnd = new Date(task.endDate).toISOString().split('T')[0]
    // 包含今天在任务时间范围内的所有任务
    return taskStart <= today && taskEnd >= today && task.status !== 'completed'
  })
})

// 切换待办状态
const toggleTodoStatus = async (task: Task) => {
  const newStatus = task.status === 'completed' ? 'wip' : 'completed'
  const newProgress = newStatus === 'completed' ? 100 : task.progress
  await updateTask(task.id, { 
    status: newStatus,
    progress: newProgress
  })
}

// 点击待办项
const handleTodoClick = (task: Task) => {
  handleTaskClick(task)
}

// 筛选选项
const filterOptions = [
  { label: 'New', value: 'new' },
  { label: 'Ready', value: 'ready' },
  { label: 'WIP', value: 'wip' },
  { label: 'Completed', value: 'completed' },
  { label: 'Waitlist', value: 'waitlist' },
  { label: 'Pending', value: 'pending' }
]

// 筛选相关计算属性和方法
const selectedFilterCount = computed(() => {
  if (isAllSelected.value) return '全部'
  return filterStatus.value.length
})

const isAllSelected = computed(() => {
  return filterStatus.value.length === filterOptions.length
})

const toggleFilter = (value: string, checked: boolean) => {
  if (checked) {
    if (!filterStatus.value.includes(value)) {
      filterStatus.value.push(value)
    }
  } else {
    filterStatus.value = filterStatus.value.filter(v => v !== value)
  }
}

const toggleAllFilters = () => {
  if (isAllSelected.value) {
    // 如果全选，则清空
    filterStatus.value = []
  } else {
    // 否则，全选所有
    filterStatus.value = filterOptions.map(opt => opt.value)
  }
}

const clearAllFilters = () => {
  filterStatus.value = []
}

const currentMonthText = computed(() => {
  return currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
})

const currentMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
})

const allDaysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const lastDay = new Date(year, month + 1, 0)
  
  const days: any[] = []
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayNumber: day,
      weekday: weekdayNames[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    })
  }
  
  return days
})

// 应用搜索和筛选 - 直接使用 VGen 任务
const searchedAndFilteredTasks = computed(() => {
  let tasks = vgenTasksForDisplay.value
  
  // 应用搜索
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    tasks = tasks.filter(task => 
      task.title.toLowerCase().includes(query)
    )
  }
  
  // 应用状态筛选（多选）
  if (filterStatus.value.length > 0 && filterStatus.value.length < filterOptions.length) {
    tasks = tasks.filter(task => filterStatus.value.includes(task.status))
  }
  
  return tasks
})

// 计算任务的布局位置和泳道
// 辅助函数：提取客户名
const getClientName = (title: string) => {
  const parts = title.split(' - ')
  return parts[0] || title
}

// 辅助函数：提取项目名
const getProjectName = (title: string) => {
  const parts = title.split(' - ')
  return parts.slice(1).join(' - ') || ''
}

// 辅助函数：获取任务的支付状态
const getTaskPaymentStatus = (task: Task) => {
  // 从 vgenCommissions 中查找对应的 commission
  const commission = vgenCommissions.value.find(c => c.id === task.id)
  return commission?.paymentStatus || ''
}

// 智能排单日历相关计算属性
const schedulerPeriodText = computed(() => {
  if (schedulerViewMode.value === 'week') {
    // 周模式显示：2025年 第1周 (1/1 - 1/7)
    const days = schedulerDaysInPeriod.value
    if (days.length === 0) return ''
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const year = schedulerCurrentDate.value.getFullYear()
    const weekNumber = getWeekNumber(schedulerCurrentDate.value)
    return `${year}年 第${weekNumber}周 (${firstDay.dayNumber}/${schedulerCurrentDate.value.getMonth() + 1} - ${lastDay.dayNumber}/${new Date(lastDay.date).getMonth() + 1})`
  } else {
    // 月模式
    return schedulerCurrentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  }
})

// 获取周数
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

const schedulerDaysInPeriod = computed(() => {
  if (schedulerViewMode.value === 'week') {
    // 周视图：显示当前日期所在周的7天
    const currentDate = new Date(schedulerCurrentDate.value)
    currentDate.setHours(0, 0, 0, 0)

    // 找到本周的周日（起始日）
    const dayOfWeek = currentDate.getDay()
    const sunday = new Date(currentDate)
    sunday.setDate(currentDate.getDate() - dayOfWeek)

    const days: any[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      days.push({
        date: dateStr,
        dayNumber: date.getDate(),
        weekday: weekdayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: date.getTime() === today.getTime()
      })
    }

    return days
  } else {
    // 月视图：显示整个月
    const year = schedulerCurrentDate.value.getFullYear()
    const month = schedulerCurrentDate.value.getMonth()
    const lastDay = new Date(year, month + 1, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: any[] = []

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      const dateStr = date.toISOString().split('T')[0]

      date.setHours(0, 0, 0, 0)

      days.push({
        date: dateStr,
        dayNumber: day,
        weekday: weekdayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: date.getTime() === today.getTime()
      })
    }

    return days
  }
})

// 保留旧的计算属性以兼容
const schedulerDaysInMonth = computed(() => schedulerDaysInPeriod.value)

const previousSchedulerPeriod = () => {
  if (schedulerViewMode.value === 'week') {
    // 上一周
    schedulerCurrentDate.value = new Date(
      schedulerCurrentDate.value.getFullYear(),
      schedulerCurrentDate.value.getMonth(),
      schedulerCurrentDate.value.getDate() - 7
    )
  } else {
    // 上一月
    schedulerCurrentDate.value = new Date(
      schedulerCurrentDate.value.getFullYear(),
      schedulerCurrentDate.value.getMonth() - 1,
      1
    )
  }
}

const nextSchedulerPeriod = () => {
  if (schedulerViewMode.value === 'week') {
    // 下一周
    schedulerCurrentDate.value = new Date(
      schedulerCurrentDate.value.getFullYear(),
      schedulerCurrentDate.value.getMonth(),
      schedulerCurrentDate.value.getDate() + 7
    )
  } else {
    // 下一月
    schedulerCurrentDate.value = new Date(
      schedulerCurrentDate.value.getFullYear(),
      schedulerCurrentDate.value.getMonth() + 1,
      1
    )
  }
}

// 跳转到今天
const goToTodayScheduler = async () => {
  schedulerCurrentDate.value = new Date()
  // 自动滚动到今日位置
  await nextTick()
  // 再等待一帧，确保DOM更新和布局计算完成
  requestAnimationFrame(() => {
    setTimeout(() => {
      console.log('[Timeline] 点击今天按钮，执行滚动')
      scrollToToday()
    }, 100)
  })
}

// 滚动到今日位置
const scrollToToday = () => {
  console.log('[Timeline] scrollToToday 被调用，当前模式:', schedulerViewMode.value)

  if (schedulerViewMode.value === 'week') {
    // 按周模式不需要滚动，今日总是可见
    console.log('[Timeline] 按周模式，跳过滚动')
    return
  }

  // 重要修正：滚动条在外层的 .scheduler-calendar-view 上，不是 .scheduler-calendar-timeline！
  const calendarView = document.querySelector('.scheduler-calendar-view') as HTMLElement
  if (!calendarView) {
    console.warn('[Timeline] 找不到 .scheduler-calendar-view 元素')
    return
  }

  const days = schedulerDaysInPeriod.value
  console.log('[Timeline] 当前显示天数:', days.length)

  const todayIndex = days.findIndex(d => d.isToday)
  console.log('[Timeline] 今天的索引:', todayIndex)

  if (todayIndex !== -1) {
    // 计算今日的位置，并居中显示
    // 需要加上左侧时间标签的宽度 (80px)
    const timeLabelsWidth = 80
    const containerWidth = calendarView.clientWidth - timeLabelsWidth
    const scrollLeft = timeLabelsWidth + (todayIndex * schedulerDayWidth.value) - (containerWidth / 2) + (schedulerDayWidth.value / 2)

    console.log('[Timeline] 计算滚动位置:', {
      todayIndex,
      dayWidth: schedulerDayWidth.value,
      containerWidth,
      timeLabelsWidth,
      scrollLeft: Math.max(0, scrollLeft),
      scrollWidth: calendarView.scrollWidth
    })

    calendarView.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    })

    // 延迟检查滚动是否成功
    setTimeout(() => {
      console.log('[Timeline] 滚动完成，当前scrollLeft:', calendarView.scrollLeft)
    }, 500)
  } else {
    console.warn('[Timeline] 未找到今天的日期')
  }
}

// 通过ID获取commission
const getCommissionById = (id: string) => {
  return vgenCommissions.value.find(c => c.id === id)
}

// 计算任务跨越的唯一天数（对于子任务，统计所有兄弟任务的唯一天数）
const getTaskUniqueDays = (task: ScheduledTask) => {
  // 如果任务有 parentTaskId，说明是子任务
  if (task.parentTaskId) {
    // 找到所有同一个 parent 的兄弟子任务（包括自己）
    const siblingTasks = scheduledTasks.value.filter(
      t => t.parentTaskId === task.parentTaskId
    )

    // 收集所有兄弟任务的工作日，去重
    const allWorkDays = new Set<string>()
    siblingTasks.forEach(t => {
      t.workDays.forEach(day => allWorkDays.add(day))
    })

    return allWorkDays.size
  }

  // 如果没有 parent，是普通任务，直接返回自己的工作日数量
  return task.workDays.length
}

// 计算任务在网格中的位置
const getPositionedScheduledTasks = () => {
  return scheduledTasks.value.map(task => {
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)

    // 获取当前显示的日期范围
    const days = schedulerDaysInPeriod.value
    if (days.length === 0) return null

    const periodStart = new Date(days[0].date)
    const periodEnd = new Date(days[days.length - 1].date)
    periodStart.setHours(0, 0, 0, 0)
    periodEnd.setHours(23, 59, 59, 999)

    // 任务是否与当前周期有交集
    if (endDate < periodStart || startDate > periodEnd) {
      return null
    }

    return {
      ...task,
      displayStartDate: startDate < periodStart ? periodStart : startDate,
      displayEndDate: endDate > periodEnd ? periodEnd : endDate
    }
  }).filter(Boolean)
}

// 计算每日的实际宽度（按周视图时自适应）
const getDayWidth = computed(() => {
  if (schedulerViewMode.value === 'week') {
    // 按周显示时，自适应填充整个容器
    // 需要等 DOM 渲染完成后计算
    return 'auto' // 将使用CSS的flex布局
  } else {
    // 按月显示时，使用固定宽度（支持横向滚动）
    return schedulerDayWidth.value
  }
})

// 计算任务卡片的样式（改进版，支持精确垂直位置）
const getScheduledTaskStyle = (task: any) => {
  const days = schedulerDaysInPeriod.value
  if (days.length === 0) return {}

  const periodStart = new Date(days[0].date)
  periodStart.setHours(0, 0, 0, 0)

  // 计算起始日期在周期中的索引（从0开始）
  const startDate = new Date(task.displayStartDate)
  const endDate = new Date(task.displayEndDate)

  const dayIndexStart = Math.floor((startDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  const dayIndexEnd = Math.floor((endDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))

  const spanDays = dayIndexEnd - dayIndexStart + 1

  let left, width

  if (schedulerViewMode.value === 'week') {
    // 按周显示：使用百分比定位
    const dayPercent = 100 / days.length
    left = `${dayIndexStart * dayPercent}%`
    width = `${spanDays * dayPercent}%`
  } else {
    // 按月显示：使用像素定位
    left = `${dayIndexStart * schedulerDayWidth.value}px`
    width = `${spanDays * schedulerDayWidth.value}px`
  }

  // 改进的垂直位置计算：
  const percentPerHour = 100 / 24 // 每小时占的百分比

  // 如果任务有指定的开始小时，使用它；否则使用默认值
  let startHour = (task as ExtendedScheduledTask).startHour
  if (startHour === undefined) {
    // 默认从上午9点开始
    startHour = 9
  }

  // 确保开始小时在合理范围内（0-23）
  startHour = Math.max(0, Math.min(23, startHour))

  // 计算顶部位置
  const top = startHour * percentPerHour

  // ✅ Bug Fix 3: 计算任务高度（不压缩）
  const avgHoursPerDay = task.totalHours / task.workDays.length
  const height = Math.max(4.17, avgHoursPerDay * percentPerHour) // 最小1小时高度

  // 如果任务有自定义的显示位置，使用它们
  if ((task as ExtendedScheduledTask).displayTop !== undefined) {
    const displayTop = (task as ExtendedScheduledTask).displayTop!
    const displayHeight = (task as ExtendedScheduledTask).displayHeight || height

    return {
      position: 'absolute',
      left,
      width,
      top: `${displayTop}%`,
      height: `${displayHeight}%`,
      minHeight: '30px',
      background: getTaskBackground(task),
      transition: hasUnsavedChanges.value ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
    }
  }

  return {
    position: 'absolute',
    left,
    width,
    top: `${top}%`,
    height: `${height}%`,
    minHeight: '30px',
    background: getTaskBackground(task),
    transition: hasUnsavedChanges.value ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
  }
}

// 提取背景颜色逻辑为独立函数
const getTaskBackground = (task: any) => {
  const commission = getCommissionById(task.commissionId)
  let background = 'linear-gradient(135deg, #2a2a3a 0%, #1e1e2e 100%)' // 默认背景

  if (commission) {
    const statusColors: Record<string, string> = {
      'COMPLETED': 'linear-gradient(135deg, #54C5B7 0%, #3F9489 100%)',    // 青色渐变
      'IN_PROGRESS': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',  // 蓝色渐变
      'PENDING': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',      // 橙色渐变
      'DRAFT': 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'        // 灰色渐变
    }
    background = statusColors[commission.status] || background
  }

  return background
}

// 判断是否是小卡片（用于悬停展开优化）
const isSmallCard = (task: ScheduledTask) => {
  const avgHoursPerDay = task.totalHours / task.workDays.length
  return avgHoursPerDay < 2 // 小于2小时/天的卡片视为小卡片
}


// 将 VGen Commissions 转换为 Task 格式
const vgenTasksForDisplay = computed(() => {
  if (!vgenDataLoaded.value) {
    return []
  }
  
  return vgenCommissions.value.map(comm => {
    // 状态映射
    const statusMap: Record<string, Task['status']> = {
      'COMPLETED': 'completed',
      'IN_PROGRESS': 'in-progress',
      'DRAFT': 'pending',
      'PENDING': 'pending',
      'CANCELLED': 'pending',
      'REJECTED': 'pending'
    }
    
    const status = statusMap[comm.status] || 'pending'
    
    // 计算进度
    let progress = 0
    if (comm.status === 'COMPLETED') progress = 100
    else if (comm.status === 'IN_PROGRESS') progress = 50
    
    // 颜色根据支付状态
    const color = comm.paymentStatus === 'PAID' ? '#10B981' : '#F59E0B'
    
    // 确保日期格式正确
    const startDate = comm.startDate || new Date().toISOString()
    let endDate = comm.completedDate || comm.dueDate || comm.startDate
    
    // 如果没有结束日期，设置为开始日期后14天
    if (!endDate || endDate === startDate) {
      const start = new Date(startDate)
      start.setDate(start.getDate() + 14)
      endDate = start.toISOString()
    }
    
    return {
      id: comm.id,
      title: `${comm.clientName} - ${comm.projectName}`,
      startDate: startDate,
      endDate: endDate,
      progress,
      status,
      color,
      projectId: 'vgen'
    } as Task
  })
})

const positionedTasks = computed(() => {
  // 使用已经搜索和筛选过的任务
  const tasks = searchedAndFilteredTasks.value.map(task => {
    const startDate = new Date(task.startDate)
    const endDate = new Date(task.endDate)
    const monthStart = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
    const monthEnd = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)
    
    if (endDate < monthStart || startDate > monthEnd) {
      return null
    }
    
    const displayStart = startDate < monthStart ? monthStart : startDate
    const displayEnd = endDate > monthEnd ? monthEnd : endDate
    
    const startDay = Math.floor((displayStart - monthStart) / (1000 * 60 * 60 * 24))
    const endDay = Math.floor((displayEnd - monthStart) / (1000 * 60 * 60 * 24))
    
    return {
      ...task,
      displayStart,
      displayEnd,
      startDay,
      endDay
    }
  }).filter(Boolean)
  
  // 按开始日期排序
  tasks.sort((a, b) => a.startDay - b.startDay)
  
  // 分配泳道以避免重叠
  const lanes: any[][] = []
  
  tasks.forEach(task => {
    let placed = false
    
    // 尝试放入现有泳道
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      const hasOverlap = lane.some(t => 
        !(task.endDay < t.startDay || task.startDay > t.endDay)
      )
      
      if (!hasOverlap) {
        lane.push(task)
        task.lane = i
        placed = true
        break
      }
    }
    
    // 如果没有合适的泳道，创建新泳道
    if (!placed) {
      task.lane = lanes.length
      lanes.push([task])
    }
  })
  
  return tasks
})

const getTaskStyle = (task: any) => {
  if (!task) return {}

  const totalDays = allDaysInMonth.value.length
  const duration = task.endDay - task.startDay + 1

  // 根据总天数计算每天的宽度百分比
  const dayWidth = 100 / totalDays
  const left = task.startDay * dayWidth
  const width = duration * dayWidth

  // 根据泳道计算垂直位置
  const laneHeight = 60
  const top = 60 + (task.lane || 0) * laneHeight

  // 获取对应的commission，根据状态设置背景颜色
  const commission = vgenCommissions.value.find(c => c.id === task.id)
  let background = 'linear-gradient(135deg, #2a2a3a 0%, #1e1e2e 100%)' // 默认背景

  if (commission) {
    const statusColors: Record<string, string> = {
      'COMPLETED': 'linear-gradient(135deg, #54C5B7 0%, #3F9489 100%)',    // 青色渐变
      'IN_PROGRESS': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',  // 蓝色渐变
      'PENDING': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',      // 橙色渐变
      'DRAFT': 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'        // 灰色渐变
    }
    background = statusColors[commission.status] || background
  }

  const style: any = {
    left: `${left}%`,
    width: `${width}%`,
    top: `${top}px`,
    color: '#FFFFFF',
    background
  }

  return style
}

const isToday = (date: string) => {
  return date === getTodayString()
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

// 月份输入解析和校验
const parseMonthInput = (input: string): Date | null => {
  if (!input || !input.trim()) return null

  const trimmed = input.trim()
  let year: number | null = null
  let month: number | null = null

  // 尝试多种格式
  // 格式1: "2025-01" 或 "2025/01"
  const dashFormat = /^(\d{4})[-\/](\d{1,2})$/
  const dashMatch = trimmed.match(dashFormat)
  if (dashMatch) {
    year = parseInt(dashMatch[1])
    month = parseInt(dashMatch[2])
  }

  // 格式2: "202501" (6位数字)
  if (!year && /^\d{6}$/.test(trimmed)) {
    year = parseInt(trimmed.substring(0, 4))
    month = parseInt(trimmed.substring(4, 6))
  }

  // 格式3: "2025 01" 或 "2025 1" (空格分隔)
  if (!year) {
    const spaceFormat = /^(\d{4})\s+(\d{1,2})$/
    const spaceMatch = trimmed.match(spaceFormat)
    if (spaceMatch) {
      year = parseInt(spaceMatch[1])
      month = parseInt(spaceMatch[2])
    }
  }

  // 校验
  if (!year || !month || month < 1 || month > 12) {
    return null
  }

  if (year < 1900 || year > 2100) {
    return null
  }

  return new Date(year, month - 1, 1)
}

// 原始数据页面月份编辑
const startEditMonth = () => {
  monthInputValue.value = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}`
  editingMonth.value = true
  nextTick(() => {
    monthInput.value?.focus()
    monthInput.value?.select()
  })
}

const applyMonthEdit = () => {
  const parsedDate = parseMonthInput(monthInputValue.value)
  if (parsedDate) {
    currentDate.value = parsedDate
  }
  editingMonth.value = false
}

const cancelMonthEdit = () => {
  editingMonth.value = false
}

// 排单页面月份编辑
const startEditSchedulerMonth = () => {
  schedulerMonthInputValue.value = `${schedulerCurrentDate.value.getFullYear()}-${String(schedulerCurrentDate.value.getMonth() + 1).padStart(2, '0')}`
  editingSchedulerMonth.value = true
  nextTick(() => {
    schedulerMonthInput.value?.focus()
    schedulerMonthInput.value?.select()
  })
}

const applySchedulerMonthEdit = () => {
  const parsedDate = parseMonthInput(schedulerMonthInputValue.value)
  if (parsedDate) {
    schedulerCurrentDate.value = parsedDate
  }
  editingSchedulerMonth.value = false
}

const cancelSchedulerMonthEdit = () => {
  editingSchedulerMonth.value = false
}

const handleCreateTask = () => {
  editingTask.value = null
  showTaskDialog.value = true
}

const handleTaskClick = (task: Task) => {
  editingTask.value = task
  showTaskDialog.value = true
}

const handleEditTask = (task: Task) => {
  editingTask.value = task
  showTaskDialog.value = true
}

const handleDeleteTask = async (id: string) => {
  dialog.warning({
    title: '删除确认',
    content: '确定要删除这个任务吗？',
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteTask(id)
      message.success('任务已删除')
    }
  })
}

const handleDeleteTaskFromTimeline = async (id: string) => {
  dialog.warning({
    title: '删除确认',
    content: '确定要删除这个任务吗？',
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteTask(id)
      message.success('任务已删除')
    }
  })
}

const handleTaskSubmit = async (taskData: any) => {
  if (editingTask.value) {
    await updateTask(editingTask.value.id, taskData)
    editingTask.value = null
  } else {
    await addTask(taskData)
  }
}

// 处理排单卡片点击
const handleScheduledTaskClick = (task: ScheduledTask) => {
  // ✨ 如果正在进行其他操作（拖拽或拉伸），不响应点击
  if (currentOperation.value !== null) {
    console.log('[Timeline] 操作进行中，忽略点击:', currentOperation.value)
    return
  }

  // 如果刚刚拖动过，不打开对话框
  if (didDragMove.value) {
    didDragMove.value = false
    return
  }

  // ✨ 检查任务状态：锁定和完成状态不允许手动修改时长
  if (task.status === TaskStatus.LOCKED || task.status === TaskStatus.COMPLETED) {
    const statusText = task.status === TaskStatus.LOCKED ? '已锁定' : '已完成'
    message.warning(`此任务${statusText}，无法手动修改时长`)
    return
  }

  editingScheduledTask.value = task
  editingScheduledTaskHours.value = task.totalHours
  showScheduledTaskDialog.value = true
}

// 保存排单卡片工时修改
const handleScheduledTaskSave = async () => {
  if (!editingScheduledTask.value) return

  try {
    // 更新commission的estimatedWorkHours
    const commission = getCommissionById(editingScheduledTask.value.commissionId)
    if (commission && commission.serviceID) {
      await window.api.db.updateVGenServiceWorkHours(
        commission.serviceID,
        editingScheduledTaskHours.value
      )
    }

    // 重新运行排单
    await runScheduling()

    showScheduledTaskDialog.value = false
    editingScheduledTask.value = null
    message.success('工时已更新，排单已重新计算')
  } catch (error: any) {
    console.error('[Timeline] 保存工时失败:', error)
    message.error(`保存失败: ${error.message}`)
  }
}

// 取消排单卡片编辑
const handleScheduledTaskCancel = () => {
  showScheduledTaskDialog.value = false
  editingScheduledTask.value = null
}

// 处理原始数据卡片点击（只读）
const handleRawDataTaskClick = (task: Task) => {
  editingRawDataTask.value = task
  showRawDataDialog.value = true
}

// 关闭原始数据详情对话框
const handleRawDataDialogClose = () => {
  showRawDataDialog.value = false
  editingRawDataTask.value = null
}

// 保存排单修改
const handleSaveScheduleChanges = async () => {
  try {
    console.log('[Timeline] 保存排单修改...')

    // 遍历所有修改过的任务，更新对应的服务工时
    for (const task of scheduledTasks.value) {
      const commission = getCommissionById(task.commissionId)
      if (commission && commission.serviceID) {
        // 检查工时是否变化
        const originalTask = modifiedTasksBackup.value.find(t => t.commissionId === task.commissionId)
        if (originalTask && originalTask.totalHours !== task.totalHours) {
          await window.api.db.updateVGenServiceWorkHours(
            commission.serviceID,
            task.totalHours
          )
          console.log(`[Timeline] 更新服务 ${commission.serviceID} 工时: ${task.totalHours}h`)
        }
      }
    }

    // 保存排单任务到数据库
    await saveScheduledTasks()

    // 清除修改标记
    hasUnsavedChanges.value = false
    modifiedTasksBackup.value = []
    interactingTask.value = null

    message.success('排单修改已保存')
  } catch (error: any) {
    console.error('[Timeline] 保存排单修改失败:', error)
    message.error(`保存失败: ${error.message}`)
  }
}

// 取消排单修改
const handleCancelScheduleChanges = () => {
  console.log('[Timeline] 取消排单修改，恢复备份')

  // 恢复备份
  if (modifiedTasksBackup.value.length > 0) {
    scheduledTasks.value = JSON.parse(JSON.stringify(modifiedTasksBackup.value))
  }

  // 清除修改标记
  hasUnsavedChanges.value = false
  modifiedTasksBackup.value = []
  interactingTask.value = null

  message.info('已取消修改')
}

// 排单卡片拉伸功能（调整工时）- 改进版
const handleCardResizeStart = (event: MouseEvent, task: ScheduledTask, direction: 'top' | 'bottom') => {
  event.stopPropagation() // 防止触发卡片点击事件

  // ✨ 如果正在进行其他操作，不启动拉伸
  if (currentOperation.value !== null) {
    console.log('[Timeline] 操作进行中，忽略拉伸:', currentOperation.value)
    return
  }

  // BUG FIX 2: 防止误触拉伸，需要明确的拖动动作
  const resizeStartY = event.clientY
  let hasStartedResize = false // 是否已经开始拉伸

  // 如果首次交互，保存所有任务的备份
  if (!hasUnsavedChanges.value) {
    modifiedTasksBackup.value = JSON.parse(JSON.stringify(scheduledTasks.value))
  }

  // 保存原始状态，包括开始小时
  const taskAsExtended = task as ExtendedScheduledTask
  originalTaskState.value = {
    startDate: task.startDate,
    endDate: task.endDate,
    totalHours: task.totalHours,
    workDays: [...task.workDays],
    startHour: taskAsExtended.startHour ?? 9
  }

  // 临时的 mousemove 处理器，检测是否移动足够距离
  const checkResizeMove = (e: MouseEvent) => {
    const deltaY = Math.abs(e.clientY - resizeStartY)

    // BUG FIX 2: 必须移动至少 5px 才开始拉伸
    if (deltaY >= 5 && !hasStartedResize) {
      hasStartedResize = true
      // ✨ 设置操作状态
      currentOperation.value = 'resizing'
      isResizingCard.value = true
      interactingTask.value = task
      dragStartY.value = resizeStartY

      // 存储调整方向
      ;(interactingTask.value as any)._resizeDirection = direction

      // ✅ Bug Fix 2: 移除检测监听器，添加实际拉伸监听器（包括结束监听）
      document.removeEventListener('mousemove', checkResizeMove)
      document.removeEventListener('mouseup', checkResizeEnd)
      document.addEventListener('mousemove', handleCardResizeMove)
      document.addEventListener('mouseup', handleCardResizeEnd)
    }
  }

  const checkResizeEnd = () => {
    document.removeEventListener('mousemove', checkResizeMove)
    document.removeEventListener('mouseup', checkResizeEnd)

    // 如果没有开始拉伸，就清理状态
    if (!hasStartedResize) {
      isResizingCard.value = false
      interactingTask.value = null
    }
  }

  document.addEventListener('mousemove', checkResizeMove)
  document.addEventListener('mouseup', checkResizeEnd)
}

const handleCardResizeMove = (event: MouseEvent) => {
  if (!isResizingCard.value || !interactingTask.value || !originalTaskState.value) return

  // 计算鼠标移动的距离（像素）
  const deltaY = event.clientY - dragStartY.value

  // 计算每小时对应的像素高度
  const schedulerContainer = document.querySelector('.scheduler-tasks-container')
  if (!schedulerContainer) return

  const containerHeight = schedulerContainer.clientHeight
  const pixelsPerHour = containerHeight / 24 // 24小时对应容器高度

  // 计算小时变化量
  const direction = (interactingTask.value as any)._resizeDirection
  const hoursChangeRaw = deltaY / pixelsPerHour

  // 以0.5小时为单位进行调整
  const hoursChange = Math.round(hoursChangeRaw * 2) / 2 // 四舍五入到最近的0.5

  // ✅ Bug Fix: 使用 taskId 查找任务，避免子任务错位
  // 对于同一订单的多个子任务，commissionId 相同，必须使用 taskId 精确匹配
  const interactingTaskId = interactingTask.value!.taskId || interactingTask.value!.commissionId
  const taskIndex = scheduledTasks.value.findIndex(t => {
    const tId = t.taskId || t.commissionId
    return tId === interactingTaskId
  })
  if (taskIndex === -1) return

  const task = scheduledTasks.value[taskIndex] as ExtendedScheduledTask
  const originalStartHour = originalTaskState.value.startHour ?? 9  // 使用 ?? 而不是 ||

  if (direction === 'top') {
    // 上边缘拉伸：改变开始时间和总工时
    const newStartHour = Math.max(0, Math.min(23.5, originalStartHour + hoursChange))
    const startHourChange = newStartHour - originalStartHour

    // 确保工时不小于0.5小时（最小单位）
    const newTotalHours = Math.max(0.5, originalTaskState.value.totalHours - startHourChange)

    // 如果没有变化，不更新
    if (task.startHour === newStartHour && task.totalHours === newTotalHours) return

    // 更新任务
    task.startHour = newStartHour
    task.totalHours = newTotalHours

    // 更新显示位置
    const percentPerHour = 100 / 24
    task.displayTop = newStartHour * percentPerHour
    task.displayHeight = Math.min((24 - newStartHour) * percentPerHour, newTotalHours * percentPerHour)

  } else {
    // 下边缘拉伸：只改变总工时
    const maxAvailableHours = 24 - originalStartHour // 最大可用小时数
    const newTotalHours = Math.max(0.5, Math.min(maxAvailableHours, originalTaskState.value.totalHours + hoursChange))

    // 如果没有变化，不更新
    if (task.totalHours === newTotalHours) return

    // 更新任务
    task.totalHours = newTotalHours

    // 更新显示高度
    const percentPerHour = 100 / 24
    task.displayHeight = Math.min((24 - originalStartHour) * percentPerHour, newTotalHours * percentPerHour)
  }

  hasUnsavedChanges.value = true
  console.log(`[Timeline] 卡片拉伸: ${originalTaskState.value.totalHours}h -> ${task.totalHours}h, startHour: ${task.startHour}`)
}

const handleCardResizeEnd = () => {
  if (isResizingCard.value && interactingTask.value) {
    console.log('[Timeline] 卡片拉伸结束，工时:', interactingTask.value.totalHours)
  }

  isResizingCard.value = false
  // ✨ 清除操作状态（延迟清除，确保点击事件能检测到）
  setTimeout(() => {
    currentOperation.value = null
  }, 100)
  // 保留 interactingTask 引用，以便显示修改状态

  document.removeEventListener('mousemove', handleCardResizeMove)
  document.removeEventListener('mouseup', handleCardResizeEnd)
}

// 智能卡片放置功能 - 检测和解决冲突
const checkTaskConflict = (task: ExtendedScheduledTask, targetDate: string, targetHour: number, excludeTaskId?: string) => {
  // 获取目标日期的所有任务
  const dayTasks = scheduledTasks.value.filter(t => {
    // ✅ Bug Fix: 使用 taskId 或 commissionId 进行比较，正确排除当前任务
    const tId = t.taskId || t.commissionId
    if (tId === excludeTaskId) return false
    const extTask = t as ExtendedScheduledTask
    return t.workDays.includes(targetDate)
  })

  // 检查时间冲突
  const conflicts: ExtendedScheduledTask[] = []
  const taskEndHour = targetHour + task.totalHours / task.workDays.length

  for (const dayTask of dayTasks) {
    const extTask = dayTask as ExtendedScheduledTask
    // 使用 ?? 而不是 || 来正确处理0值
    const otherStartHour = extTask.startHour ?? 9
    const otherEndHour = otherStartHour + dayTask.totalHours / dayTask.workDays.length

    // 检查是否有重叠
    if (!(taskEndHour <= otherStartHour || targetHour >= otherEndHour)) {
      conflicts.push(extTask)
    }
  }

  return conflicts
}

// ✨ 检查冲突解决是否会导致边界溢出（改进版：递归检查连锁推动）
const checkBoundaryOverflow = (
  conflicts: ExtendedScheduledTask[],
  movingTask: ExtendedScheduledTask,
  targetHour: number,
  targetDate: string
): { willOverflow: boolean; affectedTasks: ExtendedScheduledTask[] } => {
  const movingTaskHours = movingTask.totalHours / movingTask.workDays.length
  const movingTaskEndHour = targetHour + movingTaskHours
  const affectedTasks: ExtendedScheduledTask[] = []

  // 模拟连锁推动，检查是否有任务会溢出
  const simulatePushChain = (
    pushingTaskEndHour: number,
    pushingTaskStartHour: number,
    tasksToCheck: ExtendedScheduledTask[],
    processedIds: Set<string> = new Set()
  ): boolean => {
    // 按开始时间排序
    const sorted = [...tasksToCheck].sort((a, b) => (a.startHour ?? 9) - (b.startHour ?? 9))

    for (const task of sorted) {
      const taskId = task.taskId || task.commissionId
      if (processedIds.has(taskId)) continue
      processedIds.add(taskId)

      const taskHours = task.totalHours / task.workDays.length
      const currentStartHour = task.startHour ?? 9
      let newStartHour: number

      // 判断推动方向
      if (currentStartHour >= pushingTaskStartHour) {
        // 向下推
        newStartHour = Math.max(currentStartHour, pushingTaskEndHour)
        const newEndHour = newStartHour + taskHours

        // ✨ 检查是否会超出24小时边界
        if (newEndHour > 24) {
          console.log(`[Timeline] 连锁推动溢出检测: ${taskId} 会被推到 ${newEndHour}h (超过24h)`)
          affectedTasks.push(task)
          return true // 会溢出
        }

        // ✨ 递归检查：这个任务被推动后，是否会推动其他任务导致溢出
        const nextConflicts = checkTaskConflict(task, targetDate, newStartHour, taskId)
        if (nextConflicts.length > 0) {
          const willOverflow = simulatePushChain(newEndHour, newStartHour, nextConflicts, processedIds)
          if (willOverflow) {
            affectedTasks.push(task)
            return true
          }
        }
      } else {
        // 向上推
        newStartHour = Math.min(currentStartHour, pushingTaskStartHour - taskHours)

        // ✨ 检查是否会低于0
        if (newStartHour < 0) {
          console.log(`[Timeline] 连锁推动溢出检测: ${taskId} 会被推到 ${newStartHour}h (低于0h)`)
          affectedTasks.push(task)
          return true // 会溢出
        }

        // ✨ 递归检查向上推动
        const nextConflicts = checkTaskConflict(task, targetDate, newStartHour, taskId)
        if (nextConflicts.length > 0) {
          const willOverflow = simulatePushChain(newStartHour, newStartHour, nextConflicts, processedIds)
          if (willOverflow) {
            affectedTasks.push(task)
            return true
          }
        }
      }
    }

    return false
  }

  const willOverflow = simulatePushChain(movingTaskEndHour, targetHour, conflicts)

  return { willOverflow, affectedTasks }
}

// ✨ 智能解决冲突 - 调整其他卡片位置（改进版，支持连锁碰撞检测）
// 返回值：true 表示成功解决所有冲突，false 表示存在无法解决的冲突
const resolveConflicts = (
  movingTask: ExtendedScheduledTask,
  targetHour: number,
  conflicts: ExtendedScheduledTask[],
  processedTasks: Set<string> = new Set(),
  depth: number = 0,
  originalDate?: string  // ✅ Bug Fix: 添加原始日期参数，防止跨日期推动
): boolean => {
  // 防止无限递归
  const MAX_DEPTH = 10
  if (depth >= MAX_DEPTH) {
    console.warn('[Timeline] 连锁碰撞检测达到最大深度，停止递归')
    return false
  }

  const movingTaskHours = movingTask.totalHours / movingTask.workDays.length
  const movingTaskEndHour = targetHour + movingTaskHours
  const movingTaskId = movingTask.taskId || movingTask.commissionId

  // ✅ Bug Fix: 如果没有提供原始日期，使用移动任务的第一个工作日
  const targetDate = originalDate || movingTask.workDays[0]

  // 标记当前任务已处理
  processedTasks.add(movingTaskId)

  // 按开始时间排序冲突的任务
  conflicts.sort((a, b) => (a.startHour ?? 9) - (b.startHour ?? 9))

  // 记录所有被移动的任务，用于连锁碰撞检测
  const movedTasks: Array<{ task: ExtendedScheduledTask; newStartHour: number }> = []

  // ✅ Bug Fix 3: 记录是否所有冲突都成功解决
  let allConflictsResolved = true

  // 智能调整策略
  for (const conflictTask of conflicts) {
    const conflictTaskId = conflictTask.taskId || conflictTask.commissionId

    // 跳过已经处理过的任务（避免循环）
    if (processedTasks.has(conflictTaskId)) {
      continue
    }

    const conflictHours = conflictTask.totalHours / conflictTask.workDays.length
    const currentStartHour = conflictTask.startHour ?? 9
    let newStartHour: number

    // 添加挤压动效标记
    ;(conflictTask as any)._isSqueezed = true

    // 如果冲突任务在移动任务之后，向下推
    if (currentStartHour >= targetHour) {
      // ✅ Bug Fix 3: 检查推动后是否会触底，如果会则标记为解决失败
      const proposedStartHour = Math.max(currentStartHour, movingTaskEndHour)
      const proposedEndHour = proposedStartHour + conflictHours

      if (proposedEndHour > 24) {
        // 会触底，标记解决失败
        console.log('[Timeline] 推动会导致触底，无法解决冲突:', conflictTaskId)
        // 移除挤压标记
        delete (conflictTask as any)._isSqueezed
        allConflictsResolved = false
        continue
      }

      newStartHour = proposedStartHour
    } else {
      // 如果冲突任务在移动任务之前，尝试向上推
      const newEndHour = targetHour
      newStartHour = Math.max(0, newEndHour - conflictHours)

      // ✅ Bug Fix 3: 检查是否会触顶，如果会则标记为解决失败
      if (newStartHour < 0) {
        console.log('[Timeline] 推动会导致触顶，无法解决冲突:', conflictTaskId)
        delete (conflictTask as any)._isSqueezed
        allConflictsResolved = false
        continue
      }
    }

    // ✅ Bug Fix 3: 更新任务位置，但不设置displayHeight（避免压缩）
    conflictTask.startHour = newStartHour
    conflictTask.displayTop = (newStartHour / 24) * 100
    // 移除 displayHeight 设置，让系统根据 totalHours 自动计算
    delete (conflictTask as ExtendedScheduledTask).displayHeight

    // 记录被移动的任务
    movedTasks.push({ task: conflictTask, newStartHour })

    // 300ms后移除挤压动效标记
    setTimeout(() => {
      delete (conflictTask as any)._isSqueezed
    }, 300)
  }

  // ✨ 连锁碰撞检测：检查被移动的任务是否与其他任务冲突
  for (const { task, newStartHour } of movedTasks) {
    const taskId = task.taskId || task.commissionId

    // ✅ Bug Fix: 使用原始日期参数进行冲突检测，防止跨日期推动
    // 查找在同一天的其他任务（排除已经处理过的）
    if (!targetDate) continue

    // 检查新位置的冲突
    const newConflicts = checkTaskConflict(task, targetDate, newStartHour, taskId)
      .filter(t => {
        const tId = (t as ScheduledTask).taskId || (t as ScheduledTask).commissionId
        return !processedTasks.has(tId) // 排除已处理的任务
      })

    if (newConflicts.length > 0) {
      console.log(`[Timeline] 检测到连锁碰撞 (深度${depth + 1}):`, {
        task: taskId,
        newConflicts: newConflicts.length
      })

      // ✅ Bug Fix: 递归解决连锁冲突时，传递原始日期参数
      // 如果连锁冲突解决失败，也标记为整体失败
      const chainResolved = resolveConflicts(
        task,
        newStartHour,
        newConflicts,
        processedTasks,
        depth + 1,
        targetDate  // 传递原始日期，确保连锁推动不会跨日期
      )

      if (!chainResolved) {
        allConflictsResolved = false
      }
    }
  }

  // ✅ Bug Fix 3: 返回冲突解决状态
  return allConflictsResolved
}

// 右键点击切换任务状态
const handleCardRightClick = (event: MouseEvent, task: ScheduledTask) => {
  event.preventDefault()
  event.stopPropagation()

  // 获取任务索引
  const taskIndex = scheduledTasks.value.findIndex(t => {
    const tId = t.taskId || t.commissionId
    const taskId = task.taskId || task.commissionId
    return tId === taskId
  })

  if (taskIndex === -1) return

  // 如果首次交互，保存所有任务的备份
  if (!hasUnsavedChanges.value) {
    modifiedTasksBackup.value = JSON.parse(JSON.stringify(scheduledTasks.value))
  }

  const currentTask = scheduledTasks.value[taskIndex]
  const currentStatus = currentTask.status || TaskStatus.NORMAL

  // 循环切换状态：NORMAL -> LOCKED -> COMPLETED -> NORMAL
  let newStatus: TaskStatus
  switch (currentStatus) {
    case TaskStatus.NORMAL:
      newStatus = TaskStatus.LOCKED
      break
    case TaskStatus.LOCKED:
      newStatus = TaskStatus.COMPLETED
      break
    case TaskStatus.COMPLETED:
      newStatus = TaskStatus.NORMAL
      break
    default:
      newStatus = TaskStatus.NORMAL
  }

  // 更新任务状态
  currentTask.status = newStatus

  // 同步更新isLocked字段（保持兼容性）
  currentTask.isLocked = (newStatus === TaskStatus.LOCKED || newStatus === TaskStatus.COMPLETED)

  hasUnsavedChanges.value = true

  // 显示提示消息
  const statusNames = {
    [TaskStatus.NORMAL]: '普通状态 📋',
    [TaskStatus.LOCKED]: '锁定状态 🔒',
    [TaskStatus.COMPLETED]: '完成状态 ✅'
  }
  message.success(`已切换为 ${statusNames[newStatus]}`)

  console.log('[Timeline] 任务状态已切换:', {
    taskId: task.taskId || task.commissionId,
    oldStatus: currentStatus,
    newStatus: newStatus
  })
}

// 卡片拖动功能（改进版 - 支持垂直移动和智能冲突解决）
const handleCardDragStart = (event: MouseEvent, task: ScheduledTask) => {
  // ✨ 检查任务状态：只有锁定状态不允许跨日期拖拽
  if (task.status === TaskStatus.LOCKED) {
    message.warning('此任务已锁定，无法拖拽到其他日期')
    return
  }

  // ✨ 如果正在进行其他操作，不启动拖动
  if (currentOperation.value !== null) {
    console.log('[Timeline] 操作进行中，忽略拖拽:', currentOperation.value)
    return
  }

  // 如果点击的是拉伸手柄，不启动拖动
  if ((event.target as HTMLElement).closest('.card-resize-handle')) {
    return
  }

  // 如果首次交互，保存所有任务的备份
  if (!hasUnsavedChanges.value) {
    modifiedTasksBackup.value = JSON.parse(JSON.stringify(scheduledTasks.value))
  }

  // ✨ 设置操作状态
  currentOperation.value = 'dragging'
  isDraggingCard.value = true
  didDragMove.value = false // 重置拖动标志
  interactingTask.value = task
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY

  const taskAsExtended = task as ExtendedScheduledTask
  originalTaskState.value = {
    startDate: task.startDate,
    endDate: task.endDate,
    totalHours: task.totalHours,
    workDays: [...task.workDays],
    startHour: taskAsExtended.startHour ?? 9  // 使用 ?? 而不是 ||
  }

  // 添加拖动中的样式类
  document.body.style.cursor = 'grabbing'

  document.addEventListener('mousemove', handleCardDragMove)
  document.addEventListener('mouseup', handleCardDragEnd)
}

// 添加无效放置标记的响应式状态
const isInvalidPlacement = ref(false)

const handleCardDragMove = (event: MouseEvent) => {
  if (!isDraggingCard.value || !interactingTask.value || !originalTaskState.value) return

  // 计算鼠标移动的距离（像素）
  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  // 如果移动超过阈值，标记为已拖动
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    didDragMove.value = true
  }

  // 获取当前显示的日期列表
  const days = schedulerDaysInPeriod.value
  if (days.length === 0) return

  // 计算每天的宽度（像素）
  let dayWidth: number
  if (schedulerViewMode.value === 'week') {
    const schedulerContent = document.querySelector('.scheduler-calendar-content')
    if (!schedulerContent) return
    dayWidth = schedulerContent.clientWidth / 7
  } else {
    dayWidth = schedulerDayWidth.value
  }

  // 计算日期偏移量（以天为单位）
  const daysOffset = Math.round(deltaX / dayWidth)

  // 计算垂直位置（小时） - 以0.5小时为单位
  const schedulerContainer = document.querySelector('.scheduler-tasks-container')
  if (!schedulerContainer) return

  const containerHeight = schedulerContainer.clientHeight
  const pixelsPerHour = containerHeight / 24
  const hoursOffsetRaw = deltaY / pixelsPerHour
  const hoursOffset = Math.round(hoursOffsetRaw * 2) / 2 // 四舍五入到最近的0.5

  // 计算新的开始日期
  const originalStart = new Date(originalTaskState.value.startDate)
  const newStart = new Date(originalStart)
  newStart.setDate(originalStart.getDate() + daysOffset)

  const newEnd = new Date(originalTaskState.value.endDate)
  newEnd.setDate(newEnd.getDate() + daysOffset)

  // 计算新的开始小时（0.5小时为最小单位）
  const originalStartHour = originalTaskState.value.startHour ?? 9  // 使用 ?? 而不是 ||
  const newStartHour = Math.max(0, Math.min(23.5, originalStartHour + hoursOffset))

  // 格式化日期为 YYYY-MM-DD
  const newStartDate = newStart.toISOString().split('T')[0]
  const newEndDate = newEnd.toISOString().split('T')[0]

  // ✅ Bug Fix 1: 使用taskId查找任务，避免子任务错位
  // 对于同一订单的多个子任务，commissionId相同，必须使用taskId或精确匹配
  const interactingTaskId = interactingTask.value!.taskId || interactingTask.value!.commissionId
  const taskIndex = scheduledTasks.value.findIndex(t => {
    const tId = t.taskId || t.commissionId
    return tId === interactingTaskId
  })
  if (taskIndex === -1) return

  const task = scheduledTasks.value[taskIndex] as ExtendedScheduledTask

  // ✨ 重构：统一的碰撞检测逻辑（不区分子任务和普通任务）
  const collisionTarget = findCollisionTarget(task, newStartDate, newStartHour)

  if (collisionTarget) {
    // 检查是否可以合并（同一订单的不同分支）
    const canMerge = canMergeTasks(task, collisionTarget)

    if (canMerge) {
      // 碰撞计时逻辑
      if (collidingTarget.value !== collisionTarget) {
        // 新的碰撞目标，重置计时器
        collisionStartTime.value = Date.now()
        collidingTarget.value = collisionTarget
        collisionDuration.value = 0
        console.log('[Timeline] 开始碰撞计时，目标:', collisionTarget.taskId || collisionTarget.commissionId)
      } else {
        // 持续碰撞，更新持续时间
        collisionDuration.value = Date.now() - (collisionStartTime.value || 0)
      }

      // 根据碰撞持续时间显示不同的视觉效果
      if (collisionDuration.value >= COLLISION_MERGE_THRESHOLD) {
        // 碰撞超过0.5秒，显示准备合并效果
        ;(collisionTarget as any)._isMergeReady = true
        ;(task as any)._isMergeReady = true
        delete (collisionTarget as any)._isMergeTarget
        console.log('[Timeline] 碰撞持续', collisionDuration.value, 'ms，准备合并')
      } else {
        // 碰撞未达到阈值，显示碰撞预览
        ;(collisionTarget as any)._isMergeTarget = true
        delete (collisionTarget as any)._isMergeReady
      }

      isInvalidPlacement.value = false
    } else {
      // 不可合并（不同订单或工时溢出）
      // 重置碰撞计时，进入正常移动逻辑
      collisionStartTime.value = null
      collidingTarget.value = null
      collisionDuration.value = 0
      console.log('[Timeline] 不可合并，尝试智能调整位置')
    }
  }

  // 清除所有标记（无论是否有碰撞）
  scheduledTasks.value.forEach(t => {
    delete (t as any)._isWarning
    delete (t as any)._isMergeTarget
    delete (t as any)._isMergeReady
    delete (t as any)._isInvalid
  })

  // 如果刚才可以合并且正在等待合并，不继续执行移动逻辑
  if (collidingTarget.value && collisionDuration.value < COLLISION_MERGE_THRESHOLD) {
    return
  }
  if (collidingTarget.value && collisionDuration.value >= COLLISION_MERGE_THRESHOLD) {
    // 准备合并，恢复标记
    ;(collidingTarget.value as any)._isMergeReady = true
    ;(task as any)._isMergeReady = true
    return
  }

  // 正常移动逻辑：检查冲突
  // ✅ Bug Fix: 使用 taskId 而不是 commissionId，正确排除同一订单的其他子任务
  const allConflicts = checkTaskConflict(task, newStartDate, newStartHour, task.taskId || task.commissionId)

  // ✨ Bug Fix 4: 过滤掉可以合并的冲突（同一commission的子任务不应该互相推动）
  // 同一commission的子任务只能通过按住0.5秒来合并，不会互相推动
  const conflicts = allConflicts.filter(conflictTask => !canMergeTasks(task, conflictTask))

  // 如果有可合并的冲突，记录日志
  if (allConflicts.length > conflicts.length) {
    console.log('[Timeline] 过滤掉可合并的冲突任务:', allConflicts.length - conflicts.length, '个（同一commission的子任务）')
  }

  // ✨ 检查是否会导致边界溢出（包含连锁推动检测）
  const overflowResult = conflicts.length > 0
    ? checkBoundaryOverflow(conflicts, task, newStartHour, newStartDate)
    : { willOverflow: false, affectedTasks: [] }

  if (overflowResult.willOverflow) {
    // 如果会溢出，标记为无效放置
    isInvalidPlacement.value = true

    // 给拖动的卡片添加警告效果
    ;(task as any)._isInvalid = true

    // ✨ 给所有会被推出边界的卡片添加警告效果
    for (const affectedTask of overflowResult.affectedTasks) {
      ;(affectedTask as any)._isWarning = true
    }

    // 给直接冲突的卡片也添加警告效果
    for (const conflictTask of conflicts) {
      ;(conflictTask as any)._isWarning = true
    }

    // 不更新位置，保持原位
    console.log('[Timeline] 无效放置：会导致连锁推动溢出，受影响任务:', overflowResult.affectedTasks.length)
    return
  }

  // 更新任务位置
  task.startDate = newStartDate
  task.endDate = newEndDate
  task.startHour = newStartHour

  // 重新计算工作日列表
  const workDays: string[] = []
  const currentDate = new Date(newStart)
  const duration = originalTaskState.value.workDays.length

  for (let i = 0; i < duration; i++) {
    workDays.push(currentDate.toISOString().split('T')[0])
    currentDate.setDate(currentDate.getDate() + 1)
  }

  task.workDays = workDays

  // ✅ Bug Fix 3: 检查任务是否会超出24小时边界
  const percentPerHour = 100 / 24
  const taskHours = task.totalHours / task.workDays.length
  const taskEndHour = newStartHour + taskHours

  if (taskEndHour > 24) {
    // 会超出边界，标记为无效放置
    isInvalidPlacement.value = true
    ;(task as any)._isInvalid = true
    console.log('[Timeline] 无效放置：任务会超出24小时边界', {
      startHour: newStartHour,
      endHour: taskEndHour,
      taskHours
    })
    // 不更新位置，保持原位
    return
  }

  // 更新显示位置（不设置 displayHeight，避免压缩）
  task.displayTop = newStartHour * percentPerHour
  // ✅ Bug Fix 3: 删除 displayHeight，让系统根据 totalHours 自动计算高度
  delete (task as ExtendedScheduledTask).displayHeight

  // ✅ 智能解决冲突（只在不溢出的情况下）
  if (conflicts.length > 0 && !overflowResult.willOverflow) {
    const conflictsResolved = resolveConflicts(task, newStartHour, conflicts, new Set(), 0, newStartDate)

    if (!conflictsResolved) {
      // ✅ Bug Fix 3: 冲突解决失败，存在无法推动的任务，标记为无效放置
      isInvalidPlacement.value = true
      ;(task as any)._isInvalid = true
      console.log('[Timeline] 无效放置：冲突解决失败，存在无法推动的任务')
      // 不更新位置，保持原位
      return
    }
  }

  hasUnsavedChanges.value = true

  console.log(`[Timeline] 卡片拖动: ${originalTaskState.value.startDate} -> ${newStartDate}, 小时: ${originalStartHour} -> ${newStartHour}`)
}

// ✨ 重构：统一的碰撞检测（查找在指定位置重叠的任务）
const findCollisionTarget = (draggingTask: ScheduledTask, targetDate: string, targetHour: number) => {
  const draggingId = draggingTask.taskId || draggingTask.commissionId
  const draggingHours = draggingTask.totalHours / draggingTask.workDays.length
  const draggingEndHour = targetHour + draggingHours

  return scheduledTasks.value.find(t => {
    // 排除自己
    const targetId = t.taskId || t.commissionId
    if (targetId === draggingId) return false

    // 检查是否在同一天
    if (!t.workDays.includes(targetDate)) return false

    // 检查垂直位置是否重叠
    const extTask = t as ExtendedScheduledTask
    const taskStartHour = extTask.startHour ?? 9
    const taskHours = t.totalHours / t.workDays.length
    const taskEndHour = taskStartHour + taskHours

    // 判断两个时间段是否重叠（容忍1小时范围内的接近）
    const isOverlapping = !(draggingEndHour <= taskStartHour - 1 || targetHour >= taskEndHour + 1)

    return isOverlapping
  })
}

// ✨ 重构：判断两个任务是否可以合并（同一订单的不同分支）
const canMergeTasks = (task1: ScheduledTask, task2: ScheduledTask) => {
  // 规则0：锁定和完成状态的任务不能合并
  if (task1.status === TaskStatus.LOCKED || task1.status === TaskStatus.COMPLETED ||
      task2.status === TaskStatus.LOCKED || task2.status === TaskStatus.COMPLETED) {
    return false
  }

  // 规则1：必须是同一个commission的任务
  if (task1.commissionId !== task2.commissionId) {
    return false
  }

  // 规则2：如果有parentTaskId，必须相同（同一母单的子任务）
  if (task1.parentTaskId || task2.parentTaskId) {
    if (task1.parentTaskId !== task2.parentTaskId) {
      return false
    }
  }

  // 规则3：合并后工时不能超过24小时
  const totalHours = task1.totalHours + task2.totalHours
  if (totalHours > 24) {
    return false
  }

  return true
}

// 验证子任务合并是否有效（保留用于兼容）
const validateSubTaskMerge = (task1: ScheduledTask, task2: ScheduledTask) => {
  return canMergeTasks(task1, task2)
}

// 检查是否可以合并子任务（保留用于兼容，重定向到新逻辑）
const checkSubTaskMerge = (draggingTask: ScheduledTask, targetDate: string, targetHour: number) => {
  return findCollisionTarget(draggingTask, targetDate, targetHour)
}

// ✨ 执行子任务合并（改进版：支持跨日期合并）
const mergeSubTasks = (sourceTask: ScheduledTask, targetTask: ScheduledTask) => {
  if (!validateSubTaskMerge(sourceTask, targetTask)) {
    message.error('无法合并：工时超出限制或不是同一母单')
    return
  }

  const extSourceTask = sourceTask as ExtendedScheduledTask
  const extTargetTask = targetTask as ExtendedScheduledTask

  // 保存合并前的信息
  const originalTargetHours = targetTask.totalHours
  const sourceHours = sourceTask.totalHours

  // ✨ 跨日期合并：只增加目标任务的总工时，不改变日期
  // 目标任务保持原有的工作日、开始日期、结束日期
  targetTask.totalHours += sourceTask.totalHours

  // 更新目标任务所在日期的每日工时分配
  // 将所有工时集中在目标任务的当前日期
  const targetMainDate = targetTask.workDays[0] // 使用第一个工作日作为主要日期
  if (targetMainDate) {
    targetTask.hoursPerDay[targetMainDate] = (targetTask.hoursPerDay[targetMainDate] || 0) + sourceTask.totalHours
  }

  // 保持原有的 startHour（或使用两者中较早的）
  const sourceStartHour = extSourceTask.startHour ?? 9
  const targetStartHour = extTargetTask.startHour ?? 9
  extTargetTask.startHour = Math.min(sourceStartHour, targetStartHour)

  // 清除自定义显示属性，让系统重新计算高度
  delete extTargetTask.displayTop
  delete extTargetTask.displayHeight

  console.log('[Timeline] 跨日期合并完成:', {
    sourceId: sourceTask.taskId,
    targetId: targetTask.taskId,
    sourceDate: sourceTask.workDays[0],
    targetDate: targetTask.workDays[0],
    sourceTotalHours: sourceHours,
    originalTargetHours: originalTargetHours,
    mergedTotalHours: targetTask.totalHours,
    startHour: extTargetTask.startHour
  })

  // 删除源任务
  const sourceIndex = scheduledTasks.value.findIndex(t => t.taskId === sourceTask.taskId)
  if (sourceIndex !== -1) {
    scheduledTasks.value.splice(sourceIndex, 1)
  }

  // 更新子任务索引
  const remainingSubTasks = scheduledTasks.value.filter(t =>
    t.parentTaskId === targetTask.parentTaskId
  ).sort((a, b) => (a.subTaskIndex ?? 0) - (b.subTaskIndex ?? 0))

  remainingSubTasks.forEach((task, index) => {
    task.subTaskIndex = index
    task.subTaskCount = remainingSubTasks.length
  })

  // ✨ 检查合并后是否造成碰撞，并解决连锁碰撞
  const targetDate = targetTask.workDays[0]
  if (targetDate) {
    const targetTaskId = targetTask.taskId || targetTask.commissionId
    const newStartHour = extTargetTask.startHour ?? 9

    // 检查合并后的高度是否与其他任务冲突
    const conflicts = checkTaskConflict(extTargetTask, targetDate, newStartHour, targetTaskId)

    if (conflicts.length > 0) {
      console.log('[Timeline] 合并后检测到碰撞，开始解决:', conflicts.length)

      // 使用连锁碰撞检测解决冲突，传递原始日期防止跨日期推动
      resolveConflicts(extTargetTask, newStartHour, conflicts, new Set(), 0, targetDate)
    }
  }

  // 强制触发响应式更新
  scheduledTasks.value = [...scheduledTasks.value]

  hasUnsavedChanges.value = true
  message.success(`子任务已合并：${sourceHours}h + ${originalTargetHours}h = ${targetTask.totalHours}h`)
}

const handleCardDragEnd = () => {
  if (isDraggingCard.value && interactingTask.value) {
    // 检查是否满足碰撞合并条件（碰撞持续时间 >= 0.5秒）
    const shouldAutoMerge = collidingTarget.value &&
                           collisionDuration.value >= COLLISION_MERGE_THRESHOLD &&
                           !isInvalidPlacement.value

    if (shouldAutoMerge) {
      // 自动合并（碰撞超过0.5秒）
      console.log('[Timeline] 碰撞持续', collisionDuration.value, 'ms，自动合并')
      mergeSubTasks(interactingTask.value, collidingTarget.value!)
    } else if (isInvalidPlacement.value) {
      // 如果是无效放置，恢复原位
      const taskIndex = scheduledTasks.value.findIndex(t => t.commissionId === interactingTask.value!.commissionId)
      if (taskIndex !== -1 && originalTaskState.value) {
        const task = scheduledTasks.value[taskIndex] as ExtendedScheduledTask

        // 恢复原始位置
        task.startDate = originalTaskState.value.startDate
        task.endDate = originalTaskState.value.endDate
        task.workDays = originalTaskState.value.workDays
        task.startHour = originalTaskState.value.startHour

        // 恢复显示位置（不设置 displayHeight，避免压缩）
        const percentPerHour = 100 / 24
        task.displayTop = (task.startHour ?? 9) * percentPerHour
        // ✅ Bug Fix 3: 删除 displayHeight，让系统根据 totalHours 自动计算高度
        delete (task as ExtendedScheduledTask).displayHeight

        console.log('[Timeline] 无效放置，恢复原位')
      }
    } else {
      console.log('[Timeline] 卡片拖动结束，新日期:', interactingTask.value.startDate)
    }

    // 清除所有标记
    isInvalidPlacement.value = false
    scheduledTasks.value.forEach(t => {
      delete (t as any)._isInvalid
      delete (t as any)._isWarning
      delete (t as any)._isMergeTarget
      delete (t as any)._isMergeReady
    })

    // 重置碰撞计时状态
    collisionStartTime.value = null
    collidingTarget.value = null
    collisionDuration.value = 0

    // 恢复光标样式
    document.body.style.cursor = ''
  }

  isDraggingCard.value = false
  // ✨ 清除操作状态（延迟清除，确保点击事件能检测到）
  setTimeout(() => {
    currentOperation.value = null
  }, 100)
  // 保留 interactingTask 引用，以便显示修改状态
  // 不重置 didDragMove，让 click 事件处理器能够检查

  document.removeEventListener('mousemove', handleCardDragMove)
  document.removeEventListener('mouseup', handleCardDragEnd)
}

// 拖拽调整大小
const handleResizeStart = (event: MouseEvent, task: Task, type: 'start' | 'end') => {
  resizing.value = {
    task,
    type,
    startX: event.clientX,
    originalStartDate: task.startDate,
    originalEndDate: task.endDate
  }
  
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

const handleResizeMove = (event: MouseEvent) => {
  if (!resizing.value) return
  
  const timelineEl = document.querySelector('.timeline-days')
  if (!timelineEl) return
  
  const rect = timelineEl.getBoundingClientRect()
  const totalDays = allDaysInMonth.value.length
  const dayWidth = rect.width / totalDays
  
  const deltaX = event.clientX - resizing.value.startX
  const deltaDays = Math.round(deltaX / dayWidth)
  
  if (deltaDays === 0) return
  
  const { task, type, originalStartDate, originalEndDate } = resizing.value
  
  if (type === 'start') {
    const newStartDate = parseDateString(originalStartDate)
    newStartDate.setDate(newStartDate.getDate() + deltaDays)
    
    // 确保开始日期不晚于结束日期
    const endDate = parseDateString(originalEndDate)
    if (newStartDate <= endDate) {
      updateTask(task.id, {
        startDate: formatDateString(newStartDate)
      })
    }
  } else {
    const newEndDate = parseDateString(originalEndDate)
    newEndDate.setDate(newEndDate.getDate() + deltaDays)
    
    // 确保结束日期不早于开始日期
    const startDate = parseDateString(originalStartDate)
    if (newEndDate >= startDate) {
      updateTask(task.id, {
        endDate: formatDateString(newEndDate)
      })
    }
  }
}

const handleResizeEnd = () => {
  resizing.value = null
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

// 分隔条拖拽相关
const startResize = (event: MouseEvent) => {
  isResizingPanels.value = true
  startY.value = event.clientY
  startTimelineHeight.value = timelineHeight.value
  
  document.addEventListener('mousemove', handlePanelResize)
  document.addEventListener('mouseup', stopPanelResize)
  
  event.preventDefault()
}

const handlePanelResize = (event: MouseEvent) => {
  if (!isResizingPanels.value) return
  
  const deltaY = event.clientY - startY.value
  const newTimelineHeight = startTimelineHeight.value + deltaY
  
  // 限制最小和最大高度
  const minHeight = 300
  const maxHeight = window.innerHeight - 250 // 留出空间给TodoList
  
  if (newTimelineHeight >= minHeight && newTimelineHeight <= maxHeight) {
    timelineHeight.value = newTimelineHeight
    // TodoList高度自动调整
    todoHeight.value = Math.max(200, window.innerHeight - newTimelineHeight - 200)
  }
}

const stopPanelResize = () => {
  isResizingPanels.value = false
  document.removeEventListener('mousemove', handlePanelResize)
  document.removeEventListener('mouseup', stopPanelResize)
}

// 处理原始数据页面滚轮缩放（以鼠标位置为中心）
const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()

    // 使用事件目标所在的calendar-view元素
    const timelineEl = e.currentTarget as HTMLElement
    if (!timelineEl) return

    // 获取鼠标相对于时间线容器的位置
    const rect = timelineEl.getBoundingClientRect()
    const mouseX = e.clientX - rect.left

    // 计算缩放前鼠标位置对应的滚动比例
    const scrollLeft = timelineEl.scrollLeft
    const scrollRatio = (scrollLeft + mouseX) / (allDaysInMonth.value.length * dayWidth.value)

    // 计算新宽度
    const delta = e.deltaY > 0 ? -10 : 10
    const newWidth = dayWidth.value + delta

    // 限制最小和最大宽度
    if (newWidth >= minZoom && newWidth <= maxZoom) {
      const oldWidth = dayWidth.value
      dayWidth.value = newWidth

      // 在下一帧调整滚动位置，保持鼠标下的内容不变
      requestAnimationFrame(() => {
        const newTotalWidth = allDaysInMonth.value.length * newWidth
        const newScrollLeft = scrollRatio * newTotalWidth - mouseX
        timelineEl.scrollLeft = Math.max(0, newScrollLeft)
      })
    }
  }
}

// 处理排单页面滚轮缩放（以鼠标位置为中心）
const handleSchedulerWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()

    // 计算新宽度
    const delta = e.deltaY > 0 ? -10 : 10
    const newWidth = schedulerDayWidth.value + delta

    // 限制最小和最大宽度
    if (newWidth >= schedulerMinZoom && newWidth <= schedulerMaxZoom) {
      schedulerDayWidth.value = newWidth

      // 按月模式下需要调整滚动位置
      if (schedulerViewMode.value === 'month') {
        const schedulerEl = document.querySelector('.scheduler-calendar-timeline') as HTMLElement
        if (schedulerEl) {
          // 获取鼠标相对于时间线容器的位置
          const rect = schedulerEl.getBoundingClientRect()
          const mouseX = e.clientX - rect.left

          // 计算缩放前鼠标位置对应的滚动比例
          const scrollLeft = schedulerEl.scrollLeft
          const oldTotalWidth = schedulerDaysInMonth.value.length * (schedulerDayWidth.value - delta)
          const scrollRatio = oldTotalWidth > 0 ? (scrollLeft + mouseX) / oldTotalWidth : 0

          // 在下一帧调整滚动位置，保持鼠标下的内容不变
          requestAnimationFrame(() => {
            const newTotalWidth = schedulerDaysInMonth.value.length * newWidth
            const newScrollLeft = scrollRatio * newTotalWidth - mouseX
            schedulerEl.scrollLeft = Math.max(0, newScrollLeft)
          })
        }
      }
      // 按周模式下不需要调整滚动，因为没有横向滚动
    }
  }
}

// 智能排单相关函数
const loadSchedulerData = async () => {
  try {
    // 加载配置
    const config = await window.api.scheduler.getConfig()
    if (config) {
      schedulerConfig.value = config
    }

    // 加载已排单任务
    const tasks = await window.api.scheduler.getScheduledTasks()
    if (tasks) {
      // BUG FIX 1 & 3: 确保加载的任务保留所有属性，特别是 startHour 和子任务属性
      scheduledTasks.value = tasks.map(task => {
        const extTask = task as ExtendedScheduledTask

        // 如果任务有 startHour，确保它被正确设置
        if (task.startHour !== undefined) {
          extTask.startHour = task.startHour
        } else if (task.parentTaskId && task.subTaskIndex !== undefined) {
          // 如果是子任务但没有 startHour，根据索引计算
          extTask.startHour = 9 + (task.subTaskIndex * 0.5)
        } else {
          // 普通任务默认 9 点，但要检查是否与其他任务冲突
          extTask.startHour = 9
        }

        // 确保子任务属性被保留
        if (task.parentTaskId) {
          extTask.parentTaskId = task.parentTaskId
          extTask.subTaskIndex = task.subTaskIndex
          extTask.subTaskCount = task.subTaskCount
          extTask.taskId = task.taskId
        }

        return extTask
      })

      // 调整重叠的任务（防止所有卡片堆叠在一起）
      adjustOverlappingTasks()
    }

    schedulerLoaded.value = true
    console.log('✅ 加载了智能排单数据:', {
      config: schedulerConfig.value,
      tasksCount: scheduledTasks.value.length,
      tasks: scheduledTasks.value.map(t => ({
        id: t.commissionId,
        startHour: (t as ExtendedScheduledTask).startHour,
        parentTaskId: t.parentTaskId,
        subTaskIndex: t.subTaskIndex,
        subTaskCount: t.subTaskCount,
        taskId: t.taskId
      }))
    })

    // BUG FIX 6: 检查并修复缺失的子任务计数
    const subTaskGroups = new Map<string, ScheduledTask[]>()
    scheduledTasks.value.forEach(task => {
      if (task.parentTaskId) {
        if (!subTaskGroups.has(task.parentTaskId)) {
          subTaskGroups.set(task.parentTaskId, [])
        }
        subTaskGroups.get(task.parentTaskId)!.push(task)
      }
    })

    // 确保所有子任务的 subTaskCount 正确
    subTaskGroups.forEach((tasks, parentId) => {
      tasks.forEach(task => {
        task.subTaskCount = tasks.length
      })
    })

    console.log('[Timeline] 子任务组:', Array.from(subTaskGroups.entries()).map(([id, tasks]) => ({
      parentId: id,
      count: tasks.length,
      indices: tasks.map(t => t.subTaskIndex)
    })))
  } catch (error) {
    console.error('加载智能排单数据失败:', error)
  }
}

// 新增：调整重叠的任务位置
const adjustOverlappingTasks = () => {
  // 按日期分组任务
  const tasksByDay: Record<string, ExtendedScheduledTask[]> = {}

  scheduledTasks.value.forEach(task => {
    const extTask = task as ExtendedScheduledTask
    task.workDays.forEach(day => {
      if (!tasksByDay[day]) {
        tasksByDay[day] = []
      }
      tasksByDay[day].push(extTask)
    })
  })

  // 对每一天的任务进行垂直位置调整
  Object.entries(tasksByDay).forEach(([day, dayTasks]) => {
    // 按 startHour 排序
    dayTasks.sort((a, b) => (a.startHour ?? 9) - (b.startHour ?? 9))

    // 检测和解决重叠
    for (let i = 1; i < dayTasks.length; i++) {
      const prevTask = dayTasks[i - 1]
      const currTask = dayTasks[i]

      const prevEndHour = (prevTask.startHour ?? 9) + (prevTask.totalHours / prevTask.workDays.length)
      const currStartHour = currTask.startHour ?? 9

      // 如果当前任务与前一个任务重叠
      if (currStartHour < prevEndHour) {
        // 调整当前任务的开始时间
        currTask.startHour = Math.min(prevEndHour + 0.5, 20) // 留0.5小时间隔，最晚20点
      }
    }
  })
}

const saveSchedulerConfig = async () => {
  try {
    // 如果有未保存的修改，先保存任务修改
    if (hasUnsavedChanges.value) {
      console.log('[Timeline] 保存排单修改...')

      // 遍历所有修改过的任务，更新对应的服务工时
      for (const task of scheduledTasks.value) {
        const commission = getCommissionById(task.commissionId)
        if (commission && commission.serviceID) {
          // 检查工时是否变化
          const originalTask = modifiedTasksBackup.value.find(t => t.commissionId === task.commissionId)
          if (originalTask && originalTask.totalHours !== task.totalHours) {
            await window.api.db.updateVGenServiceWorkHours(
              commission.serviceID,
              task.totalHours
            )
            console.log(`[Timeline] 更新服务 ${commission.serviceID} 工时: ${task.totalHours}h`)
          }
        }
      }

      // 保存排单任务到数据库
      await saveScheduledTasks()

      // 清除修改标记
      hasUnsavedChanges.value = false
      modifiedTasksBackup.value = []
      interactingTask.value = null
    }

    // 保存配置
    // 清理配置对象，移除 Vue 的响应式 Proxy
    const cleanConfig = {
      workHoursPerDay: schedulerConfig.value.workHoursPerDay ?
        JSON.parse(JSON.stringify(schedulerConfig.value.workHoursPerDay)) : {},
      restDays: Array.isArray(schedulerConfig.value.restDays) ?
        [...schedulerConfig.value.restDays] : [],
      defaultWorkHours: Number(schedulerConfig.value.defaultWorkHours),
      weekendRest: Boolean(schedulerConfig.value.weekendRest)
    }

    console.log('[Timeline] 保存配置:', cleanConfig)
    await window.api.scheduler.saveConfig(cleanConfig)

    // 使用对话框显示成功消息
    dialog.success({
      title: '保存成功',
      content: '排单配置已成功保存',
      positiveText: '确定'
    })
  } catch (error: any) {
    console.error('[Timeline] 保存配置失败:', error)
    dialog.error({
      title: '保存失败',
      content: `保存配置时发生错误: ${error.message}`,
      positiveText: '确定'
    })
    throw error // 重新抛出错误，让路由守卫能够捕获
  }
}

const saveScheduledTasks = async () => {
  try {
    console.log('[Timeline] 保存排单任务...', scheduledTasks.value)

    // 🔍 DEBUG: 保存前验证数据
    const subTasksCount = scheduledTasks.value.filter(t => t.parentTaskId).length
    console.log('🔍 [Timeline] 保存前数据验证:', {
      总任务数: scheduledTasks.value.length,
      子任务数: subTasksCount,
      子任务详情: scheduledTasks.value
        .filter(t => t.parentTaskId)
        .map(t => ({
          taskId: t.taskId,
          parentTaskId: t.parentTaskId,
          subTaskIndex: t.subTaskIndex,
          subTaskCount: t.subTaskCount,
          startHour: (t as ExtendedScheduledTask).startHour
        }))
    })

    // 确保数据是可序列化的 - 深度克隆并保留所有重要属性
    const cleanTasks = scheduledTasks.value.map(task => {
      const extTask = task as ExtendedScheduledTask
      return {
        commissionId: task.commissionId,
        startDate: task.startDate,
        endDate: task.endDate,
        workDays: Array.isArray(task.workDays) ? [...task.workDays] : [],
        hoursPerDay: task.hoursPerDay ? { ...task.hoursPerDay } : {},
        totalHours: task.totalHours,
        isLocked: task.isLocked,
        priorityScore: task.priorityScore,
        // 保存子任务相关信息
        parentTaskId: task.parentTaskId,
        subTaskIndex: task.subTaskIndex,
        subTaskCount: task.subTaskCount,
        taskId: task.taskId,
        // 保存垂直位置信息
        startHour: extTask.startHour
      }
    })

    console.log('[Timeline] 清理后的任务:', cleanTasks)

    // 🔍 DEBUG: 清理后验证数据
    const cleanedSubTasksCount = cleanTasks.filter(t => t.parentTaskId).length
    console.log('🔍 [Timeline] 清理后数据验证:', {
      总任务数: cleanTasks.length,
      子任务数: cleanedSubTasksCount,
      清理后子任务详情: cleanTasks
        .filter(t => t.parentTaskId)
        .map(t => ({
          taskId: t.taskId,
          parentTaskId: t.parentTaskId,
          subTaskIndex: t.subTaskIndex,
          subTaskCount: t.subTaskCount,
          startHour: t.startHour
        }))
    })

    const result = await window.api.scheduler.saveScheduledTasks(cleanTasks)
    console.log('[Timeline] 保存结果:', result)
    if (!result) {
      throw new Error('保存失败')
    }
  } catch (error: any) {
    console.error('[Timeline] 保存排单失败:', error)
    message.error(`保存排单失败: ${error.message}`)
    throw error
  }
}

const runScheduling = async () => {
  if (vgenCommissions.value.length === 0) {
    message.warning('没有可排单的 Commissions')
    return
  }

  isScheduling.value = true

  try {
    // 加载工时配置
    let workHoursConfig = null
    try {
      workHoursConfig = await window.api.db.getWorkHoursConfig()
      console.log('[Timeline] 加载工时配置:', workHoursConfig)
    } catch (error) {
      console.error('[Timeline] 加载工时配置失败:', error)
    }

    // 运行排单算法（包含优先级配置）
    const result = scheduleCommissions(
      vgenCommissions.value,
      schedulerConfig.value,
      {
        startFrom: getTodayString(),
        priorityWeights: {
          dueDate: 0.4,
          status: 0.3,
          payment: 0.1,
          manual: 0.2 // 启用手动优先级权重
        }
      },
      workHoursConfig,
      priorityConfig.value, // 传递优先级配置
      vgenServices.value, // 传递服务列表
      scheduledTasks.value // 传递现有的排单任务，保留锁定和完成状态的任务
    )

    // 确保结果是纯 JSON 对象（移除任何无法序列化的属性）
    const serializedResult = JSON.parse(JSON.stringify(result))
    scheduledTasks.value = serializedResult
    await saveScheduledTasks()

    message.success(`排单完成！共排 ${result.length} 个任务`)
  } catch (error: any) {
    console.error('[Timeline] 排单失败:', error)
    message.error(`排单失败: ${error.message}`)
  } finally {
    isScheduling.value = false
  }
}

// 保存优先级配置
const handleSavePriorityConfig = async (config: PriorityConfig) => {
  try {
    await window.api.scheduler.savePriorityConfig(config)
    priorityConfig.value = config
    message.success('优先级设置已保存')
    console.log('✅ 保存优先级配置:', config)
  } catch (error: any) {
    console.error('保存优先级配置失败:', error)
    message.error(`保存失败: ${error.message}`)
  }
}

// 更新 Commissions 数据
const updateCommissions = async () => {
  console.log('[Timeline] 点击了更新按钮')
  updating.value = true
  updateProgress.value = 0
  updateMessage.value = '开始更新...'

  try {
    console.log('[Timeline] 调用 window.api.vgen.updateCommissions()')
    const result = await window.api.vgen.updateCommissions()
    console.log('[Timeline] 收到更新结果:', result)

    if (result.success) {
      message.success(`更新成功！获取了 ${result.count} 个 commissions`)

      // 重新加载数据
      console.log('[Timeline] 重新加载数据...')
      const commissions = await window.api.db.getVGenCommissions()
      vgenCommissions.value = commissions
      vgenDataLoaded.value = true
      console.log('[Timeline] 加载了', commissions.length, '个 commissions')
    } else {
      console.error('[Timeline] 更新失败:', result.error)
      message.error(`更新失败: ${result.error || '未知错误'}`)
    }
  } catch (error: any) {
    console.error('[Timeline] 捕获错误:', error)
    message.error(`更新失败: ${error.message}`)
  } finally {
    updating.value = false
    console.log('[Timeline] 更新流程结束')
  }
}

onMounted(async () => {
  store.init()

  // 初始化高度
  const viewportHeight = window.innerHeight
  timelineHeight.value = Math.floor(viewportHeight * 0.6) // 60% 给 Timeline
  todoHeight.value = Math.floor(viewportHeight * 0.3) // 30% 给 TodoList

  // 加载 VGen Commissions 数据
  try {
    const commissions = await window.api.db.getVGenCommissions()
    vgenCommissions.value = commissions
    vgenDataLoaded.value = true
    console.log(`✅ 加载了 ${commissions.length} 个 VGen commissions`)
  } catch (error) {
    console.error('加载 VGen commissions 失败:', error)
  }

  // 加载 VGen Services 数据
  try {
    const services = await window.api.db.getVGenServices()
    vgenServices.value = services
    console.log(`✅ 加载了 ${services.length} 个 VGen services`)
  } catch (error) {
    console.error('加载 VGen services 失败:', error)
  }

  // 加载智能排单数据
  await loadSchedulerData()

  // 加载优先级配置
  try {
    const config = await window.api.scheduler.getPriorityConfig()
    if (config) {
      priorityConfig.value = config
      console.log('✅ 加载优先级配置:', config)
    }
  } catch (error) {
    console.error('加载优先级配置失败:', error)
  }

  // 监听更新进度
  window.api.vgen.onUpdateProgress((progress) => {
    updateProgress.value = progress.progress
    updateMessage.value = progress.message
  })

  // 等待DOM渲染完成后添加滚轮事件监听
  await nextTick()

  // 为排单页面添加滚轮缩放监听
  const schedulerCalendar = document.querySelector('.scheduler-calendar-view')
  if (schedulerCalendar) {
    schedulerCalendar.addEventListener('wheel', handleSchedulerWheel as any, { passive: false })
  }

  // 为原始数据页面添加滚轮缩放监听
  const rawDataCalendar = document.querySelector('.calendar-view:not(.scheduler-calendar-view)')
  if (rawDataCalendar) {
    rawDataCalendar.addEventListener('wheel', handleWheel as any, { passive: false })
  }

  // 自动滚动到今日位置（排单页面）
  if (activeTab.value === 'scheduler' && schedulerViewMode.value === 'month') {
    // 延迟执行，确保DOM完全渲染
    setTimeout(() => {
      console.log('[Timeline] 初始加载时尝试自动滚动到今日')
      scrollToToday()
    }, 800) // 增加延迟时间，确保DOM和布局都已完成
  }
})

onBeforeUnmount(() => {
  window.api.vgen.removeUpdateProgressListener()

  // 移除排单页面的滚轮监听
  const schedulerCalendar = document.querySelector('.scheduler-calendar-view')
  if (schedulerCalendar) {
    schedulerCalendar.removeEventListener('wheel', handleSchedulerWheel as any)
  }

  // 移除原始数据页面的滚轮监听
  const rawDataCalendar = document.querySelector('.calendar-view:not(.scheduler-calendar-view)')
  if (rawDataCalendar) {
    rawDataCalendar.removeEventListener('wheel', handleWheel as any)
  }

  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
})
</script>

<style scoped>
.timeline-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
  color: #e0e0e0;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid #2a2a2a;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-tabs {
  border-bottom: 1px solid #2a2a2a;
  padding: 0 24px 0 24px;
}

.timeline-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  border-bottom: 1px solid #2a2a2a;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-month {
  font-size: 16px;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.current-month:hover {
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
}

.month-input {
  font-size: 16px;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
  padding: 4px 12px;
  background: #1e1e1e;
  border: 2px solid #8B5CF6;
  border-radius: 6px;
  color: #e0e0e0;
  outline: none;
  transition: all 0.2s;
}

.month-input:focus {
  background: #252525;
  border-color: #A78BFA;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-text {
  font-size: 13px;
  color: #888;
  padding: 0 4px;
  white-space: nowrap;
}

.calendar-view {
  position: relative;
  padding: 24px;
  overflow-x: auto; /* 横向滚动 */
  overflow-y: auto; /* 纵向滚动 */
  flex: 1;
}

/* 排单页面的 calendar-view 使用 flex 布局填充剩余空间 */
.scheduler-calendar-view {
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 默认隐藏溢出 */
  flex: 1;
  padding: 8px !important; /* 缩小排单表格与边栏的距离 */
}

/* 按月模式下开启横向滚动 */
.scheduler-calendar-view:not(.week-view-mode) {
  overflow-x: auto; /* 开启横向滚动 */
  overflow-y: hidden; /* 禁用纵向滚动 */
}

/* 添加自定义滚动条样式 */
.calendar-view::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.calendar-view::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 4px;
}

.calendar-view::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.calendar-view::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.calendar-header {
  display: flex;
  margin-bottom: 16px;
  align-items: center;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  padding-left: 8px;
}

.calendar-timeline {
  position: relative;
  user-select: none;
  width: max-content; /* 让容器随内容撑开 */
  min-width: 100%;
}

/* 排单页面的 calendar-timeline 填充剩余高度 */
.scheduler-calendar-timeline {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: auto; /* 横向滚动 */
  overflow-y: hidden; /* 不需要纵向滚动 */
  min-height: 0; /* 允许 flex 收缩 */
  position: relative; /* 为内部绝对定位提供参考 */
}

/* 按周模式下不需要横向滚动 - 使用类名而不是:has() */
.scheduler-calendar-timeline.week-view-mode {
  overflow-x: hidden;
}

/* 自定义排单页面的滚动条 */
.scheduler-calendar-timeline::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scheduler-calendar-timeline::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 5px;
}

.scheduler-calendar-timeline::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 5px;
}

.scheduler-calendar-timeline::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.timeline-days {
  display: flex;
  /* 移除 gap，改用 border 避免定位偏差 */
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0; /* 日期头部不收缩 */
}

/* 按月模式：让内容撑开 */
.scheduler-calendar-timeline:not(.week-view-mode) .timeline-days {
  width: max-content; /* 按月模式时让内容撑开 */
  min-width: 100%; /* 确保至少填充整个宽度 */
}

/* 按周模式：日期头部填充整个宽度 */
.scheduler-calendar-timeline.week-view-mode .timeline-days {
  width: 100%;
  min-width: 100%; /* 确保不会超出 */
  max-width: 100%; /* 防止溢出 */
}

.timeline-day {
  /* 使用固定宽度，不再使用 flex: 1 */
  flex-shrink: 0;
  height: 50px; /* 减小高度 */
  min-height: 50px;
  background: #1a1a1a;
  padding: 6px 4px;
  transition: background 0.2s;
  border-right: 1px solid #2a2a2a; /* 使用边框分隔 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 按周模式：每天自适应宽度 */
.scheduler-calendar-timeline.week-view-mode .timeline-day {
  flex: 1 1 0%; /* 均匀分配剩余空间，基础值为0 */
  min-width: 0; /* 允许收缩到小于内容宽度 */
  max-width: none; /* 移除最大宽度限制 */
}

.timeline-day:last-child {
  border-right: none;
}

.timeline-day.is-today {
  background: #2a2a4a;
  border: 2px solid #8B5CF6;
}

.timeline-day.is-weekend {
  background: #0f0f0f;
}

.timeline-day:hover {
  background: #252525;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.day-weekday {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.day-number {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.timeline-day.is-today .day-weekday {
  color: #8B5CF6;
}

.timeline-day.is-today .day-number {
  color: #8B5CF6;
}

.tasks-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.task-bar {
  position: absolute;
  height: 56px;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  pointer-events: all;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 12px;
  color: white;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3a3a4a 0%, #2a2a3a 100%);
}

.task-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);
}

.task-bar:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.task-bar-readonly {
  cursor: pointer;
}

.task-bar-readonly:hover {
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.task-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-bar:hover .task-resize-handle {
  opacity: 1;
}

.task-resize-left {
  left: 0;
  background: linear-gradient(to right, rgba(255,255,255,0.3), transparent);
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.task-resize-right {
  right: 0;
  background: linear-gradient(to left, rgba(255,255,255,0.3), transparent);
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.task-bar-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  pointer-events: none;
}

/* 支付状态标签（Timeline 中） */
.payment-badge-timeline {
  position: absolute;
  top: -2px;
  left: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-badge-timeline.paid {
  background: rgba(16, 185, 129, 0.25);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.payment-badge-timeline.unpaid {
  background: rgba(245, 158, 11, 0.25);
  color: #F59E0B;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.task-bar-info {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-bar-client {
  font-size: 12px;
  font-weight: 700;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-bar-project {
  font-size: 10px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background 0.2s;
  z-index: 20;
}

.task-bar:hover .task-delete-btn {
  display: flex;
}

.task-delete-btn:hover {
  background: rgba(255, 0, 0, 0.8);
}

.tasks-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  align-content: start;
}

/* 可拖拽分隔条 */
.resizer {
  height: 8px;
  background: #1a1a1a;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.2s;
}

.resizer:hover {
  background: #2a2a2a;
}

.resizer-line {
  width: 40px;
  height: 3px;
  background: #444;
  border-radius: 2px;
}

.resizer:hover .resizer-line {
  background: #8B5CF6;
}

/* 今日待办 */
.today-todo-section {
  padding: 24px;
  padding-bottom: 40px;
  background: #111;
  overflow-y: auto;
  flex-shrink: 0;
}

/* 隐藏TodoList滚动条 */
.today-todo-section::-webkit-scrollbar {
  width: 6px;
}

.today-todo-section::-webkit-scrollbar-track {
  background: transparent;
}

.today-todo-section::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.today-todo-section::-webkit-scrollbar-thumb:hover {
  background: #444;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.todo-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #e0e0e0;
}

.todo-count {
  font-size: 14px;
  color: #888;
}

.empty-todos {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #1a1a1a;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #2a2a2a;
}

.todo-item:hover {
  background: #222;
  border-color: #8B5CF6;
  transform: translateX(4px);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
}

.todo-checkbox {
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.todo-checkbox:hover {
  transform: scale(1.1);
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-subtitle {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.todo-badge.new {
  background: rgba(91, 135, 255, 0.2);
  color: #5B87FF;
}

.todo-badge.ready {
  background: rgba(124, 180, 11, 0.2);
  color: #7CB40B;
}

.todo-badge.wip {
  background: rgba(98, 131, 214, 0.2);
  color: #6283D6;
}

.todo-badge.completed {
  background: rgba(84, 197, 183, 0.2);
  color: #54C5B7;
}

.todo-badge.waitlist {
  background: rgba(63, 148, 137, 0.2);
  color: #3F9489;
}

.todo-badge.pending {
  background: rgba(156, 163, 175, 0.2);
  color: #9CA3AF;
}

/* 筛选菜单 */
.filter-menu {
  min-width: 200px;
  padding: 8px 0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #2a2a2a;
  margin-bottom: 4px;
}

.filter-header span {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.filter-options {
  max-height: 300px;
  overflow-y: auto;
}

.filter-option {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.filter-option:hover {
  background: rgba(139, 92, 246, 0.1);
}

.filter-option:first-child {
  border-bottom: 1px solid #2a2a2a;
  margin-bottom: 4px;
  font-weight: 600;
}

/* 智能排单占位符 */
.empty-schedule {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: #666;
  padding: 60px 20px;
}

.empty-schedule h3 {
  font-size: 20px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 20px 0 8px;
}

.empty-schedule p {
  font-size: 14px;
  color: #888;
  margin: 0;
}

/* 排单时间线网格布局（在calendar-timeline内） */
.scheduler-timeline-grid {
  display: flex;
  position: relative;
  min-width: 100%; /* 至少填充整个宽度 */
  min-height: 0; /* 允许 flex 收缩 */
  height: 100%; /* 填充父容器高度 */
}

/* 按月模式：让内容撑开，支持横向滚动 */
.scheduler-calendar-timeline:not(.week-view-mode) .scheduler-timeline-grid {
  width: max-content; /* 让内容撑开，支持横向滚动 */
}

/* 按周模式：网格填充整个宽度 */
.scheduler-calendar-timeline.week-view-mode .scheduler-timeline-grid {
  width: 100%;
  max-width: 100%; /* 防止超出 */
}

/* 右侧日期和任务区域容器 */
.scheduler-calendar-content {
  flex: 1; /* 自动占据剩余空间（考虑了左侧80px时间标签） */
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-height: 0; /* 允许 flex 收缩 */
  min-width: 0; /* 允许 flex 收缩 */
}

/* 按月模式下，内容需要撑开以支持滚动 */
.scheduler-calendar-timeline:not(.week-view-mode) .scheduler-calendar-content {
  flex: none; /* 移除flex:1的约束，让内容自由撑开 */
  width: max-content; /* 按月模式时让内容撑开 */
}

/* 左侧时段标签列 */
.scheduler-time-labels {
  flex-shrink: 0;
  width: 80px;
  background: #1e1e1e;
  border-right: 2px solid #2a2a2a;
  display: flex;
  flex-direction: column;
  position: sticky; /* 固定定位 */
  left: 0; /* 贴在左侧 */
  z-index: 10; /* 确保在内容上方 */
}

/* 时段标签顶部占位，对齐日期头部 */
.time-label-header {
  height: 50px; /* 与 timeline-day 高度一致 */
  border-bottom: 1px solid #2a2a2a;
  background: #1e1e1e;
  flex-shrink: 0; /* 不收缩 */
}

.time-label-item {
  flex: 1; /* 自动分配剩余高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #2a2a2a;
  transition: background 0.2s;
  font-size: 10px;
  color: #666;
  min-height: 45px; /* 最小高度 */
}

.time-label-item:hover {
  background: #252525;
}

.time-text {
  font-weight: 600;
}

/* 任务网格容器 */
.scheduler-tasks-container {
  flex: 1; /* 填充剩余高度 */
  position: relative;
  min-height: 0; /* 允许 flex 收缩 */
  width: 100%; /* 填充父容器宽度 */
}

/* 网格背景 */
.scheduler-grid-background {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  width: 100%; /* 填充整个宽度 */
}

/* 按周模式下，网格背景不超出 */
.scheduler-calendar-timeline.week-view-mode .scheduler-grid-background {
  max-width: 100%; /* 防止溢出 */
}

/* 2小时时段块 */
.grid-time-block {
  flex: 1; /* 自动分配剩余高度 */
  display: flex;
  flex-direction: column;
  border-bottom: 2px solid #333;
  position: relative;
  min-height: 45px; /* 最小高度 */
}

/* grid-day-column在排单视图中的特殊样式 */
.scheduler-timeline-grid .grid-day-column {
  /* 使用固定宽度，不再使用 flex: 1 */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a2a2a;
  transition: background 0.2s;
}

/* 按周模式：每天自适应宽度 */
.scheduler-calendar-timeline.week-view-mode .grid-day-column {
  flex: 1 1 0%; /* 均匀分配剩余空间，基础值为0 */
  min-width: 0; /* 允许收缩到小于内容宽度 */
  max-width: none; /* 移除最大宽度限制 */
}

.scheduler-timeline-grid .grid-day-column:last-child {
  border-right: none;
}

.scheduler-timeline-grid .grid-day-column:hover {
  background: rgba(139, 92, 246, 0.03);
}

.scheduler-timeline-grid .grid-day-column.is-today {
  background: rgba(139, 92, 246, 0.05);
  border-left: 2px solid #8B5CF6;
  border-right: 2px solid #8B5CF6;
}

.scheduler-timeline-grid .grid-day-column.is-weekend {
  background: rgba(245, 158, 11, 0.02);
}

/* 排单任务卡片（在tasks-overlay内） */
.scheduled-task-card {
  position: absolute;
  /* background通过内联样式动态设置 */
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  padding: 8px 10px;
  cursor: grab;
  pointer-events: all;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin: 2px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 添加过渡动画 - 通过内联样式动态控制 */
  transform-origin: center center;
  will-change: transform, top, height;
}

/* 添加挤压动效 */
@keyframes squeeze {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95, 1.05);
  }
  100% {
    transform: scale(1);
  }
}

.scheduled-task-card.is-squeezed {
  animation: squeeze 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ✨ 小卡片悬停展开优化 */
/* 小卡片默认隐藏部分信息 */
.scheduled-task-card.is-small-card .task-card-subtitle {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.25s ease, max-height 0.25s ease;
  margin: 0;
}

.scheduled-task-card.is-small-card .task-card-meta {
  gap: 2px;
}

/* 小卡片悬停时：放大显示并展开所有信息 */
.scheduled-task-card.is-small-card:hover {
  transform: scale(1.2) !important; /* 放大到1.2倍 */
  z-index: 1000 !important; /* 确保在最上层 */
  box-shadow: 0 12px 40px rgba(139, 92, 246, 0.6) !important; /* 增强阴影 */
}

.scheduled-task-card.is-small-card:hover .task-card-subtitle {
  opacity: 1;
  max-height: 50px;
  margin-bottom: 4px;
}

/* 防止拖动和拉伸时触发悬停效果 */
.scheduled-task-card.is-small-card.is-dragging:hover,
.scheduled-task-card.is-small-card.is-resizing:hover {
  transform: scale(1) !important;
}

.scheduled-task-card.is-small-card.is-dragging:hover .task-card-subtitle {
  opacity: 0;
  max-height: 0;
}


/* 添加抖动警告动效 */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
}

/* 无效放置警告效果 */
.scheduled-task-card.is-invalid {
  border-color: #EF4444 !important;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%) !important;
  animation: shake 0.5s infinite;
  cursor: not-allowed !important;
}

.scheduled-task-card.is-invalid::before {
  background: linear-gradient(90deg, #EF4444 0%, #DC2626 100%) !important;
  height: 3px !important;
}

/* 边界溢出警告效果 */
.scheduled-task-card.is-warning {
  border-color: #F97316 !important;
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.5) !important;
  animation: shake 0.3s;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.05) 100%) !important;
}

.scheduled-task-card.is-warning::before {
  background: linear-gradient(90deg, #F97316 0%, #EA580C 100%) !important;
}

/* 合并目标高亮效果 */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
    border-color: #8B5CF6;
  }
  50% {
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.9);
    border-color: #A78BFA;
  }
}

.scheduled-task-card._isMergeTarget {
  animation: pulse-glow 1s ease-in-out infinite;
  border-width: 2px;
  border-style: dashed !important;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%) !important;
}

.scheduled-task-card._isMergeTarget::before {
  background: linear-gradient(90deg, #8B5CF6 0%, #A78BFA 100%) !important;
  height: 3px !important;
}

/* 准备合并状态（碰撞超过0.5秒）*/
@keyframes merge-ready-glow {
  0%, 100% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
    border-color: #10B981;
  }
  50% {
    box-shadow: 0 0 50px rgba(16, 185, 129, 1);
    border-color: #34D399;
  }
}

.scheduled-task-card._isMergeReady {
  animation: merge-ready-glow 0.6s ease-in-out infinite;
  border-width: 3px;
  border-style: solid !important;
  border-color: #10B981 !important;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.1) 100%) !important;
}

.scheduled-task-card._isMergeReady::before {
  background: linear-gradient(90deg, #10B981 0%, #34D399 100%) !important;
  height: 4px !important;
}

/* 子任务标记样式 */
.sub-task-indicator {
  position: absolute;
  top: 4px;
  left: 8px;
  background: rgba(139, 92, 246, 0.9);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 子任务卡片样式 */
.scheduled-task-card.is-sub-task {
  border-style: dashed;
  border-color: rgba(139, 92, 246, 0.4);
}

.scheduled-task-card.is-sub-task::after {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 8px;
  background: linear-gradient(135deg, transparent 30%, rgba(139, 92, 246, 0.05) 100%);
  pointer-events: none;
}

.scheduled-task-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);
}

.scheduled-task-card:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
  border-color: #8B5CF6;
  z-index: 10;
  cursor: grab;
}

/* 拖动状态 */
.scheduled-task-card.is-dragging {
  cursor: grabbing !important;
  opacity: 0.9;
  z-index: 100;
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.6);
  transform: scale(1.02);
}

/* 修改状态 */
.scheduled-task-card.is-modified {
  border-color: #F59E0B;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
}

.scheduled-task-card.is-modified::before {
  background: linear-gradient(90deg, #F59E0B 0%, #EF4444 100%);
}

/* 状态徽章 - 优雅设计 */
.task-status-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 20;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-status-badge svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

/* 普通状态徽章 */
.task-status-badge.status-normal {
  background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%);
  color: #F9FAFB;
  border: 2px solid #374151;
}

/* 锁定状态徽章 */
.task-status-badge.status-locked {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: #FFFBEB;
  border: 2px solid #B45309;
}

/* 完成状态徽章 */
.task-status-badge.status-completed {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: #ECFDF5;
  border: 2px solid #047857;
}

/* 悬停效果 */
.scheduled-task-card:hover .task-status-badge {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* 锁定状态卡片样式 - 虚线边框 */
.scheduled-task-card.is-locked {
  border: 2px dashed #F59E0B;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%);
  cursor: not-allowed;
}

.scheduled-task-card.is-locked::before {
  background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
  height: 3px;
}

/* 完成状态卡片样式 - 点状边框 */
.scheduled-task-card.is-completed {
  border: 2px dotted #10B981;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
  opacity: 0.85;
}

.scheduled-task-card.is-completed::before {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
  height: 3px;
}

/* 普通状态卡片 - 细实线边框 */
.scheduled-task-card:not(.is-locked):not(.is-completed) {
  border: 1px solid #2a2a2a;
}

/* 卡片拉伸手柄 */
.card-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 12px; /* 增加高度，更容易拖动 */
  cursor: ns-resize;
  z-index: 20;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent; /* 初始透明 */
}

.card-resize-handle:hover {
  opacity: 1;
  background: linear-gradient(to bottom, rgba(139, 92, 246, 0.6), transparent);
}

.scheduled-task-card:hover .card-resize-handle {
  opacity: 0.6;
}

.scheduled-task-card:hover .card-resize-handle:hover {
  opacity: 1;
}

/* ✨ 拖拽时禁用拉伸手柄 */
.scheduled-task-card.is-dragging .card-resize-handle {
  opacity: 0 !important;
  pointer-events: none;
  cursor: not-allowed;
}

.card-resize-top {
  top: -2px; /* 略微超出边界，更容易抓取 */
  background: linear-gradient(to bottom, rgba(139, 92, 246, 0.6), transparent);
  cursor: n-resize;
}

.card-resize-bottom {
  bottom: -2px; /* 略微超出边界，更容易抓取 */
  background: linear-gradient(to top, rgba(139, 92, 246, 0.6), transparent);
  cursor: s-resize;
}

.resize-indicator {
  width: 32px; /* 增加宽度 */
  height: 4px; /* 增加高度 */
  background: #8B5CF6;
  border-radius: 2px;
  opacity: 0.8;
  transition: all 0.2s;
}

.card-resize-handle:hover .resize-indicator {
  background: #A78BFA;
  opacity: 1;
  transform: scaleX(1.2);
}

.task-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 2px;
}

.task-card-title {
  font-size: 14px; /* 从12px增加到14px */
  font-weight: 700;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  line-height: 1.3;
}

.task-card-subtitle {
  font-size: 12px; /* 从10px增加到12px */
  color: #ddd; /* 从#999增加到#ddd提高可读性 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  line-height: 1.3;
}

/* ✨ 任务元信息（使用Tag显示） */
.task-card-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

/* ✨ Tag样式优化 */
.task-meta-tag {
  font-size: 10px !important;
  padding: 2px 6px !important;
  font-weight: 600 !important;
  opacity: 0.95;
  transition: opacity 0.2s;
}

.task-meta-tag:hover {
  opacity: 1;
}

/* 排单卡片详情对话框样式 */
.scheduled-task-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.detail-info {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #888;
  font-weight: 500;
}

.info-value {
  color: #e0e0e0;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 原始数据详情对话框样式 */
.raw-data-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a2a2a;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item-value {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 600;
}

.price-value {
  color: #54C5B7;
  font-size: 18px;
}

.notes-content {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  color: #e0e0e0;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 图标旋转动画 */
@keyframes icon-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.icon-spin {
  animation: icon-spin 1s linear infinite;
}

/* 工具提示样式 */
.task-tooltip-content {
  padding: 0;
  font-size: 13px;
  max-width: 300px;
}

.tooltip-row {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  color: #e0e0e0;
  line-height: 1.4;
}

.tooltip-row strong {
  color: #aaa;
  font-weight: 600;
  min-width: 70px;
  flex-shrink: 0;
}

.tooltip-row:first-child {
  padding-top: 0;
}

.tooltip-row:last-child {
  padding-bottom: 0;
}

.tooltip-divider {
  height: 1px;
  background: #2a2a2a;
  margin: 8px 0;
}
</style>

