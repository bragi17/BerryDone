<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NConfigProvider, darkTheme, NMessageProvider } from 'naive-ui'
import ControlPanel from './components/widget/ControlPanel.vue'
import StandaloneWidget from './components/widget/StandaloneWidget.vue'

// 获取窗口类型
const widgetType = ref<string>('')

onMounted(() => {
  // 从 URL hash 获取窗口类型
  const hash = window.location.hash.replace('#', '')
  widgetType.value = hash || 'control'
  console.log('Widget type:', widgetType.value)
})
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <div class="widget-app">
        <!-- 控制面板 -->
        <ControlPanel v-if="widgetType === 'control'" />

        <!-- 其他独立组件 -->
        <StandaloneWidget v-else :type="widgetType" />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.widget-app {
  width: 100vw;
  height: 100vh;
  background: transparent;
  overflow: hidden;
}
</style>
