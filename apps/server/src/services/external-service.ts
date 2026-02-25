/**
 * 外部服务集成
 * 支持 Instapaper、Notion 等服务的推送
 */

import { prisma } from '../db/index.js'
import type {
  ExternalServiceType,
  ExternalServiceConfig,
  InstapaperConfig,
  NotionConfig,
  ExternalServiceTestResult,
} from '@rss-reader/shared'

/**
 * 推送文章数据接口
 */
interface PushArticleData {
  title: string
  url: string
  content?: string
  summary?: string
}

/**
 * 外部服务类
 * 处理与外部服务的集成
 */
class ExternalService {
  /**
   * 推送文章到外部服务
   */
  async pushArticle(
    userId: string,
    serviceType: ExternalServiceType,
    article: PushArticleData
  ): Promise<{ success: boolean; error?: string }> {
    // 获取服务配置
    const service = await prisma.externalService.findFirst({
      where: {
        userId,
        serviceType,
        isActive: true,
      },
    })

    if (!service) {
      return {
        success: false,
        error: `未找到激活的 ${serviceType} 服务配置`,
      }
    }

    try {
      const config = JSON.parse(service.config) as InstapaperConfig | NotionConfig

      let result: { success: boolean; error?: string }

      switch (serviceType) {
        case 'instapaper':
          result = await this.pushToInstapaper(config as InstapaperConfig, article)
          break

        case 'notion':
          result = await this.pushToNotion(config as NotionConfig, article)
          break

        case 'pocket':
          result = { success: false, error: 'Pocket 集成暂未实现' }
          break

        default:
          result = { success: false, error: `不支持的服务类型: ${serviceType}` }
      }

      // 更新使用统计
      if (result.success) {
        await prisma.externalService.update({
          where: { id: service.id },
          data: {
            lastUsedAt: new Date(),
            usedCount: { increment: 1 },
          },
        })
      }

      return result
    } catch (error) {
      console.error(`Failed to push to ${serviceType}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '推送失败',
      }
    }
  }

  /**
   * 推送到 Instapaper
   */
  private async pushToInstapaper(
    config: InstapaperConfig,
    article: PushArticleData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Instapaper API 端点
      const url = 'https://www.instapaper.com/api/add'

      // 创建 Basic Auth
      const credentials = Buffer.from(
        `${config.username}:${config.password}`
      ).toString('base64')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          url: article.url,
          title: article.title,
          selection: article.summary || article.content || '',
        }).toString(),
      })

      if (response.ok) {
        return { success: true }
      }

      // 处理错误
      const errorMessages: Record<number, string> = {
        400: '请求格式错误',
        403: '用户名或密码错误',
        500: 'Instapaper 服务错误',
        503: 'Instapaper 服务暂时不可用',
      }

      return {
        success: false,
        error: errorMessages[response.status] || `Instapaper 返回错误: ${response.status}`,
      }
    } catch (error) {
      console.error('Instapaper push error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Instapaper 推送失败',
      }
    }
  }

  /**
   * 推送到 Notion
   */
  private async pushToNotion(
    config: NotionConfig,
    article: PushArticleData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://api.notion.com/v1/pages`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: {
            database_id: config.databaseId,
          },
          properties: {
            // 假设数据库有 Title 和 URL 属性
            // 实际使用时需要根据数据库结构调整
            Name: {
              title: [
                {
                  text: {
                    content: article.title,
                  },
                },
              ],
            },
            URL: {
              url: article.url,
            },
          },
          // 如果有内容，添加到页面
          children: article.content
            ? [
                {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        type: 'text',
                        text: {
                          content: article.content.substring(0, 2000), // Notion 限制
                        },
                      },
                    ],
                  },
                },
              ]
            : [],
        }),
      })

      if (response.ok) {
        return { success: true }
      }

      const errorData = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } }
      const errorMessage =
        errorData.message || errorData.error?.message || `Notion 返回错误: ${response.status}`

      return {
        success: false,
        error: errorMessage,
      }
    } catch (error) {
      console.error('Notion push error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notion 推送失败',
      }
    }
  }

  /**
   * 测试外部服务连接
   */
  async testConnection(
    userId: string,
    serviceType: ExternalServiceType
  ): Promise<ExternalServiceTestResult> {
    const service = await prisma.externalService.findFirst({
      where: {
        userId,
        serviceType,
      },
    })

    if (!service) {
      return {
        success: false,
        error: '未找到服务配置',
      }
    }

    try {
      const config = JSON.parse(service.config) as InstapaperConfig | NotionConfig

      switch (serviceType) {
        case 'instapaper':
          return await this.testInstapaper(config as InstapaperConfig)

        case 'notion':
          return await this.testNotion(config as NotionConfig)

        case 'pocket':
          return { success: false, error: 'Pocket 集成暂未实现' }

        default:
          return { success: false, error: `不支持的服务类型: ${serviceType}` }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '测试连接失败',
      }
    }
  }

  /**
   * 测试 Instapaper 连接
   */
  private async testInstapaper(
    config: InstapaperConfig
  ): Promise<ExternalServiceTestResult> {
    try {
      const url = 'https://www.instapaper.com/api/authenticate'
      const credentials = Buffer.from(
        `${config.username}:${config.password}`
      ).toString('base64')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      })

      if (response.ok) {
        return { success: true }
      }

      const errorMessages: Record<number, string> = {
        403: '用户名或密码错误',
        500: 'Instapaper 服务错误',
        503: 'Instapaper 服务暂时不可用',
      }

      return {
        success: false,
        error: errorMessages[response.status] || '连接失败',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败',
      }
    }
  }

  /**
   * 测试 Notion 连接
   */
  private async testNotion(config: NotionConfig): Promise<ExternalServiceTestResult> {
    try {
      // 测试数据库访问权限
      const url = `https://api.notion.com/v1/databases/${config.databaseId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      })

      if (response.ok) {
        return { success: true }
      }

      const errorData = await response.json().catch(() => ({})) as { message?: string }
      return {
        success: false,
        error: errorData.message || `无法访问数据库: ${response.status}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败',
      }
    }
  }

  /**
   * 获取用户的外部服务列表
   */
  async getUserServices(userId: string): Promise<ExternalServiceConfig[]> {
    const services = await prisma.externalService.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return services.map((s) => ({
      id: s.id,
      userId: s.userId,
      serviceType: s.serviceType as ExternalServiceType,
      name: s.name,
      isActive: s.isActive,
      lastUsedAt: s.lastUsedAt || undefined,
      usedCount: s.usedCount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  }

  /**
   * 创建外部服务配置
   */
  async createService(
    userId: string,
    serviceType: ExternalServiceType,
    name: string,
    config: InstapaperConfig | NotionConfig
  ): Promise<ExternalServiceConfig> {
    const service = await prisma.externalService.create({
      data: {
        userId,
        serviceType,
        name,
        config: JSON.stringify(config),
        isActive: true,
      },
    })

    return {
      id: service.id,
      userId: service.userId,
      serviceType: service.serviceType as ExternalServiceType,
      name: service.name,
      isActive: service.isActive,
      lastUsedAt: service.lastUsedAt || undefined,
      usedCount: service.usedCount,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    }
  }

  /**
   * 更新外部服务配置
   */
  async updateService(
    userId: string,
    serviceId: string,
    data: {
      name?: string
      isActive?: boolean
      config?: InstapaperConfig | NotionConfig
    }
  ): Promise<ExternalServiceConfig | null> {
    const updateData: {
      name?: string
      isActive?: boolean
      config?: string
    } = {}

    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }
    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config)
    }

    const service = await prisma.externalService.update({
      where: {
        id: serviceId,
        userId,
      },
      data: updateData,
    })

    return {
      id: service.id,
      userId: service.userId,
      serviceType: service.serviceType as ExternalServiceType,
      name: service.name,
      isActive: service.isActive,
      lastUsedAt: service.lastUsedAt || undefined,
      usedCount: service.usedCount,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    }
  }

  /**
   * 删除外部服务配置
   */
  async deleteService(userId: string, serviceId: string): Promise<boolean> {
    try {
      await prisma.externalService.delete({
        where: {
          id: serviceId,
          userId,
        },
      })
      return true
    } catch {
      return false
    }
  }
}

// 导出单例
export const externalService = new ExternalService()
