/**
 * Obsidian 服务
 *
 * 提供配置管理、模板处理、文章保存、批量操作、附件下载等功能
 *
 * @module services/obsidian-service
 */

import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db/index.js';
import { obsidianCore, ObsidianError } from '../lib/obsidian.js';
import { templateEngine } from '../lib/template-engine.js';
import type {
  ObsidianConfig,
  ObsidianVaultInfo,
  ObsidianSyncResult,
  ObsidianTemplateContext,
} from '@rss-reader/shared';

// 重新导出 ObsidianError 供路由使用
export { ObsidianError } from '../lib/obsidian.js';

/**
 * Obsidian 服务接口
 */
export interface IObsidianService {
  // 配置管理
  getConfig(): Promise<ObsidianConfig | null>;
  updateConfig(config: Partial<ObsidianConfig>): Promise<ObsidianConfig>;
  validateConfig(config: Partial<ObsidianConfig>): Promise<{ valid: boolean; error?: string }>;

  // Vault 操作
  getVaultInfo(): Promise<ObsidianVaultInfo>;
  getFolders(): Promise<string[]>;
  getTemplates(): Promise<TemplateInfo[]>;

  // 文章保存
  saveArticle(articleId: string, options?: SaveArticleOptions): Promise<SaveArticleResult>;
  batchSaveArticles(articleIds: string[], options?: SaveArticleOptions): Promise<BatchSaveResult>;

  // 附件处理
  downloadAttachment(url: string, fileName?: string): Promise<string>;
  downloadImages(imageUrls: string[]): Promise<string[]>;
}

/**
 * 保存文章选项
 */
export interface SaveArticleOptions {
  /** 自定义模板 ID */
  templateId?: string;
  /** 自定义文件夹 */
  folder?: string;
  /** 自定义文件名 */
  fileName?: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 是否下载图片 */
  downloadImages?: boolean;
  /** 额外标签 */
  additionalTags?: string[];
}

/**
 * 保存文章结果
 */
export interface SaveArticleResult {
  success: boolean;
  noteId?: string;
  filePath?: string;
  error?: string;
}

/**
 * 批量保存结果
 */
export interface BatchSaveResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    articleId: string;
    success: boolean;
    filePath?: string;
    error?: string;
  }>;
}

/**
 * 模板信息
 */
export interface TemplateInfo {
  id: string;
  name: string;
  path: string;
  content: string;
  isBuiltIn: boolean;
}

/**
 * Obsidian 服务实现
 */
export class ObsidianService implements IObsidianService {
  private config: ObsidianConfig | null = null;

