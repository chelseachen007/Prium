/**
 * API 请求 Composable
 * @module composables/useApi
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import type {
  ApiResponse,
  PaginatedResponse,
  ApiErrorDetail,
  ApiErrorCode,
} from '@rss-reader/shared'

/**
 * API 错误类
 */
export class ApiError extends Error {
  code: ApiErrorCode
  details?: unknown
  fieldErrors?: Array<{ field: string; message: string }>

  constructor(detail: ApiErrorDetail) {
    super(detail.message)
    this.name = 'ApiError'
    this.code = detail.code
    this.details = detail.details
    this.fieldErrors = detail.fieldErrors
  }
}

/**
 * API 配置接口
 */
interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
}

/**
 * 默认 API 配置
 */
const defaultConfig: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * 创建 Axios 实例
 */
function createApiClient(config: ApiClientConfig = {}): AxiosInstance {
  const client = axios.create({
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers,
    },
  })

  // 请求拦截器
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 从 localStorage 获取 token
      const token = localStorage.getItem('auth_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // 添加请求 ID
      if (config.headers) {
        config.headers['X-Request-ID'] = crypto.randomUUID()
      }

      return config
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response
    },
    (error: AxiosError<ApiResponse<unknown>>) => {
      // 处理网络错误
      if (!error.response) {
        const networkError: ApiErrorDetail = {
          code: 'NETWORK_ERROR',
          message: '网络连接失败，请检查网络设置',
        }
        return Promise.reject(new ApiError(networkError))
      }

      const { response } = error
      const { status } = response

      // 处理 HTTP 错误状态码
      let errorCode: ApiErrorCode = 'INTERNAL_ERROR'
      let errorMessage = '服务器内部错误'

      switch (status) {
        case 400:
          errorCode = 'BAD_REQUEST'
          errorMessage = '请求参数错误'
          break
        case 401:
          errorCode = 'UNAUTHORIZED'
          errorMessage = '未授权，请先登录'
          // 可以在这里触发登录流程
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
          break
        case 403:
          errorCode = 'FORBIDDEN'
          errorMessage = '没有权限访问此资源'
          break
        case 404:
          errorCode = 'NOT_FOUND'
          errorMessage = '请求的资源不存在'
          break
        case 409:
          errorCode = 'CONFLICT'
          errorMessage = '资源冲突'
          break
        case 422:
          errorCode = 'VALIDATION_ERROR'
          errorMessage = '数据验证失败'
          break
        case 429:
          errorCode = 'RATE_LIMIT_EXCEEDED'
          errorMessage = '请求过于频繁，请稍后再试'
          break
        case 503:
          errorCode = 'SERVICE_UNAVAILABLE'
          errorMessage = '服务暂时不可用'
          break
      }

      // 使用服务器返回的错误信息（如果有）
      const serverError = response.data?.error
      if (serverError) {
        errorMessage = serverError
      }

      const apiError: ApiErrorDetail = {
        code: errorCode,
        message: errorMessage,
      }

      return Promise.reject(new ApiError(apiError))
    }
  )

  return client
}

/**
 * API 客户端实例
 */
const apiClient = createApiClient()

/**
 * 通用请求方法
 */
async function request<T>(
  config: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config)
  return response.data
}

/**
 * GET 请求
 */
async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'GET',
    url,
    params,
    ...config,
  })
}

/**
 * POST 请求
 */
async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'POST',
    url,
    data,
    ...config,
  })
}

/**
 * PUT 请求
 */
async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'PUT',
    url,
    data,
    ...config,
  })
}

/**
 * PATCH 请求
 */
async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'PATCH',
    url,
    data,
    ...config,
  })
}

/**
 * DELETE 请求
 */
async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return request<T>({
    method: 'DELETE',
    url,
    ...config,
  })
}

/**
 * 分页请求
 */
async function getPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<PaginatedResponse<T>> {
  const response = await apiClient.request<PaginatedResponse<T>>({
    method: 'GET',
    url,
    params,
    ...config,
  })
  return response.data
}

/**
 * useApi Composable
 *
 * 提供统一的 API 请求方法
 *
 * @example
 * ```typescript
 * const api = useApi()
 *
 * // GET 请求
 * const response = await api.get<Subscription[]>('/subscriptions')
 *
 * // POST 请求
 * const result = await api.post<Subscription>('/subscriptions', { feedUrl: '...' })
 * ```
 */
export function useApi() {
  return {
    client: apiClient,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    getPaginated,
    ApiError,
  }
}

// 导出默认实例方法
export default useApi
