// VGen Commission 数据类型定义

export interface VGenCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
}

export interface VGenCommission {
  id: string
  title: string
  status: 'new' | 'ready' | 'wip' | 'completed' | 'waitlist' | 'pending'
  price?: string
  description?: string
  clientName?: string
  dueDate?: string
  createdAt?: string
  updatedAt?: string
}

export interface VGenFetchResult {
  success: boolean
  data?: {
    new: VGenCommission[]
    ready: VGenCommission[]
    wip: VGenCommission[]
    completed: VGenCommission[]
    waitlist: VGenCommission[]
    pending: VGenCommission[]
  }
  error?: string
  timestamp: string
}

export interface VGenApiResponse {
  // 根据实际 API 响应调整
  commissions?: any[]
  success?: boolean
  message?: string
}

