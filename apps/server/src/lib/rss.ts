/**
 * RSS 解析服务
 * 使用 rss-parser 解析 RSS/Atom feeds
 */

import Parser from 'rss-parser'
import crypto from 'crypto'

// ==================== 类型定义 ====================

export interface RSSItem {
  guid?: string
  title?: string
  link?: string
  pubDate?: string
  creator?: string
  content?: string
  contentSnippet?: string
  isoDate?: string
  categories?: string[]
  enclosure?: {
    url: string
    length?: number
    type?: string
  }
  [key: string]: unknown
}

export interface RSSFeed {
  title?: string
  description?: string
  link?: string
  feedUrl?: string
  image?: {
    url?: string
    title?: string
    link?: string
  }
  language?: string
  copyright?: string
  lastBuildDate?: string
  pubDate?: string
  items: RSSItem[]
  [key: string]: unknown
}

export interface ParsedArticle {
  guid: string
  title: string
  url: string
  content: string | null
  contentText: string | null
  author: string | null
  publishedAt: Date | null
  imageUrl: string | null
  contentHash: string
  readingTime: number
  categories: string[]
  summary: string | null
}

export interface ParsedFeed {
  title: string
  description: string | null
  siteUrl: string | null
  feedUrl: string
  imageUrl: string | null
  language: string | null
  articles: ParsedArticle[]
}

export interface FetchOptions {
  timeout?: number
  headers?: Record<string, string>
  lastModified?: string
  etag?: string
}

export interface FetchResult {
  feed: ParsedFeed | null
  notModified: boolean
  etag: string | null
  lastModified: string | null
}

export class RSSError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'RSSError'
  }
}

// Feed 结果类型（运行时）
interface FeedResult {
  title?: string
  description?: string
  link?: string
  language?: string
  lastBuildDate?: string
  pubDate?: string
  image?: {
    url?: string
    title?: string
    link?: string
  }
  itunes?: {
    image?: string
  }
  items: Array<{
    guid?: string
    title?: string
    link?: string
    pubDate?: string
    isoDate?: string
    creator?: string
    content?: string
    contentSnippet?: string
    summary?: string
    categories?: string[]
    enclosure?: {
      url: string
      length?: number
      type?: string
    }
    [key: string]: unknown
  }>
}

// ==================== RSS 解析器类 ====================

