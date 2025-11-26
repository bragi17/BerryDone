<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <n-dropdown :options="workspaceOptions" trigger="click" class="workspace-selector">
        <div class="workspace-name">
          <span class="workspace-icon">🍓</span>
          <span>BerryDone</span>
          <n-icon :component="ChevronDown" size="16" />
        </div>
      </n-dropdown>
      <div class="settings-icon-wrapper">
        <n-icon :component="SettingsOutline" :size="20" class="settings-icon" />
      </div>
    </div>

    <div class="search-box">
      <n-input placeholder="搜索..." size="small">
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
    </div>

    <div class="sidebar-menu">
      <div class="menu-item" :class="{ active: isActive('/home') }" @click="navigateTo('/home')">
        <n-icon :component="CalendarOutline" />
        <span>Home</span>
      </div>
      <div class="menu-item" :class="{ active: isActive('/timeline') }" @click="navigateTo('/timeline')">
        <n-icon :component="TimeOutline" />
        <span>Timeline</span>
      </div>
      <div class="menu-item" :class="{ active: isActive('/dashboard') }" @click="navigateTo('/dashboard')">
        <n-icon :component="StatsChartOutline" />
        <span>Dashboard</span>
      </div>
      <div class="menu-item" :class="{ active: isActive('/commissions') }" @click="navigateTo('/commissions')">
        <n-icon :component="BriefcaseOutline" />
        <span>Commissions</span>
      </div>
    </div>

    <!-- 移除项目选择器 - 直接显示所有 commissions -->

    <div class="sidebar-footer">
      <div class="footer-item">
        <n-icon :component="HelpCircleOutline" />
        <span>帮助</span>
      </div>
      <div class="footer-version">v1.0.0</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { 
  NIcon, 
  NInput, 
  NDropdown 
} from 'naive-ui'
import {
  SearchOutline,
  SettingsOutline,
  HelpCircleOutline,
  ChevronDown,
  CalendarOutline,
  TimeOutline,
  StatsChartOutline,
  BriefcaseOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

const navigateTo = (path: string) => {
  router.push(path)
}

const isActive = (path: string) => {
  return route.path === path
}

const workspaceOptions = [
  { label: 'BerryDone Workspace', key: 'berrydone' }
]
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.workspace-selector {
  display: flex;
  flex: 1;
}

.workspace-name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.workspace-name:hover {
  background: #2a2a2a;
}

.workspace-icon {
  font-size: 20px;
}

.settings-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.settings-icon-wrapper:hover {
  background: #2a2a2a;
}

.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.search-box {
  margin-bottom: 16px;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #2a2a2a;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.menu-item:hover {
  background: #2a2a2a;
}

.menu-item.active {
  background: #8B5CF6;
  color: white;
}

.sidebar-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  cursor: pointer;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-project-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #888;
  transition: all 0.2s;
}

.add-project-btn:hover {
  background: #2a2a2a;
  color: #e0e0e0;
}

.project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.project-item:hover {
  background: #2a2a2a;
}

.project-item.active {
  background: #8B5CF6;
  color: white;
}

.project-icon {
  font-size: 16px;
}

.project-name {
  flex: 1;
}

.project-count {
  font-size: 12px;
  color: #888;
  background: #2a2a2a;
  padding: 2px 8px;
  border-radius: 12px;
}

.project-item.active .project-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.sidebar-footer {
  margin-top: auto;
  padding: 8px 0;
  border-top: 1px solid #2a2a2a;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.footer-item:hover {
  background: #2a2a2a;
}

.footer-version {
  padding: 4px 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>

