// 示例数据生成器
import type { Task } from '../store'
import { taskStatusConfig } from '../store'

export function generateSampleTasks(): Omit<Task, 'id'>[] {
  return [
    {
      title: 'Design - Desktop Version',
      startDate: '2025-01-02',
      endDate: '2025-01-07',
      progress: 100,
      status: 'completed',
      members: [],
      color: taskStatusConfig.completed.color,
      projectId: 'website'
    },
    {
      title: 'Design - Mobile Version',
      startDate: '2025-01-08',
      endDate: '2025-01-10',
      progress: 100,
      status: 'completed',
      members: [],
      color: taskStatusConfig.completed.color,
      projectId: 'website'
    },
    {
      title: 'Development - Desktop Version',
      startDate: '2025-01-08',
      endDate: '2025-01-15',
      progress: 60,
      status: 'wip',
      members: [],
      color: taskStatusConfig.wip.color,
      projectId: 'website'
    },
    {
      title: 'API Integration',
      startDate: '2025-01-12',
      endDate: '2025-01-18',
      progress: 30,
      status: 'wip',
      members: [],
      color: taskStatusConfig.wip.color,
      projectId: 'website'
    },
    {
      title: 'Testing & QA',
      startDate: '2025-01-16',
      endDate: '2025-01-22',
      progress: 0,
      status: 'ready',
      members: [],
      color: taskStatusConfig.ready.color,
      projectId: 'website'
    },
    {
      title: 'Deployment',
      startDate: '2025-01-20',
      endDate: '2025-01-25',
      progress: 0,
      status: 'new',
      members: [],
      color: taskStatusConfig.new.color,
      projectId: 'website'
    }
  ]
}

