/**
 * Obsidian 相关类型定义
 * @module types/obsidian
 */

/**
 * Obsidian 连接状态
 */
export type ObsidianConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

/**
 * Obsidian 配置接口
 *
 * 表示与 Obsidian 的连接和同步配置
 *
 * @example
 * ```typescript
 * const config: ObsidianConfig = {
 *   vaultPath: '/Users/username/Documents/MyVault',
 *   notesFolder: 'RSS-Reader',
 *   attachmentsFolder: 'RSS-Reader/attachments',
 *   isEnabled: true,
 *   autoSync: true,
 *   syncInterval: 300,
 *   templateId: 'tpl-001',
 *   namingPattern: '{{date}}-{{title}}',
 * };
 * ```
 */
export interface ObsidianConfig {
  /** Obsidian Vault 路径 */
  vaultPath: string;

  /** 笔记保存文件夹（相对于 Vault 根目录） */
  notesFolder: string;

  /** 附件保存文件夹（可选） */
  attachmentsFolder?: string;

  /** 是否启用 Obsidian 同步 */
  isEnabled: boolean;

  /** 是否自动同步 */
  autoSync: boolean;

  /** 自动同步间隔（秒） */
  syncInterval: number;

  /** 使用的模板 ID（可选） */
  templateId?: string;

  /** 笔记命名模式 */
  namingPattern: string;

  /** 是否下载图片到本地（可选） */
  downloadImages?: boolean;

  /** 是否添加 YAML Front Matter（可选） */
  useFrontMatter?: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * Obsidian 笔记接口
 *
 * 表示保存到 Obsidian 的笔记信息
 */
export interface ObsidianNote {
  /** 笔记唯一标识符 */
  id: string;

  /** 关联的文章 ID */
  articleId: string;

  /** 笔记文件名 */
  fileName: string;

  /** 笔记文件路径（相对于 Vault 根目录） */
  filePath: string;

  /** 笔记标题 */
  title: string;

  /** 笔记内容 */
  content: string;

  /** 标签列表 */
  tags: string[];

  /** YAML Front Matter（可选） */
  frontMatter?: Record<string, unknown>;

  /** 同步状态 */
  syncStatus: SyncStatus;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 最后同步时间（可选） */
  lastSyncedAt?: Date;
}

/**
 * 同步状态
 */
export type SyncStatus = 'pending' | 'synced' | 'error' | 'conflict';

/**
 * 创建 Obsidian 笔记请求接口
 */
export interface CreateObsidianNoteRequest {
  /** 文章 ID */
  articleId: string;

  /** 自定义标题（可选） */
  title?: string;

  /** 自定义内容（可选） */
  content?: string;

  /** 额外标签（可选） */
  additionalTags?: string[];

  /** 使用的模板 ID（可选） */
  templateId?: string;

  /** 自定义文件名（可选） */
  fileName?: string;
}

/**
 * 更新 Obsidian 笔记请求接口
 */
export interface UpdateObsidianNoteRequest {
  /** 笔记标题（可选） */
  title?: string;

  /** 笔记内容（可选） */
  content?: string;

  /** 标签列表（可选） */
  tags?: string[];

  /** Front Matter（可选） */
  frontMatter?: Record<string, unknown>;
}

/**
 * Obsidian 同步结果接口
 */
export interface ObsidianSyncResult {
  /** 同步时间 */
  syncedAt: Date;

  /** 新增笔记数 */
  created: number;

  /** 更新笔记数 */
  updated: number;

  /** 删除笔记数 */
  deleted: number;

  /** 跳过笔记数 */
  skipped: number;

  /** 错误数 */
  errors: number;

  /** 错误详情列表 */
  errorDetails: Array<{
    articleId: string;
    error: string;
  }>;
}

/**
 * Obsidian Vault 信息接口
 */
export interface ObsidianVaultInfo {
  /** Vault 名称 */
  name: string;

  /** Vault 路径 */
  path: string;

  /** 总文件数 */
  totalFiles: number;

  /** 总笔记数 */
  totalNotes: number;

  /** 可用空间（字节） */
  availableSpace?: number;

  /** 最后修改时间 */
  lastModified: Date;
}

/**
 * Obsidian 属性（Front Matter）定义接口
 */
export interface ObsidianProperty {
  /** 属性名称 */
  name: string;

  /** 属性类型 */
  type: 'text' | 'number' | 'checkbox' | 'date' | 'datetime' | 'aliases' | 'tags' | 'multitext';

  /** 默认值（可选） */
  defaultValue?: unknown;

  /** 是否必填 */
  required?: boolean;

  /** 属性描述（可选） */
  description?: string;
}

/**
 * Obsidian 链接类型
 */
export type ObsidianLinkType = 'internal' | 'external' | 'embed' | 'tag';

/**
 * Obsidian 双向链接接口
 */
export interface ObsidianLink {
  /** 源笔记路径 */
  sourcePath: string;

  /** 目标笔记路径或 URL */
  target: string;

  /** 链接类型 */
  type: ObsidianLinkType;

  /** 链接显示文本（可选） */
  displayText?: string;
}

/**
 * Obsidian 模板上下文接口
 *
 * 在模板渲染时提供的变量上下文
 */
export interface ObsidianTemplateContext {
  /** 文章信息 */
  article: {
    id: string;
    title: string;
    content: string;
    summary?: string;
    originalUrl: string;
    author?: string;
    publishedAt: Date;
    tags: string[];
    keywords: string[];
    subscriptionName: string;
    subscriptionUrl: string;
    categoryName: string;
  };

  /** 系统变量 */
  system: {
    date: Date;
    timestamp: number;
    randomId: string;
  };

  /** 自定义变量 */
  custom?: Record<string, unknown>;
}

/**
 * Obsidian 插件配置接口
 */
export interface ObsidianPluginConfig {
  /** 插件 ID */
  pluginId: string;

  /** 是否启用 */
  enabled: boolean;

  /** 插件特定配置 */
  settings?: Record<string, unknown>;
}
