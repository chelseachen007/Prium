/**
 * OPML 导入导出服务
 * 支持 OPML 1.0/2.0 格式
 * 使用正则表达式解析 XML，兼容 Node.js 环境
 */

// ==================== 类型定义 ====================

export interface OPMLFeed {
  title: string
  text: string // 显示文本，通常与 title 相同
  xmlUrl: string // feed URL
  htmlUrl?: string // 网站 URL
  type?: string // rss, atom, rdf 等
  description?: string
  category?: string // 分类名称
}

export interface OPMLCategory {
  title: string
  feeds: OPMLFeed[]
  subCategories?: OPMLCategory[]
}

export interface OPMLDocument {
  title: string
  dateCreated?: Date
  dateModified?: Date
  ownerName?: string
  ownerEmail?: string
  categories: OPMLCategory[]
  unCategorized: OPMLFeed[]
}

export interface ImportResult {
  success: boolean
  feeds: OPMLFeed[]
  categories: string[]
  errors: string[]
  totalFeeds: number
  importedFeeds: number
}

export class OPMLError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'OPMLError'
  }
}

// ==================== XML 解析工具 ====================

/**
 * 简单的 XML 解析器
 * 专门用于解析 OPML 格式
 */
class SimpleXMLParser {
  /**
   * 提取标签内容
   */
  static getTagContent(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
  }

  /**
   * 提取标签属性
   */
  static getAttributes(tagString: string): Record<string, string> {
    const attrs: Record<string, string> = {}
    const regex = /(\w+)\s*=\s*"([^"]*)"/g
    let match

    while ((match = regex.exec(tagString)) !== null) {
      attrs[match[1].toLowerCase()] = match[2]
    }

    return attrs
  }

  /**
   * 提取所有指定标签
   */
  static getTags(xml: string, tagName: string): string[] {
    const tags: string[] = []
    const regex = new RegExp(`<${tagName}[^>]*>`, 'gi')
    let match

    while ((match = regex.exec(xml)) !== null) {
      tags.push(match[0])
    }

    return tags
  }

  /**
   * 提取标签及其内容
   */
  static getTagWithContent(xml: string, tagName: string): { tag: string; content: string } | null {
    const regex = new RegExp(`<(${tagName})([^>]*)>([\\s\\S]*?)</\\1>`, 'i')
    const match = xml.match(regex)
    if (!match) return null

    return {
      tag: match[2] ? `<${match[1]}${match[2]}>` : `<${match[1]}>`,
      content: match[3],
    }
  }

  /**
   * 提取 head 部分
   */
  static getHead(xml: string): string | null {
    const match = xml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    return match ? match[1] : null
  }

  /**
   * 提取 body 部分
   */
  static getBody(xml: string): string | null {
    const match = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    return match ? match[1] : null
  }

  /**
   * 解析 outline 标签（包括嵌套）
   */
  static parseOutlines(xml: string): OutlineNode[] {
    const nodes: OutlineNode[] = []
    this.parseOutlineRecursive(xml, nodes)
    return nodes
  }

  private static parseOutlineRecursive(xml: string, nodes: OutlineNode[]): void {
    // 优先匹配包含内容的标签（非自闭合），然后匹配自闭合标签
    // 注意：需要先匹配有内容的，再匹配自闭合的
    const regex = /<outline([^>\/]*)>([\s\S]*?)<\/outline>|<outline([^>]*)\s*\/>/gi
    let match

    while ((match = regex.exec(xml)) !== null) {
      // match[1] 和 match[2] 来自第一个分支（有内容的标签）
      // match[3] 来自第二个分支（自闭合标签）
      const attrString = match[1] || match[3]
      const innerContent = match[2]

      if (attrString) {
        const attrs = this.getAttributes(`<outline ${attrString}>`)
        const node: OutlineNode = {
          attributes: attrs,
          children: [],
        }

        // 如果有内部内容，递归解析
        if (innerContent && innerContent.trim()) {
          this.parseOutlineRecursive(innerContent, node.children)
        }

        nodes.push(node)
      }
    }
  }
}

interface OutlineNode {
  attributes: Record<string, string>
  children: OutlineNode[]
}

// ==================== OPML 服务类 ====================

