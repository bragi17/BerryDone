// VGen 服务数据结构
export interface VGenService {
  id: string
  serviceId: string // VGen 的服务 ID
  title: string // 服务标题，如 "YCH Nighty Night"
  description: string // 服务描述
  category: string // 分类，如 "autumn ych selling"
  price: {
    from: number // 起始价格
    currency: string // 货币
  }
  imageUrl?: string // 服务图片
  thumbnailUrl?: string
  isOpen: boolean // 是否开放接单
  deliveryTime?: string // 交付时间，如 "1 month"
  slots?: {
    total: number // 总槽位
    available: number // 可用槽位
  }
  estimatedWorkHours?: number // 预计工时（用户填写）
  tags?: string[] // 标签
  details?: {
    resolution?: string // 分辨率
    format?: string // 格式
    extras?: string[] // 额外说明
  }
  createdAt?: string
  updatedAt?: string
}

// 原始 API 数据格式（用于解析）
export interface VGenServiceRaw {
  serviceID: string
  userID: string
  serviceName: string
  description: string
  category?: string
  priceFrom: number
  priceTo?: number
  currency: string
  deliveryTime?: string
  slots?: {
    total: number
    used: number
  }
  images?: Array<{
    url: string
    thumbnail?: string
  }>
  isActive: boolean
  tags?: string[]
  options?: any
  created: string
  modified: string
}

