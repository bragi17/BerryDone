<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider, darkTheme, NMessageProvider, NDialogProvider } from 'naive-ui'
import Sidebar from './components/Sidebar.vue'
import { useStore } from './store'

const store = useStore()

onMounted(() => {
  store.init()
})
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-container">
          <Sidebar />
          <div class="main-content">
            <router-view />
          </div>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
