/**
 * RSS Feed 自动发现服务
 * 从网页 HTML 中发现 RSS/Atom 链接
 */

// ==================== 类型定义 ====================

export interface DiscoveredFeed {
  title: string
  url: string
  type: 'rss' | 'atom' | 'unknown'
  confidence: number // 0-1，发现的可信度
}

export interface DiscoveryResult {
  feeds: DiscoveredFeed[]
  pageUrl: string
  pageTitle: string | null
}

export class FeedDiscoveryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'FeedDiscoveryError'
  }
}

// ==================== Feed 发现类 ====================

class FeedDiscoveryService {
  // 常见的 RSS/Atom MIME 类型
  private static readonly FEED_TYPES = [
    'application/rss+xml',
    'application/atom+xml',
    'application/xml',
    'text/xml',
    'application/rdf+xml',
  ]

  // 常见的 feed 路径模式
  private static readonly COMMON_PATHS = [
    '/rss',
    '/rss.xml',
    '/feed',
    '/feed.xml',
    '/atom.xml',
    '/rss2.xml',
    '/index.xml',
    '/index.rss',
    '/atom',
    '/feeds/posts/default', // Blogger
    '/feed/atom', // WordPress
    '/?feed=rss', // WordPress
    '/?feed=atom', // WordPress
  ]

  /**
   * 从网页 URL 发现 RSS feeds
   */
  async discoverFromUrl(url: string): Promise<DiscoveryResult> {
    try {
      // 获取网页内容
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      })

      if (!response.ok) {
        throw new FeedDiscoveryError(
          `无法获取页面: HTTP ${response.status}`,
          'HTTP_ERROR'
        )
      }

      const html = await response.text()
      const finalUrl = response.url