  /**
   * 获取配置
   */
  async getConfig(): Promise<ObsidianConfig | null> {
    if (this.config) {
      return this.config;
    }

    // 从数据库获取配置（使用 UserPreference 表模拟配置存储）
    // 实际项目中可能需要单独的配置表
    try {
      // 这里简化处理，实际应该有专门的配置存储
      // 暂时从环境变量或默认配置获取
      const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '';
      if (!vaultPath) {
        return null;
      }

      this.config = {
        vaultPath,
        notesFolder: process.env.OBSIDIAN_NOTES_FOLDER || 'RSS-Reader',
        attachmentsFolder: process.env.OBSIDIAN_ATTACHMENTS_FOLDER || 'RSS-Reader/attachments',
        isEnabled: true,
        autoSync: false,
        syncInterval: 300,
        namingPattern: '{{date}}-{{title}}',
        downloadImages: true,
        useFrontMatter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return this.config;
    } catch (error) {
      console.error('获取 Obsidian 配置失败:', error);
      return null;
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<ObsidianConfig>): Promise<ObsidianConfig> {
    const currentConfig = await this.getConfig();
    const newConfig: ObsidianConfig = {
      ...currentConfig,
      ...config,
      vaultPath: config.vaultPath || currentConfig?.vaultPath || '',
      notesFolder: config.notesFolder || currentConfig?.notesFolder || 'RSS-Reader',
      isEnabled: config.isEnabled ?? currentConfig?.isEnabled ?? true,
      autoSync: config.autoSync ?? currentConfig?.autoSync ?? false,
      syncInterval: config.syncInterval ?? currentConfig?.syncInterval ?? 300,
      namingPattern: config.namingPattern || currentConfig?.namingPattern || '{{date}}-{{title}}',
      createdAt: currentConfig?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // 验证新配置
    const validation = await this.validateConfig(newConfig);
    if (!validation.valid) {
      throw new ObsidianError(`配置验证失败: ${validation.error}`, 'INVALID_CONFIG');
    }

    // 设置 Vault 路径
    obsidianCore.setVaultPath(newConfig.vaultPath);

    this.config = newConfig;
    return newConfig;
  }

  /**
   * 验证配置
   */
  async validateConfig(config: Partial<ObsidianConfig>): Promise<{ valid: boolean; error?: string }> {
    if (!config.vaultPath) {
      return { valid: false, error: 'Vault 路径不能为空' };
    }

    const validation = await obsidianCore.validateVaultPath(config.vaultPath);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    return { valid: true };
  }

  /**
   * 获取 Vault 信息
   */
  async getVaultInfo(): Promise<ObsidianVaultInfo> {
    const config = await this.getConfig();
    if (!config) {
      throw new ObsidianError('Obsidian 未配置', 'NOT_CONFIGURED');
    }

    obsidianCore.setVaultPath(config.vaultPath);
    const validation = await obsidianCore.validateVaultPath(config.vaultPath);

    if (!validation.valid) {
      throw new ObsidianError(`Vault 验证失败: ${validation.error}`, 'VALIDATION_FAILED');
    }

    // 扫描获取文件统计
    const files = await obsidianCore.scanFolder('', {
      recursive: true,
      includeHidden: false,
    });

    const notes = files.filter((f) => obsidianCore.isMarkdownFile(f.name));

    return {
      name: path.basename(config.vaultPath),
      path: config.vaultPath,
      totalFiles: files.length,
      totalNotes: notes.length,
      lastModified: new Date(Math.max(...files.map((f) => f.modifiedAt.getTime()))),
    };
  }

  /**
   * 获取文件夹列表
   */
  async getFolders(): Promise<string[]> {
    const config = await this.getConfig();
    if (!config) {
      throw new ObsidianError('Obsidian 未配置', 'NOT_CONFIGURED');
    }

    obsidianCore.setVaultPath(config.vaultPath);
    const files = await obsidianCore.scanFolder('', {
      recursive: true,
      includeHidden: false,
    });

    const folders = files
      .filter((f) => f.isDirectory)
      .map((f) => f.relativePath)
      .sort();

    return folders;
  }

  /**
   * 获取模板列表
   */
  async getTemplates(): Promise<TemplateInfo[]> {
    const config = await this.getConfig();
    const templates: TemplateInfo[] = [];

    // 内置模板
    templates.push({
      id: 'rss-article',
      name: 'RSS 文章模板',
      path: 'built-in://rss-article',
      content: this.getBuiltInTemplate('rss-article'),
      isBuiltIn: true,
    });

    templates.push({
      id: 'rss-inspiration',
      name: 'RSS 灵感模板',
      path: 'built-in://rss-inspiration',
      content: this.getBuiltInTemplate('rss-inspiration'),
      isBuiltIn: true,
    });

    templates.push({
      id: 'rss-daily',
      name: 'RSS 日报模板',
      path: 'built-in://rss-daily',
      content: this.getBuiltInTemplate('rss-daily'),
      isBuiltIn: true,
    });

    // 如果配置了 Vault，扫描自定义模板
    if (config?.vaultPath) {
      obsidianCore.setVaultPath(config.vaultPath);

      try {
        const templateFolder = path.join(config.notesFolder, 'templates');
        const exists = await obsidianCore.pathExists(obsidianCore.resolveSafePath(templateFolder));

        if (exists) {
          const templateFiles = await obsidianCore.scanFolder(templateFolder, {
            extensions: ['.md'],
            recursive: true,
          });

          for (const file of templateFiles) {
            try {
              const content = await obsidianCore.readFile(file.relativePath);
              templates.push({
                id: crypto.createHash('md5').update(file.relativePath).digest('hex').slice(0, 8),
                name: file.name.replace(/\.md$/, ''),
                path: file.relativePath,
                content,
                isBuiltIn: false,
              });
            } catch {
              // 跳过无法读取的模板
            }
          }
        }
      } catch {
        // 模板文件夹不存在，忽略
      }
    }

    return templates;
  }

  /**
   * 保存文章到 Obsidian
   */
  async saveArticle(
    articleId: string,
    options: SaveArticleOptions = {}
  ): Promise<SaveArticleResult> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, error: 'Obsidian 未配置' };
    }

    obsidianCore.setVaultPath(config.vaultPath);

    try {
      // 获取文章信息
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
          subscription: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!article) {
        return { success: false, error: '文章不存在' };
      }

      // 准备模板上下文
      const context = this.buildTemplateContext(article);

      // 获取模板
      const templateId = options.templateId || config.templateId || 'rss-article';
      const templates = await this.getTemplates();
      const template = templates.find((t) => t.id === templateId);

      if (!template) {
        return { success: false, error: '模板不存在' };
      }

      // 渲染模板
      const renderResult = templateEngine.render(template.content, {
        ...context.article,
        ...context.system,
        ...context.custom,
        // 兼容字段
        title: article.title,
        url: article.url,
        source: article.subscription.title,
        author: article.author || '未知',
        content: article.content || '',
        textContent: article.contentText || '',
        summary: article.summary || '',
        publishedAt: article.publishedAt,
        readTime: this.calculateReadTime(article.contentText || ''),
        qualityScore: 75, // 默认质量分数
        keyPoints: [], // 关键点
        relatedNotes: '',
        date: this.formatDate(context.system.date),
        time: this.formatTime(context.system.date),
        datetime: `${this.formatDate(context.system.date)} ${this.formatTime(context.system.date)}`,
      });

      if (!renderResult.success || !renderResult.content) {
        return { success: false, error: renderResult.error || '模板渲染失败' };
      }

      // 生成文件名
      const fileName = options.fileName || await this.generateFileName(article, config, options);
      const folder = options.folder || config.notesFolder;

      // 确保文件夹存在
      await obsidianCore.createFolder(folder);

      // 写入文件
      const filePath = path.join(folder, fileName);
      await obsidianCore.writeFile(filePath, renderResult.content, {
        createDir: true,
        overwrite: options.overwrite ?? false,
      });

      // 更新数据库记录
      const existingNote = await prisma.obsidianNote.findUnique({
        where: { articleId },
      });

      let noteId: string;
      if (existingNote) {
        await prisma.obsidianNote.update({
          where: { id: existingNote.id },
          data: {
            notePath: filePath,
            noteTitle: article.title,
            noteContent: renderResult.content,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
          },
        });
        noteId = existingNote.id;
      } else {
        const newNote = await prisma.obsidianNote.create({
          data: {
            articleId,
            notePath: filePath,
            noteTitle: article.title,
            noteContent: renderResult.content,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
          },
        });
        noteId = newNote.id;
      }

      return {
        success: true,
        noteId,
        filePath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * 批量保存文章
   */
  async batchSaveArticles(
    articleIds: string[],
    options: SaveArticleOptions = {}
  ): Promise<BatchSaveResult> {
    const results: BatchSaveResult['results'] = [];
    let success = 0;
    let failed = 0;

    for (const articleId of articleIds) {
      const result = await this.saveArticle(articleId, options);
      results.push({
        articleId,
        success: result.success,
        filePath: result.filePath,
        error: result.error,
      });

      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return {
      total: articleIds.length,
      success,
      failed,
      results,
    };
  }

  /**
   * 下载附件
   */
  async downloadAttachment(url: string, fileName?: string): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new ObsidianError('Obsidian 未配置', 'NOT_CONFIGURED');
    }

    if (!config.attachmentsFolder) {
      throw new ObsidianError('附件文件夹未配置', 'ATTACHMENTS_FOLDER_NOT_SET');
    }

    obsidianCore.setVaultPath(config.vaultPath);

    // 生成文件名
    const urlObj = new URL(url);
    const baseName = fileName || path.basename(urlObj.pathname) || `attachment-${Date.now()}`;
    const safeFileName = await obsidianCore.generateUniqueFileName(
      baseName.replace(/\.[^.]+$/, ''),
      config.attachmentsFolder,
      path.extname(baseName) || '.bin'
    );

    const filePath = path.join(config.attachmentsFolder, safeFileName);

    // 下载文件
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 确保文件夹存在
      await obsidianCore.createFolder(config.attachmentsFolder);

      // 写入文件
      const safePath = obsidianCore.resolveSafePath(filePath);
      const fs = await import('fs/promises');
      await fs.writeFile(safePath, buffer);

      return filePath;
    } catch (error) {
      throw new ObsidianError(
        `下载附件失败: ${error instanceof Error ? error.message : String(error)}`,
        'DOWNLOAD_ERROR',
        { url, originalError: error }
      );
    }
  }