class RSSParser {
  private parser: Parser

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.parser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent': 'RSS-Reader/1.0 (RSS Feed Reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
        ],
      },
    }) as Parser
  }

  /**
   * 解析 RSS/Atom feed
   */
  async parse(
    feedUrl: string,
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    const { lastModified, etag } = options

    try {
      // 解析 feed
      const feed = await this.parser.parseURL(feedUrl) as unknown as FeedResult

      // 获取响应头（rss-parser 不直接提供，这里从 feed 中提取）
      const responseEtag = null // rss-parser 不提供 ETag
      const responseLastModified = feed.lastBuildDate || feed.pubDate || null

      // 解析文章
      const articles = feed.items.map((item) => this.parseItem(item))

      // 构建解析结果
      const parsedFeed: ParsedFeed = {
        title: feed.title || 'Untitled Feed',
        description: feed.description || null,
        siteUrl: feed.link || null,
        feedUrl: feedUrl,
        imageUrl: this.extractImageUrl(feed),
        language: feed.language || null,
        articles,
      }

      return {
        feed: parsedFeed,
        notModified: false,
        etag: responseEtag,
        lastModified: responseLastModified,
      }
    } catch (error) {
      // 处理 304 Not Modified
      if (this.isNotModifiedError(error)) {
        return {
          feed: null,
          notModified: true,
          etag: etag || null,
          lastModified: lastModified || null,
        }
      }

      // 处理其他错误
      throw this.handleError(error, feedUrl)
    }
  }

  /**
   * 从原始 XML 解析 feed
   */
  async parseFromString(xmlContent: string): Promise<ParsedFeed> {
    try {
      const feed = await this.parser.parseString(xmlContent) as unknown as FeedResult
      const articles = feed.items.map((item) => this.parseItem(item))

      return {
        title: feed.title || 'Untitled Feed',
        description: feed.description || null,
        siteUrl: feed.link || null,
        feedUrl: '',
        imageUrl: this.extractImageUrl(feed),
        language: feed.language || null,
        articles,
      }
    } catch (error) {
      throw new RSSError(
        '解析 RSS 内容失败',
        'PARSE_ERROR',
        error
      )
    }
  }

  /**
   * 解析单个条目
   */
  private parseItem(item: FeedResult['items'][0]): ParsedArticle {
    const content = this.extractContent(item)
    const contentText = this.stripHtml(content)
    const guid = this.generateGuid(item)
    const summary = this.extractSummary(item, contentText)

    return {
      guid,
      title: this.cleanTitle(item.title || '无标题'),
      url: item.link || '',
      content,
      contentText,
      summary,
      author: item.creator || this.getStringField(item, 'dcCreator') || null,
      publishedAt: this.parseDate(item.pubDate || item.isoDate || this.getStringField(item, 'dcDate')),
      imageUrl: this.extractItemImageUrl(item),
      contentHash: this.generateContentHash(content || item.link || guid),
      readingTime: this.calculateReadingTime(contentText),
      categories: item.categories || [],
    }
  }

  /**
   * 从对象中安全获取字符串字段
   */
  private getStringField(obj: Record<string, unknown>, field: string): string | undefined {
    const value = obj[field]
    return typeof value === 'string' ? value : undefined
  }

  /**
   * 提取内容
   */
  private extractContent(item: FeedResult['items'][0]): string | null {
    // 优先使用完整内容
    const contentEncoded = this.getStringField(item, 'contentEncoded')
    if (contentEncoded) {
      return contentEncoded
    }

    if (item.content) {
      return item.content
    }

    if (item.contentSnippet) {
      return item.contentSnippet
    }

    if (item.summary) {
      return item.summary
    }

    return null
  }

  /**
   * 提取摘要
   */
  private extractSummary(item: FeedResult['items'][0], contentText: string | null): string | null {
    // 优先使用 summary
    if (item.summary) {
      return this.stripHtml(item.summary)
    }

    // 其次使用 contentSnippet
    if (item.contentSnippet) {
      return item.contentSnippet
    }

    // 如果没有摘要，从正文截取前 200 字
    if (contentText) {
      return contentText.slice(0, 200) + (contentText.length > 200 ? '...' : '')
    }

    return null
  }

  /**
   * 清理标题
   */
  private cleanTitle(title: string): string {
    // 移除 HTML 标签
    return title
      .replace(/<[^>]*>/g, '')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
      .replace(/&([^;]+);/g, ' ')
      .trim()
  }

  /**
   * 生成唯一标识符
   */
  private generateGuid(item: FeedResult['items'][0]): string {
    if (item.guid) {
      return item.guid
    }

    if (item.link) {
      return item.link
    }

    // 如果没有 guid 和 link，基于内容生成
    const content = item.title + (item.content || '') + item.pubDate
    return crypto.createHash('md5').update(content).digest('hex')
  }

  /**
   * 解析日期
   */
  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return null
      }
      return date
    } catch {
      return null
    }
  }

  /**
   * 提取 feed 图片 URL
   */
  private extractImageUrl(feed: FeedResult): string | null {
    // RSS 2.0 image
    if (feed.image?.url) {
      return feed.image.url
    }

    // Atom logo
    if (feed.image?.link) {
      return feed.image.link
    }

    // iTunes podcast image
    if (feed.itunes?.image) {
      return feed.itunes.image
    }

    // Media thumbnail
    const feedRecord = feed as unknown as Record<string, unknown>
    const mediaThumbnail = feedRecord['mediaThumbnail']
    if (typeof mediaThumbnail === 'object' && mediaThumbnail !== null && 'url' in mediaThumbnail) {
      return (mediaThumbnail as { url?: string }).url || null
    }

    return null
  }

  /**
   * 提取文章图片 URL
   */
  private extractItemImageUrl(item: FeedResult['items'][0]): string | null {
    // 媒体缩略图
    const mediaThumbnail = item['mediaThumbnail']
    if (typeof mediaThumbnail === 'object' && mediaThumbnail !== null && 'url' in mediaThumbnail) {
      const thumbnail = mediaThumbnail as { url?: string }
      if (thumbnail.url) {
        return thumbnail.url
      }
    }

    // 媒体内容
    const mediaContent = item['mediaContent']
    if (typeof mediaContent === 'object' && mediaContent !== null) {
      const content = mediaContent as { url?: string; type?: string }
      if (content.url && content.type?.startsWith('image/')) {
        return content.url
      }
    }

    // Enclosure（通常是音频/视频，但也可能是图片）
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url
    }

    // 从内容中提取第一张图片
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i)
      if (imgMatch) {
        return imgMatch[1]
      }
    }

    return null
  }

  /**
   * 生成内容哈希
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * 移除 HTML 标签
   */
  private stripHtml(html: string | null): string | null {
    if (!html) return null

    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 计算阅读时间（分钟）
   */
  private calculateReadingTime(text: string | null): number {
    if (!text) return 0

    // 中文平均阅读速度约 400 字/分钟
    // 英文平均阅读速度约 200 词/分钟
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length

    const chineseTime = chineseChars / 400
    const englishTime = englishWords / 200

    return Math.max(1, Math.ceil(chineseTime + englishTime))
  }

  /**
   * 检查是否是 304 错误
   */
  private isNotModifiedError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('304') ||
        message.includes('not modified')
      )
    }
    return false
  }

  /**
   * 处理错误
   */
  private handleError(error: unknown, feedUrl: string): RSSError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      // 超时错误
      if (message.includes('timeout') || message.includes('etimedout')) {
        return new RSSError(
          `请求超时: ${feedUrl}`,
          'TIMEOUT',
          error
        )
      }

      // 网络错误
      if (
        message.includes('enotfound') ||
        message.includes('econnrefused') ||
        message.includes('network')
      ) {
        return new RSSError(
          `网络错误，无法访问: ${feedUrl}`,
          'NETWORK_ERROR',
          error
        )
      }

      // 解析错误
      if (message.includes('parse') || message.includes('xml')) {
        return new RSSError(
          `RSS 格式错误: ${feedUrl}`,
          'PARSE_ERROR',
          error
        )
      }

      // 状态码错误
      if (message.includes('404')) {
        return new RSSError(
          `Feed 不存在: ${feedUrl}`,
          'NOT_FOUND',
          error
        )
      }

      if (message.includes('403')) {
        return new RSSError(
          `访问被拒绝: ${feedUrl}`,
          'FORBIDDEN',
          error
        )
      }

      if (message.includes('401')) {
        return new RSSError(
          `需要认证: ${feedUrl}`,
          'UNAUTHORIZED',
          error
        )
      }

      return new RSSError(
        `解析 Feed 失败: ${error.message}`,
        'UNKNOWN',
        error
      )
    }

    return new RSSError(
      `解析 Feed 失败: ${feedUrl}`,
      'UNKNOWN',
      error
    )
  }
}

// 导出单例
export const rssParser = new RSSParser()

// 导出便捷方法
export const parseRSS = (feedUrl: string, options?: FetchOptions) =>
  rssParser.parse(feedUrl, options)

export const parseRSSFromString = (xmlContent: string) =>
  rssParser.parseFromString(xmlContent)
