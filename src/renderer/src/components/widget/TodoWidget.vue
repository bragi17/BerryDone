<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCheckbox, NEmpty } from 'naive-ui'

interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
}

const todos = ref<Task[]>([])
const loading = ref(true)

// 加载今日待办
const loadTodayTodos = async () => {
  loading.value = true
  try {
    const allTasks = await window.electron.ipcRenderer.invoke('db:getTasks')
    const today = new Date().toISOString().split('T')[0]

    // 筛选今日待办
    todos.value = allTasks
      .filter((task: any) => {
        if (!task.dueDate) return false
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0]
        return taskDate === today
      })
      .map((task: any) => ({
        id: task.id,
        title: task.title,
        completed: task.completed || false,
        dueDate: task.dueDate,
        priority: task.priority || 'medium'
      }))
  } catch (error) {
    console.error('Failed to load todos:', error)
  } finally {
    loading.value = false
  }
}

// 切换完成状态
const toggleComplete = async (task: Task) => {
  try {
    await window.electron.ipcRenderer.invoke('db:updateTask', task.id, {
      completed: !task.completed
    })
    task.completed = !task.completed
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}

// 获取优先级颜色
const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high':
      return '#f44336'
    case 'medium':
      return '#ff9800'
    case 'low':
      return '#4caf50'
    default:
      return '#999'
  }
}

onMounted(() => {
  loadTodayTodos()
  // 每30秒刷新一次
  setInterval(loadTodayTodos, 30000)
})
</script>

<template>
  <div class="todo-widget">
    <div v-if="loading" class="loading">加载中...</div>

    <n-empty v-else-if="todos.length === 0" description="今日暂无待办事项" size="small">
      <template #icon>
        <span style="font-size: 32px">✓</span>
      </template>
    </n-empty>

    <div v-else class="todo-list">
      <div
        v-for="task in todos"
        :key="task.id"
        class="todo-item"
        :class="{ completed: task.completed }"
      >
        <n-checkbox :checked="task.completed" @update:checked="() => toggleComplete(task)" />
        <div class="todo-content">
          <div class="todo-title">{{ task.title }}</div>
          <div class="todo-meta">
            <span
              class="priority-indicator"
              :style="{ background: getPriorityColor(task.priority) }"
            ></span>
            <span class="priority-text">
              {{
                task.priority === 'high'
                  ? '高优先级'
                  : task.priority === 'low'
                    ? '低优先级'
                    : '中优先级'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
  color: #999;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.todo-title {
  font-size: 14px;
  color: #e0e0e0;
  line-height: 1.4;
  word-break: break-word;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.priority-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-text {
  font-size: 11px;
  color: #999;
}
</style>
