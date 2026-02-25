import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { HTTPException } from 'hono/http-exception'
import { serve } from '@hono/node-server'
import { ZodError } from 'zod'

import { routes } from './routes/index.js'

const app = new Hono()

// ==================== 中间件配置 ====================

// 日志中间件
app.use('*', logger())

// 安全头
app.use('*', secureHeaders())

// CORS 配置
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // 前端开发服务器
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}))

// JSON 格式化
app.use('*', prettyJSON())

// ==================== 路由配置 ====================

// 健康检查
app.get('/', (c) => {
  return c.json({
    name: 'RSS Reader API',
    version: '0.1.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

// API 路由
app.route('/api', routes)

// ==================== 错误处理 ====================

// 404 处理
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的资源不存在',
      },
    },
    404
  )
})

// 全局错误处理
app.onError((err, c) => {
  console.error('Error:', err)

  // Zod 验证错误
  if (err instanceof ZodError || err.name === 'ZodError') {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: (err as ZodError).errors,
        },
      },
      400
    )
  }

  // HTTP 异常
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: err.name,
          message: err.message,
        },
      },
      err.status
    )
  }

  // 未知错误
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    },
    500
  )
})

// ==================== 启动服务器 ====================

const port = Number(process.env.PORT) || 3001

serve({
  fetch: app.fetch,
  port,
})

console.log(`🚀 Server is running on http://localhost:${port}`)
