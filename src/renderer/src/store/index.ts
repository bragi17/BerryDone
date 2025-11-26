// 使用 Vue 3 Composition API 的响应式状态管理
import { ref, computed } from 'vue'

// 任务状态类型
export type TaskStatus = 'new' | 'ready' | 'wip' | 'waitlist' | 'completed' | 'pending'

// 状态配置
export const taskStatusConfig: Record<TaskStatus, { label: string; color: string; gradient?: string; textColor?: string }> = {
  new: {
    label: 'New',
    color: '#5B87FF',
    gradient: 'linear-gradient(135deg, #5B87FF 0%, #F346AE 100%)',
    textColor: '#FFFFFF'
  },
  ready: {
    label: 'Ready',
    color: '#7CB40B',
    textColor: '#FFFFFF'
  },
  wip: {
    label: 'WIP',
    color: '#6283D6',
    textColor: '#FFFFFF'
  },
  completed: {
    label: 'Completed',
    color: '#F6FDE7',
    textColor: '#333333'
  },
  waitlist: {
    label: 'Waitlist',
    color: '#3F9489',
    textColor: '#FFFFFF'
  },
  pending: {
    label: 'Pending',
    color: '#EEF9F8',
    textColor: '#333333'
  }
}

export interface Task {
  id: string
  title: string
  startDate: string
  endDate: string
  progress: number
  status: TaskStatus
  members: string[]
  color: string
  projectId: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
}

// 全局状态
const tasks = ref<Task[]>([])
const projects = ref<Project[]>([])
const currentProjectId = ref<string | null>(null)
const loading = ref(false)

// 计算属性
const currentProject = computed(() => {
  return projects.value.find(p => p.id === currentProjectId.value) || null
})

const filteredTasks = computed(() => {
  if (!currentProjectId.value) return tasks.value
  return tasks.value.filter(t => t.projectId === currentProjectId.value)
})

// 操作方法
export function useStore() {
  // 加载数据
  const loadTasks = async () => {
    loading.value = true
    try {
      tasks.value = await window.api.db.getTasks()
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      loading.value = false
    }
  }

  const loadProjects = async () => {
    loading.value = true
    try {
      projects.value = await window.api.db.getProjects()
      if (projects.value.length > 0 && !currentProjectId.value) {
        currentProjectId.value = projects.value[0].id
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      loading.value = false
    }
  }

  // 任务操作
  const addTask = async (task: Omit<Task, 'id'>) => {
    try {
      // 创建纯对象，移除响应式代理
      const plainTask = JSON.parse(JSON.stringify(task))
      const newTask = await window.api.db.addTask(plainTask)
      tasks.value.push(newTask)
      return newTask
    } catch (error) {
      console.error('Failed to add task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // 创建纯对象，移除响应式代理
      const plainUpdates = JSON.parse(JSON.stringify(updates))
      await window.api.db.updateTask(id, plainUpdates)
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = { ...tasks.value[index], ...plainUpdates }
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      throw error
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await window.api.db.deleteTask(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
    } catch (error) {
      console.error('Failed to delete task:', error)
      throw error
    }
  }

  // 项目操作
  const addProject = async (project: Omit<Project, 'id'>) => {
    try {
      const newProject = await window.api.db.addProject(project)
      projects.value.push(newProject)
      return newProject
    } catch (error) {
      console.error('Failed to add project:', error)
      throw error
    }
  }

  const setCurrentProject = (projectId: string) => {
    currentProjectId.value = projectId
  }

  const init = async () => {
    await Promise.all([loadProjects(), loadTasks()])
  }

  return {
    // 状态
    tasks,
    projects,
    currentProjectId,
    loading,
    currentProject,
    filteredTasks,
    
    // 方法
    init,
    loadTasks,
    loadProjects,
    addTask,
    updateTask,
    deleteTask,
    addProject,
    setCurrentProject
  }
}

