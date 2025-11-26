// 日期工具函数 - 统一使用北京时间（东八区 UTC+8）

/**
 * 将日期字符串（YYYY-MM-DD 或 ISO 格式）转换为本地 Date 对象
 * 避免时区问题，确保日期按本地时间解析
 */
export function parseDateString(dateStr: string): Date {
  // 如果是 ISO 格式字符串（包含 T），直接解析
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  
  // 否则按 YYYY-MM-DD 格式解析
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0)
}

/**
 * 将 Date 对象转换为日期字符串（YYYY-MM-DD）
 * 使用本地时间，不受时区影响
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 */
export function getTodayString(): string {
  return formatDateString(new Date())
}

/**
 * 将日期字符串转换为时间戳（用于 DatePicker）
 */
export function dateStringToTimestamp(dateStr: string): number | null {
  if (!dateStr) return null
  try {
    const timestamp = parseDateString(dateStr).getTime()
    // 检查是否为有效的时间戳
    if (isNaN(timestamp)) return null
    return timestamp
  } catch (error) {
    console.error('Failed to parse date string:', dateStr, error)
    return null
  }
}

/**
 * 将时间戳转换为日期字符串（用于 DatePicker）
 */
export function timestampToDateString(timestamp: number): string {
  return formatDateString(new Date(timestamp))
}

/**
 * 格式化日期显示（例如：02 Jan）
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseDateString(dateStr)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${date.getDate().toString().padStart(2, '0')} ${monthNames[date.getMonth()]}`
}