      return this.discoverFromHtml(html, finalUrl)
    } catch (error) {
      if (error instanceof FeedDiscoveryError) {
        throw error
      }

      throw new FeedDiscoveryError(
        `发现 Feed 失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'DISCOVERY_ERROR',
        error
      )
    }
  }

  /**
   * 从 HTML 内容发现 RSS feeds
   */
  discoverFromHtml(html: string, baseUrl: string): DiscoveryResult {
    const feeds: DiscoveredFeed[] = []
    const foundUrls = new Set<string>()

    // 提取页面标题
    const pageTitle = this.extractPageTitle(html)

    // 方法 1: 从 <link> 标签发现
    const linkFeeds = this.discoverFromLinkTags(html, baseUrl)
    for (const feed of linkFeeds) {
      if (!foundUrls.has(feed.url)) {
        foundUrls.add(feed.url)
        feeds.push(feed)
      }
    }

    // 方法 2: 从 <a> 标签发现
    const anchorFeeds = this.discoverFromAnchorTags(html, baseUrl)
    for (const feed of anchorFeeds) {
      if (!foundUrls.has(feed.url)) {
        foundUrls.add(feed.url)
        feeds.push(feed)
      }
    }

    // 按可信度排序
    feeds.sort((a, b) => b.confidence - a.confidence)

    return {
      feeds,
      pageUrl: baseUrl,
      pageTitle,
    }
  }

  /**
   * 从 <link> 标签发现 feeds
   */
  private discoverFromLinkTags(html: string, baseUrl: string): DiscoveredFeed[] {
    const feeds: DiscoveredFeed[] = []

    // 匹配 <link> 标签
    const linkRegex = /<link[^>]*>/gi
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      const linkTag = match[0]

      // 提取属性
      const rel = this.extractAttribute(linkTag, 'rel')
      const type = this.extractAttribute(linkTag, 'type')?.toLowerCase()
      const href = this.extractAttribute(linkTag, 'href')
      const title = this.extractAttribute(linkTag, 'title')

      // 检查是否是 feed 链接
      if (
        href &&
        (this.isFeedType(type) || this.isFeedRel(rel))
      ) {
        const absoluteUrl = this.resolveUrl(href, baseUrl)
        if (absoluteUrl) {
          feeds.push({
            title: title || this.guessFeedTitle(href, type),
            url: absoluteUrl,
            type: this.determineFeedType(type, href),
            confidence: this.calculateLinkConfidence(rel, type, title),
          })
        }
      }
    }

    return feeds
  }

  /**
   * 从 <a> 标签发现 feeds
   */
  private discoverFromAnchorTags(html: string, baseUrl: string): DiscoveredFeed[] {
    const feeds: DiscoveredFeed[] = []

    // 匹配 <a> 标签
    const anchorRegex = /<a[^>]*>(.*?)<\/a>/gis
    let match

    while ((match = anchorRegex.exec(html)) !== null) {
      const anchorTag = match[0]
      const anchorText = match[1].replace(/<[^>]*>/g, '').trim()

      // 提取 href
      const href = this.extractAttribute(anchorTag, 'href')
      if (!href) continue

      // 检查是否可能是 feed 链接
      if (this.looksLikeFeedUrl(href, anchorText)) {
        const absoluteUrl = this.resolveUrl(href, baseUrl)
        if (absoluteUrl) {
          feeds.push({
            title: anchorText || this.guessFeedTitle(href, null),
            url: absoluteUrl,
            type: this.determineFeedType(null, href),
            confidence: 0.5, // <a> 标签的可信度较低
          })
        }
      }
    }

    return feeds
  }

  /**
   * 尝试常见路径发现 feeds
   */
  async discoverFromCommonPaths(baseUrl: string): Promise<DiscoveredFeed[]> {
    const feeds: DiscoveredFeed[] = []
    const base = new URL(baseUrl)

    // 并行检查所有常见路径
    const checks = FeedDiscoveryService.COMMON_PATHS.map(async (path) => {
      const testUrl = `${base.origin}${path}`
      try {
        const response = await fetch(testUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
          },
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          if (this.isFeedType(contentType)) {
            return {
              title: this.guessFeedTitle(path, contentType),
              url: testUrl,
              type: this.determineFeedType(contentType, path),
              confidence: 0.3, // 通过路径发现的可信度最低
            } as DiscoveredFeed
          }
        }
      } catch {
        // 忽略错误，继续检查下一个路径
      }
      return null
    })

    const results = await Promise.all(checks)
    for (const feed of results) {
      if (feed) {
        feeds.push(feed)
      }
    }

    return feeds
  }

  /**
   * 检查是否是 feed MIME 类型
   */
  private isFeedType(type: string | undefined | null): boolean {
    if (!type) return false
    const typeStr = type as string
    return FeedDiscoveryService.FEED_TYPES.some((feedType) =>
      typeStr.toLowerCase().includes(feedType)
    )
  }

  /**
   * 检查 rel 属性是否表示 feed
   */
  private isFeedRel(rel: string | undefined | null): boolean {
    if (!rel) return false
    const normalizedRel = rel.toLowerCase()
    return (
      normalizedRel === 'alternate' ||
      normalizedRel === 'feed' ||
      normalizedRel.includes('rss') ||
      normalizedRel.includes('atom')
    )
  }

  /**
   * 检查 URL 是否看起来像 feed
   */
  private looksLikeFeedUrl(url: string, anchorText: string): boolean {
    const urlLower = url.toLowerCase()
    const textLower = anchorText.toLowerCase()

    // 检查 URL 扩展名
    if (urlLower.endsWith('.rss') || urlLower.endsWith('.xml') || urlLower.endsWith('.atom')) {
      return true
    }

    // 检查 URL 路径
    if (
      urlLower.includes('/rss') ||
      urlLower.includes('/feed') ||
      urlLower.includes('/atom') ||
      urlLower.includes('feed=')
    ) {
      return true
    }

    // 检查锚文本
    if (
      textLower.includes('rss') ||
      textLower.includes('feed') ||
      textLower.includes('atom') ||
      textLower.includes('订阅') ||
      textLower.includes('rss订阅')
    ) {
      return true
    }

    return false
  }

  /**
   * 提取 HTML 属性
   */
  private extractAttribute(tag: string, attrName: string): string | undefined {
    // 匹配 attr="value" 或 attr='value'
    const regex = new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`, 'i')
    const match = tag.match(regex)
    return match ? match[1] : undefined
  }

  /**
   * 解析为绝对 URL
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      const base = new URL(baseUrl)
      const absolute = new URL(href, base)
      return absolute.href
    } catch {
      return null
    }
  }

  /**
   * 提取页面标题
   */
  private extractPageTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    return match ? match[1].trim() : null
  }

  /**
   * 推测 feed 标题
   */
  private guessFeedTitle(url: string, type: string | null | undefined): string {
    // 从 URL 推测
    if (url.includes('atom')) {
      return 'Atom Feed'
    }
    if (url.includes('rss')) {
      return 'RSS Feed'
    }
    if (url.includes('feed')) {
      return 'Feed'
    }

    // 从类型推测
    if (type?.includes('atom')) {
      return 'Atom Feed'
    }
    if (type?.includes('rss') || type?.includes('rdf')) {
      return 'RSS Feed'
    }

    return 'Unknown Feed'
  }

  /**
   * 确定 feed 类型
   */
  private determineFeedType(
    type: string | null | undefined,
    url: string
  ): 'rss' | 'atom' | 'unknown' {
    if (type) {
      if (type.includes('atom')) return 'atom'
      if (type.includes('rss') || type.includes('rdf')) return 'rss'
    }

    const urlLower = url.toLowerCase()
    if (urlLower.includes('atom')) return 'atom'
    if (urlLower.includes('rss')) return 'rss'

    return 'unknown'
  }

  /**
   * 计算 link 标签的可信度
   */
  private calculateLinkConfidence(
    rel: string | undefined,
    type: string | undefined,
    title: string | undefined
  ): number {
    let confidence = 0.5

    // 有明确的 feed MIME 类型
    if (this.isFeedType(type)) {
      confidence += 0.3
    }

    // 有 alternate rel
    if (rel?.toLowerCase() === 'alternate') {
      confidence += 0.1
    }

    // 有标题
    if (title) {
      confidence += 0.1
    }

    return Math.min(1, confidence)
  }
}

// 导出单例
export const feedDiscovery = new FeedDiscoveryService()

// 导出便捷方法
export const discoverFeeds = (url: string) => feedDiscovery.discoverFromUrl(url)
export const discoverFeedsFromHtml = (html: string, baseUrl: string) =>
  feedDiscovery.discoverFromHtml(html, baseUrl)
export const discoverFeedsFromCommonPaths = (baseUrl: string) =>
  feedDiscovery.discoverFromCommonPaths(baseUrl)