  /**
   * 批量下载图片
   */
  async downloadImages(imageUrls: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const url of imageUrls) {
      try {
        const localPath = await this.downloadAttachment(url);
        results.push(localPath);
      } catch (error) {
        console.error(`下载图片失败: ${url}`, error);
        // 保留原 URL
        results.push(url);
      }
    }

    return results;
  }

  /**
   * 同步所有待同步的笔记
   */
  async syncNotes(): Promise<ObsidianSyncResult> {
    const config = await this.getConfig();
    if (!config) {
      throw new ObsidianError('Obsidian 未配置', 'NOT_CONFIGURED');
    }

    const pendingNotes = await prisma.obsidianNote.findMany({
      where: { syncStatus: 'pending' },
      include: { article: true },
    });

    const result: ObsidianSyncResult = {
      syncedAt: new Date(),
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    for (const note of pendingNotes) {
      try {
        const saveResult = await this.saveArticle(note.articleId);
        if (saveResult.success) {
          result.updated++;
        } else {
          result.errors++;
          result.errorDetails.push({
            articleId: note.articleId,
            error: saveResult.error || '同步失败',
          });
        }
      } catch (error) {
        result.errors++;
        result.errorDetails.push({
          articleId: note.articleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * 构建模板上下文
   */
  private buildTemplateContext(article: {
    id: string;
    title: string;
    content: string | null;
    contentText: string | null;
    summary: string | null;
    url: string;
    author: string | null;
    publishedAt: Date | null;
    subscription: {
      title: string;
      siteUrl: string | null;
      category: { name: string } | null;
    };
  }): ObsidianTemplateContext {
    const now = new Date();

    return {
      article: {
        id: article.id,
        title: article.title,
        content: article.content || '',
        summary: article.summary || undefined,
        originalUrl: article.url,
        author: article.author || undefined,
        publishedAt: article.publishedAt || now,
        tags: [],
        keywords: [],
        subscriptionName: article.subscription.title,
        subscriptionUrl: article.subscription.siteUrl || '',
        categoryName: article.subscription.category?.name || '',
      },
      system: {
        date: now,
        timestamp: now.getTime(),
        randomId: crypto.randomBytes(4).toString('hex'),
      },
      custom: {},
    };
  }

  /**
   * 生成文件名
   */
  private async generateFileName(
    article: { title: string; publishedAt: Date | null },
    config: ObsidianConfig,
    options: SaveArticleOptions
  ): Promise<string> {
    const context = {
      title: this.sanitizeFileName(article.title),
      date: this.formatDate(article.publishedAt || new Date()),
    };

    // 渲染命名模式
    const namePattern = options.fileName ? '{{fileName}}' : config.namingPattern;
    const renderResult = templateEngine.render(namePattern, {
      ...context,
      fileName: options.fileName ? this.sanitizeFileName(options.fileName) : context.title,
    });

    const baseName = renderResult.content || context.title;

    // 检查文件是否已存在，生成唯一文件名
    const folder = options.folder || config.notesFolder;
    return obsidianCore.generateUniqueFileName(baseName, folder, '.md');
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '-') // 移除非法字符
      .replace(/\s+/g, '-') // 空格转横线
      .replace(/-+/g, '-') // 多个横线合并
      .slice(0, 100) // 限制长度
      .replace(/^-|-$/g, ''); // 移除首尾横线
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * 计算阅读时间（分钟）
   */
  private calculateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * 获取内置模板
   */
  private getBuiltInTemplate(name: string): string {
    const templates: Record<string, string> = {
      'rss-article': `---
tags:
  - input
  - RSS
title: {{title}}
date: {{date}}
lastmod: {{date}}
source: {{source}}
author: {{author}}
url: {{url}}
read_time: {{readTime}}
quality_score: {{qualityScore}}
---

# {{title}}

## 摘要
{{summary}}

## 原文要点
{{#each keyPoints}}
- {{this}}
{{/each}}

## 我的思考
<!-- 在此记录你的思考 -->

## 原文链接
[{{title}}]({{url}})

## 相关笔记
{{relatedNotes}}
`,
      'rss-inspiration': `---
tags:
  - inspiration
  - RSS
title: 灵感 - {{title}}
date: {{date}}
source: {{source}}
url: {{url}}
---

# 灵感: {{title}}

## 来源
- 文章: [{{title}}]({{url}})
- 作者: {{author}}
- 来源: {{source}}

## 触发点
<!-- 记录是什么触发了你的灵感 -->

## 我的想法
<!-- 记录你的灵感和想法 -->

## 可能的应用
<!-- 这个灵感可以应用在什么地方 -->

## 相关资源
- [[{{title}}]]
`,
      'rss-daily': `---
tags:
  - daily
  - RSS
title: RSS 日报 - {{date}}
date: {{date}}
---

# RSS 日报 - {{date}}

## 今日概览
- 阅读文章数: {{totalArticles}}
- 收藏文章数: {{starredArticles}}
- 保存到 Obsidian: {{savedArticles}}

## 重点文章
{{#each articles}}
### {{title}}
- 来源: {{source}}
- 链接: [原文]({{url}})
- 摘要: {{summary}}

{{/each}}

## 今日收获
<!-- 记录今天的收获和感悟 -->

## 明日计划
<!-- 规划明天的阅读计划 -->
`,
    };

    return templates[name] || templates['rss-article'];
  }
}

// 导出单例实例
export const obsidianService = new ObsidianService();