class OPMLService {
  /**
   * 解析 OPML 文件
   */
  parse(content: string): OPMLDocument {
    try {
      // 基本验证
      if (!content.includes('<opml') || !content.includes('</opml>')) {
        throw new OPMLError(
          '无效的 OPML 文件：缺少 opml 标签',
          'INVALID_FORMAT'
        )
      }

      // 获取 head 信息
      const headContent = SimpleXMLParser.getHead(content)
      const title = headContent
        ? SimpleXMLParser.getTagContent(headContent, 'title') || '未命名'
        : '未命名'

      const dateCreatedStr = headContent
        ? SimpleXMLParser.getTagContent(headContent, 'dateCreated')
        : null
      const dateModifiedStr = headContent
        ? SimpleXMLParser.getTagContent(headContent, 'dateModified')
        : null
      const ownerName = headContent
        ? SimpleXMLParser.getTagContent(headContent, 'ownerName') || undefined
        : undefined
      const ownerEmail = headContent
        ? SimpleXMLParser.getTagContent(headContent, 'ownerEmail') || undefined
        : undefined

      // 获取 body
      const bodyContent = SimpleXMLParser.getBody(content)
      if (!bodyContent) {
        throw new OPMLError(
          'OPML 文件缺少 body 部分',
          'INVALID_STRUCTURE'
        )
      }

      // 解析分类和订阅
      const outlineNodes = SimpleXMLParser.parseOutlines(bodyContent)
      const { categories, unCategorized } = this.parseOutlineNodes(outlineNodes)

      return {
        title,
        dateCreated: dateCreatedStr ? this.parseDate(dateCreatedStr) : undefined,
        dateModified: dateModifiedStr ? this.parseDate(dateModifiedStr) : undefined,
        ownerName,
        ownerEmail,
        categories,
        unCategorized,
      }
    } catch (error) {
      if (error instanceof OPMLError) {
        throw error
      }

      throw new OPMLError(
        `解析 OPML 失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'PARSE_ERROR',
        error
      )
    }
  }

  /**
   * 生成 OPML 文件
   */
  generate(document: OPMLDocument): string {
    const lines: string[] = []

    // XML 声明
    lines.push('<?xml version="1.0" encoding="UTF-8"?>')

    // OPML 声明
    lines.push('<opml version="2.0">')

    // Head 部分
    lines.push('  <head>')
    lines.push(`    <title>${this.escapeXml(document.title)}</title>`)

    if (document.dateCreated) {
      lines.push(`    <dateCreated>${this.formatDate(document.dateCreated)}</dateCreated>`)
    }

    lines.push(`    <dateModified>${this.formatDate(new Date())}</dateModified>`)

    if (document.ownerName) {
      lines.push(`    <ownerName>${this.escapeXml(document.ownerName)}</ownerName>`)
    }

    if (document.ownerEmail) {
      lines.push(`    <ownerEmail>${this.escapeXml(document.ownerEmail)}</ownerEmail>`)
    }

    lines.push('  </head>')

    // Body 部分
    lines.push('  <body>')

    // 分类订阅
    for (const category of document.categories) {
      lines.push(this.generateCategoryOutline(category, 2))
    }

    // 未分类订阅
    for (const feed of document.unCategorized) {
      lines.push(this.generateFeedOutline(feed, 2))
    }

    lines.push('  </body>')
    lines.push('</opml>')

    return lines.join('\n')
  }

  /**
   * 从订阅数据生成 OPML
   */
  generateFromSubscriptions(
    subscriptions: Array<{
      title: string
      feedUrl: string
      siteUrl?: string | null
      description?: string | null
      category?: {
        name: string
      } | null
    }>,
    options: {
      title?: string
      ownerName?: string
      ownerEmail?: string
    } = {}
  ): string {
    // 按分类分组
    const categoryMap = new Map<string, OPMLFeed[]>()
    const unCategorized: OPMLFeed[] = []

    for (const sub of subscriptions) {
      const feed: OPMLFeed = {
        title: sub.title,
        text: sub.title,
        xmlUrl: sub.feedUrl,
        htmlUrl: sub.siteUrl || undefined,
        description: sub.description || undefined,
      }

      if (sub.category) {
        const feeds = categoryMap.get(sub.category.name) || []
        feeds.push(feed)
        categoryMap.set(sub.category.name, feeds)
      } else {
        unCategorized.push(feed)
      }
    }

    // 构建 categories
    const categories: OPMLCategory[] = []
    for (const [name, feeds] of categoryMap) {
      categories.push({
        title: name,
        feeds,
      })
    }

    return this.generate({
      title: options.title || 'RSS 订阅',
      ownerName: options.ownerName,
      ownerEmail: options.ownerEmail,
      categories,
      unCategorized,
    })
  }

  /**
   * 导入 OPML 并返回结果
   */
  import(content: string): ImportResult {
    const errors: string[] = []
    const feeds: OPMLFeed[] = []
    const categoryNames = new Set<string>()

    try {
      const document = this.parse(content)

      // 收集所有分类名称
      const collectCategories = (categories: OPMLCategory[]) => {
        for (const cat of categories) {
          categoryNames.add(cat.title)
          feeds.push(...cat.feeds)
          if (cat.subCategories) {
            collectCategories(cat.subCategories)
          }
        }
      }

      collectCategories(document.categories)

      // 添加未分类的订阅
      feeds.push(...document.unCategorized)

      // 验证 feeds
      const validFeeds = feeds.filter((feed) => {
        if (!feed.xmlUrl) {
          errors.push(`订阅 "${feed.title}" 缺少 XML URL`)
          return false
        }
        if (!this.isValidUrl(feed.xmlUrl)) {
          errors.push(`订阅 "${feed.title}" 的 URL 无效: ${feed.xmlUrl}`)
          return false
        }
        return true
      })

      return {
        success: true,
        feeds: validFeeds,
        categories: Array.from(categoryNames),
        errors,
        totalFeeds: feeds.length,
        importedFeeds: validFeeds.length,
      }
    } catch (error) {
      if (error instanceof OPMLError) {
        return {
          success: false,
          feeds: [],
          categories: [],
          errors: [error.message],
          totalFeeds: 0,
          importedFeeds: 0,
        }
      }

      return {
        success: false,
        feeds: [],
        categories: [],
        errors: [`导入失败: ${error instanceof Error ? error.message : '未知错误'}`],
        totalFeeds: 0,
        importedFeeds: 0,
      }
    }
  }

  /**
   * 解析 outline 节点
   */
  private parseOutlineNodes(nodes: OutlineNode[]): {
    categories: OPMLCategory[]
    unCategorized: OPMLFeed[]
  } {
    const categories: OPMLCategory[] = []
    const unCategorized: OPMLFeed[] = []

    for (const node of nodes) {
      const xmlUrl = node.attributes['xmlurl']

      if (xmlUrl) {
        // 这是一个 feed
        unCategorized.push(this.parseFeedNode(node))
      } else {
        // 这是一个分类
        const category = this.parseCategoryNode(node)
        if (category.feeds.length > 0 || category.subCategories?.length) {
          categories.push(category)
        }
      }
    }

    return { categories, unCategorized }
  }

  /**
   * 解析 feed 节点
   */
  private parseFeedNode(node: OutlineNode): OPMLFeed {
    return {
      title: node.attributes['title'] || node.attributes['text'] || '未命名',
      text: node.attributes['text'] || node.attributes['title'] || '未命名',
      xmlUrl: node.attributes['xmlurl'] || '',
      htmlUrl: node.attributes['htmlurl'] || undefined,
      type: node.attributes['type'] || undefined,
      description: node.attributes['description'] || undefined,
    }
  }

  /**
   * 解析分类节点
   */
  private parseCategoryNode(node: OutlineNode): OPMLCategory {
    const title = node.attributes['text'] || node.attributes['title'] || '未分类'
    const feeds: OPMLFeed[] = []
    const subCategories: OPMLCategory[] = []

    for (const child of node.children) {
      const xmlUrl = child.attributes['xmlurl']

      if (xmlUrl) {
        feeds.push(this.parseFeedNode(child))
      } else {
        // 嵌套分类
        const subCategory = this.parseCategoryNode(child)
        if (subCategory.feeds.length > 0) {
          subCategories.push(subCategory)
        }
      }
    }

    return {
      title,
      feeds,
      subCategories: subCategories.length > 0 ? subCategories : undefined,
    }
  }

  /**
   * 生成分类 outline
   */
  private generateCategoryOutline(category: OPMLCategory, indent: number): string {
    const lines: string[] = []
    const spaces = '  '.repeat(indent)

    lines.push(`${spaces}<outline text="${this.escapeXml(category.title)}">`)

    // 添加子分类
    if (category.subCategories) {
      for (const subCat of category.subCategories) {
        lines.push(this.generateCategoryOutline(subCat, indent + 1))
      }
    }

    // 添加 feeds
    for (const feed of category.feeds) {
      lines.push(this.generateFeedOutline(feed, indent + 1))
    }

    lines.push(`${spaces}</outline>`)

    return lines.join('\n')
  }

  /**
   * 生成 feed outline
   */
  private generateFeedOutline(feed: OPMLFeed, indent: number): string {
    const spaces = '  '.repeat(indent)
    const attrs: string[] = []

    attrs.push(`text="${this.escapeXml(feed.text || feed.title)}"`)
    attrs.push(`title="${this.escapeXml(feed.title)}"`)

    if (feed.xmlUrl) {
      attrs.push(`xmlUrl="${this.escapeXml(feed.xmlUrl)}"`)
    }

    if (feed.htmlUrl) {
      attrs.push(`htmlUrl="${this.escapeXml(feed.htmlUrl)}"`)
    }

    if (feed.type) {
      attrs.push(`type="${this.escapeXml(feed.type)}"`)
    }

    if (feed.description) {
      attrs.push(`description="${this.escapeXml(feed.description)}"`)
    }

    return `${spaces}<outline ${attrs.join(' ')} />`
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateStr?: string | null): Date | undefined {
    if (!dateStr) return undefined

    // RFC 822 格式 (OPML 标准)
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }

    return undefined
  }

  /**
   * 格式化日期为 RFC 822 格式
   */
  private formatDate(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const day = days[date.getUTCDay()]
    const dayOfMonth = String(date.getUTCDate()).padStart(2, '0')
    const month = months[date.getUTCMonth()]
    const year = date.getUTCFullYear()
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')

    return `${day}, ${dayOfMonth} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`
  }

  /**
   * 转义 XML 特殊字符
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * 验证 URL 是否有效
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }
}

// 导出单例
export const opmlService = new OPMLService()

// 导出便捷方法
export const parseOPML = (content: string) => opmlService.parse(content)
export const generateOPML = (document: OPMLDocument) => opmlService.generate(document)
export const importOPML = (content: string) => opmlService.import(content)
