/**
 * 外部服务路由
 * 管理 Instapaper、Notion 等外部服务的配置
 */

import { Hono } from 'hono'
import { externalService } from '../services/external-service.js'
import type {
  ExternalServiceType,
  CreateExternalServiceRequest,
  UpdateExternalServiceRequest,
  InstapaperConfig,
  NotionConfig,
  PocketConfig,
} from '@rss-reader/shared'

const app = new Hono()

/**
 * 获取用户的外部服务列表
 */
app.get('/', async (c) => {
  try {
    const userId = 'default-user'
    const services = await externalService.getUserServices(userId)

    return c.json({
      success: true,
      data: services,
    })
  } catch (error) {
    console.error('获取外部服务列表失败:', error)
    return c.json({
      success: false,
      error: '获取外部服务列表失败',
    }, 500)
  }
})

/**
 * 创建外部服务配置
 */
app.post('/', async (c) => {
  try {
    const userId = 'default-user'
    const data: CreateExternalServiceRequest = await c.req.json()

    const service = await externalService.createService(
      userId,
      data.serviceType,
      data.name,
      data.config as InstapaperConfig | NotionConfig | PocketConfig
    )

    return c.json({
      success: true,
      data: service,
    })
  } catch (error) {
    console.error('创建外部服务失败:', error)
    return c.json({
      success: false,
      error: '创建外部服务失败',
    }, 500)
  }
})

/**
 * 更新外部服务配置
 */
app.put('/:id', async (c) => {
  try {
    const userId = 'default-user'
    const serviceId = c.req.param('id')
    const data: UpdateExternalServiceRequest = await c.req.json()

    const service = await externalService.updateService(userId, serviceId, {
      name: data.name,
      isActive: data.isActive,
      config: data.config as InstapaperConfig | NotionConfig | PocketConfig | undefined,
    })

    if (!service) {
      return c.json({ success: false, error: '服务不存在' }, 404)
    }

    return c.json({
      success: true,
      data: service,
    })
  } catch (error) {
    console.error('更新外部服务失败:', error)
    return c.json({
      success: false,
      error: '更新外部服务失败',
    }, 500)
  }
})

/**
 * 删除外部服务配置
 */
app.delete('/:id', async (c) => {
  try {
    const userId = 'default-user'
    const serviceId = c.req.param('id')

    const success = await externalService.deleteService(userId, serviceId)

    if (!success) {
      return c.json({ success: false, error: '删除失败' }, 400)
    }

    return c.json({
      success: true,
      data: { id: serviceId },
    })
  } catch (error) {
    console.error('删除外部服务失败:', error)
    return c.json({
      success: false,
      error: '删除外部服务失败',
    }, 500)
  }
})

/**
 * 测试外部服务连接
 */
app.post('/:id/test', async (c) => {
  try {
    const userId = 'default-user'
    const serviceId = c.req.param('id')

    // 获取服务类型
    const services = await externalService.getUserServices(userId)
    const service = services.find((s) => s.id === serviceId)

    if (!service) {
      return c.json({ success: false, error: '服务不存在' }, 404)
    }

    const result = await externalService.testConnection(
      userId,
      service.serviceType as ExternalServiceType
    )

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('测试连接失败:', error)
    return c.json({
      success: false,
      error: '测试连接失败',
    }, 500)
  }
})

/**
 * 按类型测试外部服务连接（用于创建前测试）
 */
app.post('/test/:type', async (c) => {
  try {
    const userId = 'default-user'
    const serviceType = c.req.param('type') as ExternalServiceType
    const config = await c.req.json() as InstapaperConfig | NotionConfig | PocketConfig

    // 临时保存配置进行测试
    const tempServiceName = `temp-test-${Date.now()}`
    const tempService = await externalService.createService(
      userId,
      serviceType,
      tempServiceName,
      config
    )

    // 测试连接
    const result = await externalService.testConnection(userId, serviceType)

    // 删除临时配置
    await externalService.deleteService(userId, tempService.id)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('测试连接失败:', error)
    return c.json({
      success: false,
      error: '测试连接失败',
    }, 500)
  }
})

export default app
