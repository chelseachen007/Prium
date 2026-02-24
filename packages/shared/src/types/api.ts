/**
 * API 响应相关类型定义
 * @module types/api
 */

/**
 * 通用 API 响应接口
 *
 * 表示 API 的标准响应格式
 *
 * @template T - 响应数据类型
 *
 * @example
 * ```typescript
 * // 成功响应
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: '1', name: 'John' },
 * };
 *
 * // 错误响应
 * const errorResponse: ApiResponse<User> = {
 *   success: false,
 *   error: '用户不存在',
 * };
 * ```
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;

  /** 响应数据（成功时） */
  data?: T;

  /** 错误信息（失败时） */
  error?: string;

  /** 错误代码（可选） */
  errorCode?: string;

  /** 请求 ID（用于追踪，可选） */
  requestId?: string;

  /** 时间戳（可选） */
  timestamp?: number;
}

/**
 * 分页响应接口
 *
 * 表示带有分页信息的 API 响应
 *
 * @template T - 数据项类型
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<Article> = {
 *   success: true,
 *   data: [article1, article2],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** 是否成功 */
  success: boolean;

  /** 数据列表 */
  data: T[];

  /** 总数量 */
  total: number;

  /** 当前页码（从 1 开始） */
  page: number;

  /** 每页数量 */
  pageSize: number;

  /** 总页数（可选） */
  totalPages?: number;

  /** 是否有更多数据（可选） */
  hasMore?: boolean;

  /** 错误信息（失败时，可选） */
  error?: string;
}

/**
 * 分页请求参数接口
 */
export interface PaginationParams {
  /** 页码（从 1 开始） */
  page?: number;

  /** 每页数量 */
  pageSize?: number;

  /** 排序字段（可选） */
  sortBy?: string;

  /** 排序方向（可选） */
  sortOrder?: 'asc' | 'desc';
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
  | 'NETWORK_ERROR';

/**
 * API 错误详情接口
 */
export interface ApiErrorDetail {
  /** 错误代码 */
  code: ApiErrorCode;

  /** 错误消息 */
  message: string;

  /** 详细错误信息（可选） */
  details?: unknown;

  /** 字段级错误（用于表单验证，可选） */
  fieldErrors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * API 错误响应接口
 */
export interface ApiErrorResponse {
  /** 是否成功（始终为 false） */
  success: false;

  /** 错误详情 */
  error: ApiErrorDetail;

  /** 请求 ID */
  requestId?: string;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 批量操作结果接口
 *
 * @template T - 成功项的数据类型
 */
export interface BatchOperationResult<T> {
  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failedCount: number;

  /** 成功项列表 */
  successful: Array<{
    id: string;
    data?: T;
  }>;

  /** 失败项列表 */
  failed: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * 搜索请求接口
 */
export interface SearchRequest {
  /** 搜索关键词 */
  query: string;

  /** 搜索字段（可选） */
  fields?: string[];

  /** 筛选条件（可选） */
  filters?: Record<string, unknown>;

  /** 分页参数 */
  pagination?: PaginationParams;

  /** 高亮匹配内容（可选） */
  highlight?: boolean;
}

/**
 * 搜索结果接口
 *
 * @template T - 结果项类型
 */
export interface SearchResult<T> {
  /** 是否成功 */
  success: boolean;

  /** 搜索结果列表 */
  data: Array<{
    item: T;
    score?: number;
    highlights?: Record<string, string[]>;
  }>;

  /** 总匹配数 */
  total: number;

  /** 搜索耗时（毫秒） */
  took: number;

  /** 搜索建议（可选） */
  suggestions?: string[];
}

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API 请求配置接口
 */
export interface ApiRequestConfig {
  /** 请求方法 */
  method: HttpMethod;

  /** 请求路径 */
  path: string;

  /** 查询参数（可选） */
  params?: Record<string, string | number | boolean | undefined>;

  /** 请求体（可选） */
  body?: unknown;

  /** 请求头（可选） */
  headers?: Record<string, string>;

  /** 超时时间（毫秒，可选） */
  timeout?: number;

  /** 是否携带凭证（可选） */
  withCredentials?: boolean;
}

/**
 * WebSocket 消息接口
 */
export interface WebSocketMessage<T = unknown> {
  /** 消息类型 */
  type: string;

  /** 消息数据 */
  data: T;

  /** 时间戳 */
  timestamp: number;

  /** 消息 ID（可选） */
  id?: string;
}

/**
 * WebSocket 事件类型
 */
export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'article.new'
  | 'article.updated'
  | 'subscription.sync'
  | 'notification'
  | 'error';

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  /** 通知 ID */
  id: string;

  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error';

  /** 通知标题 */
  title: string;

  /** 通知内容 */
  message: string;

  /** 创建时间 */
  createdAt: Date;

  /** 是否已读 */
  isRead: boolean;

  /** 关联数据（可选） */
  metadata?: Record<string, unknown>;
}
