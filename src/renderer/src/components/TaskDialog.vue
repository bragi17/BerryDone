<template>
  <n-modal v-model:show="visible" preset="card" title="创建任务" style="width: 600px;">
    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-form-item label="任务标题" path="title">
        <n-input v-model:value="formData.title" placeholder="输入任务标题" />
      </n-form-item>
      
      <!-- 移除项目选择，所有任务都属于 vgen -->
      
      <n-form-item label="开始日期" path="startDate">
        <n-date-picker 
          v-model:value="startDateValue" 
          type="date"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="截止日期" path="endDate">
        <n-date-picker 
          v-model:value="endDateValue" 
          type="date"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="状态" path="status">
        <n-select 
          v-model:value="formData.status" 
          :options="statusOptions"
        />
      </n-form-item>
      
      <n-form-item label="进度" path="progress">
        <n-slider v-model:value="formData.progress" :step="5" :marks="{ 0: '0%', 50: '50%', 100: '100%' }" />
      </n-form-item>
      
      <n-form-item label="颜色预览" path="color">
        <div class="color-preview">
          <div 
            class="preview-box"
            :style="getColorPreviewStyle()"
          >
            <span>{{ taskStatusConfig[formData.status].label }}</span>
          </div>
          <span class="preview-hint">颜色由状态自动决定</span>
        </div>
      </n-form-item>
    </n-form>
    
    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSubmit">
          {{ isEdit ? '更新' : '创建' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDatePicker,
  NSlider,
  NButton,
  NSpace,
  FormInst
} from 'naive-ui'
import { useStore, Task, TaskStatus, taskStatusConfig } from '../store'
import { dateStringToTimestamp, timestampToDateString } from '../utils/dateUtils'

interface Props {
  show: boolean
  task?: Task | null
}

const props = withDefaults(defineProps<Props>(), {
  task: null
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [task: Omit<Task, 'id'> | Task]
}>()

const store = useStore()
const { projects } = store

const formRef = ref<FormInst | null>(null)
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const isEdit = computed(() => !!props.task)

const formData = ref({
  title: '',
  projectId: '',
  startDate: '',
  endDate: '',
  status: 'new' as TaskStatus,
  progress: 0,
  color: '',
  members: []
})

const startDateValue = computed({
  get: () => dateStringToTimestamp(formData.value.startDate),
  set: (val) => {
    formData.value.startDate = val ? timestampToDateString(val) : ''
  }
})

const endDateValue = computed({
  get: () => dateStringToTimestamp(formData.value.endDate),
  set: (val) => {
    formData.value.endDate = val ? timestampToDateString(val) : ''
  }
})

const projectOptions = computed(() => 
  projects.value.map(p => ({ label: p.name, value: p.id }))
)

const statusOptions = computed(() => 
  Object.entries(taskStatusConfig).map(([value, config]) => ({
    label: config.label,
    value: value as TaskStatus
  }))
)

// 获取颜色预览样式
const getColorPreviewStyle = () => {
  // 状态兼容映射：将旧状态映射到新状态
  const statusMap: Record<string, TaskStatus> = {
    'pending': 'pending',
    'in-progress': 'wip',
    'completed': 'completed',
  }
  
  // 获取实际状态
  let actualStatus = formData.value.status as string
  if (statusMap[actualStatus]) {
    actualStatus = statusMap[actualStatus]
  }
  
  // 获取状态配置，如果不存在则使用默认值
  const statusConfig = taskStatusConfig[actualStatus as TaskStatus] || taskStatusConfig.new
  
  const style: any = {
    color: statusConfig.textColor || '#FFFFFF'
  }
  
  if (statusConfig.gradient) {
    style.background = statusConfig.gradient
  } else {
    style.backgroundColor = statusConfig.color
  }
  
  return style
}

const rules = {
  title: { required: true, message: '请输入任务标题', trigger: 'blur' },
  startDate: { required: true, message: '请选择开始日期', trigger: 'change' },
  endDate: { required: true, message: '请选择截止日期', trigger: 'change' }
}

// 定义 resetForm 函数（必须在 watch 之前）
const resetForm = () => {
  formData.value = {
    title: '',
    projectId: 'vgen', // 所有任务都属于 vgen
    startDate: '',
    endDate: '',
    status: 'new',
    progress: 0,
    color: '',
    members: []
  }
}

// 监听 task 变化
watch(() => props.task, (task) => {
  if (task) {
    // 状态兼容映射：将旧状态映射到新状态
    const statusMap: Record<string, TaskStatus> = {
      'pending': 'pending',
      'in-progress': 'wip',
      'completed': 'completed',
    }
    
    let actualStatus = task.status as string
    if (statusMap[actualStatus]) {
      actualStatus = statusMap[actualStatus]
    }
    
    formData.value = {
      title: task.title,
      projectId: task.projectId,
      startDate: task.startDate,
      endDate: task.endDate,
      status: actualStatus as TaskStatus,
      progress: task.progress,
      color: task.color,
      members: []
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleCancel = () => {
  visible.value = false
  resetForm()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    // 根据状态自动设置颜色
    const statusConfig = taskStatusConfig[formData.value.status]
    
    // 创建纯对象，避免响应式代理
    const taskData = {
      title: formData.value.title,
      projectId: formData.value.projectId,
      startDate: formData.value.startDate,
      endDate: formData.value.endDate,
      status: formData.value.status,
      progress: formData.value.progress,
      color: statusConfig.color,
      members: [...formData.value.members]
    }
    
    if (isEdit.value && props.task) {
      emit('submit', {
        id: props.task.id,
        ...taskData
      })
    } else {
      emit('submit', taskData)
    }
    
    visible.value = false
    resetForm()
  } catch (error) {
    console.error('Validation failed:', error)
  }
}
</script>

<style scoped>
.color-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-box {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  min-width: 120px;
  display: inline-block;
}

.preview-hint {
  font-size: 12px;
  color: #888;
}
</style>

