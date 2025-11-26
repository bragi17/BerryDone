import { ipcRenderer } from 'electron'
import type { SchedulerState, SchedulerConfig, ScheduledTask } from '../main/types/scheduler'

export const schedulerAPI = {
  // 获取完整状态
  getState: () => ipcRenderer.invoke('scheduler:getState') as Promise<SchedulerState | null>,

  // 保存完整状态
  saveState: (state: SchedulerState) => ipcRenderer.invoke('scheduler:saveState', state) as Promise<boolean>,

  // 获取配置
  getConfig: () => ipcRenderer.invoke('scheduler:getConfig') as Promise<SchedulerConfig | null>,

  // 保存配置
  saveConfig: (config: SchedulerConfig) => ipcRenderer.invoke('scheduler:saveConfig', config) as Promise<boolean>,

  // 获取已排单任务
  getScheduledTasks: () => ipcRenderer.invoke('scheduler:getScheduledTasks') as Promise<ScheduledTask[]>,

  // 保存已排单任务
  saveScheduledTasks: (tasks: ScheduledTask[]) => ipcRenderer.invoke('scheduler:saveScheduledTasks', tasks) as Promise<boolean>
}
