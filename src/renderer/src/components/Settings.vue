<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="应用设置"
    size="medium"
    :bordered="false"
    :closable="true"
    :mask-closable="true"
    style="width: 600px; max-width: 90vw"
    @after-leave="handleClose"
  >
    <n-form :model="formData" label-placement="left" label-width="180">
      <n-divider title-placement="left">
        <n-text strong>自动更新设置</n-text>
      </n-divider>

      <!-- Timeline 自动更新 -->
      <n-form-item label="Timeline 页面自动更新">
        <n-space vertical style="width: 100%">
          <n-switch v-model:value="formData.autoUpdate.timeline.enabled">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
          <n-input-number
            v-model:value="formData.autoUpdate.timeline.interval"
            :min="1"
            :max="1440"
            :disabled="!formData.autoUpdate.timeline.enabled"
            style="width: 100%"
          >
            <template #suffix>分钟</template>
          </n-input-number>
          <n-text depth="3" style="font-size: 12px">
            启用后，Timeline 页面将每隔指定时间自动更新数据
          </n-text>
        </n-space>
      </n-form-item>

      <!-- Commissions 自动更新 -->
      <n-form-item label="Commissions 页面自动更新">
        <n-space vertical style="width: 100%">
          <n-switch v-model:value="formData.autoUpdate.commissions.enabled">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
          <n-input-number
            v-model:value="formData.autoUpdate.commissions.interval"
            :min="1"
            :max="1440"
            :disabled="!formData.autoUpdate.commissions.enabled"
            style="width: 100%"
          >
            <template #suffix>分钟</template>
          </n-input-number>
          <n-text depth="3" style="font-size: 12px">
            启用后，Commissions 页面将每隔指定时间自动更新数据
          </n-text>
        </n-space>
      </n-form-item>

      <n-divider title-placement="left">
        <n-text strong>智能排单设置</n-text>
      </n-divider>

      <!-- 排单锁定天数 -->
      <n-form-item label="锁定近期排单">
        <n-space vertical style="width: 100%">
          <n-input-number
            v-model:value="formData.scheduler.lockDays"
            :min="0"
            :max="365"
            style="width: 100%"
          >
            <template #suffix>天</template>
          </n-input-number>
          <n-text depth="3" style="font-size: 12px">
            设置为 N 天后，智能排单将只影响 N 天之后的订单，近期排单将被锁定不变。设置为 0
            表示不锁定。
          </n-text>
        </n-space>
      </n-form-item>

      <n-divider title-placement="left">
        <n-text strong>数据管理</n-text>
      </n-divider>

      <!-- 重置数据库 -->
      <n-form-item label="重置数据库">
        <n-space vertical style="width: 100%">
          <n-button type="error" ghost @click="handleResetDatabase" :loading="resetting">
            重置为空数据库
          </n-button>
          <n-text depth="3" style="font-size: 12px">
            ⚠️ 危险操作！将清空所有数据（Commissions、Services、排单记录等），但保留数据库结构。此操作不可撤销！
          </n-text>
        </n-space>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSave" :loading="saving">保存设置</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NSwitch,
  NInputNumber,
  NButton,
  NSpace,
  NDivider,
  NText,
  useMessage,
  useDialog
} from 'naive-ui'
import type { AppSettings } from '../../../main/db'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const message = useMessage()
const dialog = useDialog()
const visible = ref(props.show)
const saving = ref(false)
const resetting = ref(false)

// 表单数据
const formData = ref<AppSettings>({
  autoUpdate: {
    timeline: {
      enabled: false,
      interval: 60
    },
    commissions: {
      enabled: false,
      interval: 60
    }
  },
  scheduler: {
    lockDays: 0
  }
})

// 监听 props 变化
watch(
  () => props.show,
  async (newVal) => {
    visible.value = newVal
    if (newVal) {
      await loadSettings()
    }
  }
)

// 监听 visible 变化，同步到父组件
watch(visible, (newVal) => {
  emit('update:show', newVal)
})

// 加载设置
const loadSettings = async () => {
  try {
    const settings = await window.electron.ipcRenderer.invoke('db:getAppSettings')
    if (settings) {
      formData.value = JSON.parse(JSON.stringify(settings))
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    message.error('加载设置失败')
  }
}

// 保存设置
const handleSave = async () => {
  saving.value = true
  try {
    // 将响应式对象转换为普通对象（避免 IPC 序列化错误）
    const plainSettings = JSON.parse(JSON.stringify(formData.value))
    await window.electron.ipcRenderer.invoke('db:saveAppSettings', plainSettings)
    message.success('设置已保存')
    visible.value = false
  } catch (error) {
    console.error('Failed to save settings:', error)
    message.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
}

// 关闭回调
const handleClose = () => {
  emit('update:show', false)
}

// 重置数据库
const handleResetDatabase = () => {
  dialog.warning({
    title: '确认重置数据库',
    content: '此操作将清空所有数据（包括 Commissions、Services、排单记录、退款记录等），但会保留数据库结构和应用设置。此操作不可撤销，确定要继续吗？',
    positiveText: '确定重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      resetting.value = true
      try {
        await window.electron.ipcRenderer.invoke('db:resetDatabase')
        message.success('数据库已重置为空状态')

        // 刷新页面以重新加载空数据
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('Failed to reset database:', error)
        message.error('重置数据库失败')
      } finally {
        resetting.value = false
      }
    }
  })
}
</script>

<style scoped>
:deep(.n-divider__title) {
  color: var(--n-text-color);
}

:deep(.n-form-item-label) {
  color: var(--n-text-color);
}
</style>
