/**
 * RSS 解析 Composable
 * @module composables/useRSSParser
 */

import { ref } from 'vue'
import type { ParsedArticle } from '@/types'

interface RSSChannel {
  title: string
  description?: string
  link?: string
  imageUrl?: string
}

interface ParseResult {
  channel: RSSChannel
  articles: ParsedArticle[]
}

/**
 * RSS 解析器
 *
 * 通过 Edge Function 代理获取 RSS，在客户端解析
 */
export function useRSSParser() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取并解析 RSS Feed
   */
  async function parseFeed(feedUrl: string): Promise<ParseResult | null> {
    isLoading.value = true
    error.value = null

    try {
      // 通过 Edge Function 代理获取 RSS
      const response = await fetch(
        `/api/proxy/rss?url=${encodeURIComponent(feedUrl)}`
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP error: ${response.status}`)
      }

      const xmlText = await response.text()
      return parseXML(xmlText)
    } catch (e) {
      const message = e instanceof Error ? e.message : '解析 RSS 失败'
      error.value = message
      console.error('解析 RSS 失败:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 解析 XML 为结构化数据
   */
  function parseXML(xmlText: string): ParseResult {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'application/xml')

    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error('XML 解析错误')
    }

    // 判断是 RSS 还是 Atom
    const isAtom = doc.querySelector('feed') !== null

    if (isAtom) {
      return parseAtom(doc)
    } else {
      return parseRSS(doc)
    }
  }

  /**
   * 解析 RSS 2.0 格式
   */
  function parseRSS(doc: Document): ParseResult {
    const channel = doc.querySelector('channel')

    // 解析频道信息
    const channelInfo: RSSChannel = {
      title: channel?.querySelector('title')?.textContent || '',
      description: channel?.querySelector('description')?.textContent || undefined,
      link: channel?.querySelector('link')?.textContent || undefined,
      imageUrl:
        channel?.querySelector('image url')?.textContent ||
        channel?.querySelector('image')?.getAttribute('url') ||
        undefined,
    }

    // 解析文章列表
    const items = channel?.querySelectorAll('item') || []
    const articles: ParsedArticle[] = []

    items.forEach((item) => {
      const article = parseRSSItem(item)
      if (article) {
        articles.push(article)
      }
    })

    return { channel: channelInfo, articles }
  }

  /**
   * 解析单个 RSS item
   */
  function parseRSSItem(item: Element): ParsedArticle | null {
    const title = item.querySelector('title')?.textContent || ''
    const link =
      item.querySelector('link')?.textContent ||
      item.querySelector('link')?.getAttribute('href') ||
      ''
    const description =
      item.querySelector('description')?.textContent || ''

    // 获取完整内容
    const content =
      item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0]?.textContent ||
      description

    // 发布时间
    const publishedAt =
      item.querySelector('pubDate')?.textContent ||
      item.querySelector('published')?.textContent ||
      undefined

    // 作者
    const author =
      item.querySelector('author')?.textContent ||
      item.querySelector('creator')?.textContent ||
      undefined

    // 图片
    const imageUrl = extractImage(item, content)

    if (!link) return null

    return {
      title,
      content: cleanContent(content),
      url: link,
      description: cleanDescription(description),
      imageUrl,
      author,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
    }
  }

  /**
   * 解析 Atom 格式
   */
  function parseAtom(doc: Document): ParseResult {
    const feed = doc.querySelector('feed')

    // 解析频道信息
    const channelInfo: RSSChannel = {
      title: feed?.querySelector('title')?.textContent || '',
      description: feed?.querySelector('subtitle')?.textContent || undefined,
      link:
        feed?.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
        feed?.querySelector('link:not([rel])')?.getAttribute('href') ||
        undefined,
      imageUrl:
        feed?.querySelector('icon')?.textContent ||
        feed?.querySelector('logo')?.textContent ||
        undefined,
    }

    // 解析文章列表
    const entries = feed?.querySelectorAll('entry') || []
    const articles: ParsedArticle[] = []

    entries.forEach((entry) => {
      const article = parseAtomEntry(entry)
      if (article) {
        articles.push(article)
      }
    })

    return { channel: channelInfo, articles }
  }

  /**
   * 解析单个 Atom entry
   */
  function parseAtomEntry(entry: Element): ParsedArticle | null {
    const title = entry.querySelector('title')?.textContent || ''

    // 获取链接
    const linkEl =
      entry.querySelector('link[rel="alternate"]') ||
      entry.querySelector('link:not([rel])')
    const link = linkEl?.getAttribute('href') || ''

    // 内容
    const content =
      entry.querySelector('content')?.textContent ||
      entry.querySelector('summary')?.textContent ||
      ''

    const description = entry.querySelector('summary')?.textContent || ''

    // 发布时间
    const publishedAt =
      entry.querySelector('published')?.textContent ||
      entry.querySelector('updated')?.textContent ||
      undefined

    // 作者
    const author = entry.querySelector('author name')?.textContent || undefined

    // 图片
    const imageUrl = extractImage(entry, content)

    if (!link) return null

    return {
      title,
      content: cleanContent(content),
      url: link,
      description: cleanDescription(description),
      imageUrl,
      author,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
    }
  }

  /**
   * 从元素或内容中提取图片
   */
  function extractImage(item: Element, content: string): string | undefined {
    // 尝试从 media:content 获取
    const mediaContent = item.querySelector('media\\:content, content')
    if (mediaContent?.getAttribute('url')) {
      return mediaContent.getAttribute('url') || undefined
    }

    // 尝试从 media:thumbnail 获取
    const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail')
    if (mediaThumbnail?.getAttribute('url')) {
      return mediaThumbnail.getAttribute('url') || undefined
    }

    // 尝试从 enclosure 获取
    const enclosure = item.querySelector('enclosure[type^="image"]')
    if (enclosure?.getAttribute('url')) {
      return enclosure.getAttribute('url') || undefined
    }

    // 从内容中提取第一张图片
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch) {
      return imgMatch[1]
    }

    return undefined
  }

  /**
   * 清理 HTML 内容
   */
  function cleanContent(content: string): string {
    // 移除脚本和样式
    let cleaned = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    // 解码 HTML 实体
    const textarea = document.createElement('textarea')
    textarea.innerHTML = cleaned
    cleaned = textarea.value

    return cleaned.trim()
  }

  /**
   * 清理描述文本
   */
  function cleanDescription(description: string): string {
    // 移除 HTML 标签
    let cleaned = description.replace(/<[^>]*>/g, '')

    // 解码 HTML 实体
    const textarea = document.createElement('textarea')
    textarea.innerHTML = cleaned
    cleaned = textarea.value

    // 截断过长的描述
    if (cleaned.length > 300) {
      cleaned = cleaned.substring(0, 297) + '...'
    }

    return cleaned.trim()
  }

  /**
   * 验证 RSS URL 是否有效
   */
  async function validateFeed(feedUrl: string): Promise<{
    valid: boolean
    title?: string
    error?: string
  }> {
    const result = await parseFeed(feedUrl)

    if (!result) {
      return { valid: false, error: error.value || '无法解析 RSS' }
    }

    if (!result.articles.length) {
      return { valid: false, error: 'RSS 中没有找到文章' }
    }

    return {
      valid: true,
      title: result.channel.title,
    }
  }

  return {
    isLoading,
    error,
    parseFeed,
    validateFeed,
  }
}
