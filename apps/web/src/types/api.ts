/**
 * API 响应相关类型定义
 * @module types/api
 */

/**
 * 通用 API 响应接口
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  requestId?: string
  timestamp?: number
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
  hasMore?: boolean
  error?: string
}

/**
 * 分页请求参数接口
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * API 错误类型枚举
 */
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'

/**
 * API 错误详情接口
 */
export interface ApiErrorDetail {
  code: ApiErrorCode
  message: string
  details?: unknown
  fieldErrors?: Array<{
    field: string
    message: string
  }>
}
