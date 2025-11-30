// Preload 层数据库 API
import { ipcRenderer } from 'electron'
import type { Task, Project, VGenCommission, VGenService, Refund } from '../main/db'

export const dbAPI = {
  // 任务相关
  getTasks: () => ipcRenderer.invoke('db:getTasks') as Promise<Task[]>,
  addTask: (task: Omit<Task, 'id'>) => ipcRenderer.invoke('db:addTask', task) as Promise<Task>,
  updateTask: (id: string, task: Partial<Task>) => ipcRenderer.invoke('db:updateTask', id, task) as Promise<void>,
  deleteTask: (id: string) => ipcRenderer.invoke('db:deleteTask', id) as Promise<void>,

  // 项目相关
  getProjects: () => ipcRenderer.invoke('db:getProjects') as Promise<Project[]>,
  addProject: (project: Omit<Project, 'id'>) => ipcRenderer.invoke('db:addProject', project) as Promise<Project>,
  updateProject: (id: string, project: Partial<Project>) => ipcRenderer.invoke('db:updateProject', id, project) as Promise<void>,
  deleteProject: (id: string) => ipcRenderer.invoke('db:deleteProject', id) as Promise<void>,

  // VGen Commissions 相关
  getVGenCommissions: () => ipcRenderer.invoke('db:getVGenCommissions') as Promise<VGenCommission[]>,
  getVGenCommissionsByStatus: (status: string) => ipcRenderer.invoke('db:getVGenCommissionsByStatus', status) as Promise<VGenCommission[]>,
  updateVGenCommissionWorkHours: (id: string, workHours: number) => ipcRenderer.invoke('db:updateVGenCommissionWorkHours', id, workHours) as Promise<boolean>,

  // VGen Services 相关
  getVGenServices: () => ipcRenderer.invoke('db:getVGenServices') as Promise<VGenService[]>,
  updateVGenServiceWorkHours: (id: string, workHours: number) => ipcRenderer.invoke('db:updateVGenServiceWorkHours', id, workHours) as Promise<boolean>,
  importVGenServices: (services: VGenService[]) => ipcRenderer.invoke('db:importVGenServices', services) as Promise<boolean>,

  // WorkHoursConfig 相关
  getWorkHoursConfig: () => ipcRenderer.invoke('db:getWorkHoursConfig') as Promise<any>,
  saveWorkHoursConfig: (config: any) => ipcRenderer.invoke('db:saveWorkHoursConfig', config) as Promise<boolean>,

  // Refunds 相关
  getRefunds: () => ipcRenderer.invoke('db:getRefunds') as Promise<Refund[]>,
  addRefund: (refund: Refund) => ipcRenderer.invoke('db:addRefund', refund) as Promise<boolean>,
  deleteRefund: (id: string) => ipcRenderer.invoke('db:deleteRefund', id) as Promise<boolean>
}

