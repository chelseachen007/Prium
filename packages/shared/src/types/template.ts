/**
 * 模板变量相关类型定义
 * @module types/template
 */

/**
 * 模板变量类型枚举
 */
export type TemplateVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object';

/**
 * 模板变量定义接口
 *
 * 表示模板中可用的变量定义
 *
 * @example
 * ```typescript
 * const variable: TemplateVariable = {
 *   name: 'title',
 *   type: 'string',
 *   description: '文章标题',
 *   required: true,
 *   defaultValue: '',
 *   example: 'TypeScript 入门教程',
 * };
 * ```
 */
export interface TemplateVariable {
  /** 变量名称 */
  name: string;

  /** 变量类型 */
  type: TemplateVariableType;

  /** 变量描述 */
  description: string;

  /** 是否必填 */
  required: boolean;

  /** 默认值（可选） */
  defaultValue?: unknown;

  /** 示例值（可选） */
  example?: unknown;

  /** 验证规则（可选） */
  validation?: {
    /** 最小长度（字符串/数组） */
    minLength?: number;
    /** 最大长度（字符串/数组） */
    maxLength?: number;
    /** 最小值（数字） */
    min?: number;
    /** 最大值（数字） */
    max?: number;
    /** 正则表达式（字符串） */
    pattern?: string;
    /** 枚举值 */
    enum?: unknown[];
  };

  /** 嵌套变量（当类型为 object 或 array 时，可选） */
  nestedVariables?: TemplateVariable[];
}

/**
 * 模板接口
 *
 * 表示一个完整的模板定义
 *
 * @example
 * ```typescript
 * const template: Template = {
 *   id: 'tpl-001',
 *   name: '默认文章模板',
 *   description: '用于保存文章到 Obsidian 的默认模板',
 *   content: '# {{title}}\n\n{{content}}\n\n> 来源: {{originalUrl}}',
 *   variables: defaultVariables,
 *   category: 'article',
 *   isBuiltIn: false,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface Template {
  /** 模板唯一标识符 */
  id: string;

  /** 模板名称 */
  name: string;

  /** 模板描述（可选） */
  description?: string;

  /** 模板内容（包含变量占位符） */
  content: string;

  /** 变量定义列表 */
  variables: TemplateVariable[];

  /** 模板分类 */
  category: TemplateCategory;

  /** 是否为内置模板 */
  isBuiltIn: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 模板分类
 */
export type TemplateCategory = 'article' | 'daily' | 'weekly' | 'custom';

/**
 * 创建模板请求接口
 */
export interface CreateTemplateRequest {
  /** 模板名称 */
  name: string;

  /** 模板描述（可选） */
  description?: string;

  /** 模板内容 */
  content: string;

  /** 变量定义列表（可选） */
  variables?: TemplateVariable[];

  /** 模板分类（可选，默认 'custom'） */
  category?: TemplateCategory;
}

/**
 * 更新模板请求接口
 */
export interface UpdateTemplateRequest {
  /** 模板名称（可选） */
  name?: string;

  /** 模板描述（可选） */
  description?: string;

  /** 模板内容（可选） */
  content?: string;

  /** 变量定义列表（可选） */
  variables?: TemplateVariable[];

  /** 模板分类（可选） */
  category?: TemplateCategory;
}

/**
 * 模板渲染上下文接口
 *
 * 表示模板渲染时提供的变量值
 */
export interface TemplateRenderContext {
  /** 变量值映射 */
  variables: Record<string, unknown>;

  /** 渲染选项 */
  options?: TemplateRenderOptions;
}

/**
 * 模板渲染选项接口
 */
export interface TemplateRenderOptions {
  /** 是否转义 HTML（默认 true） */
  escapeHtml?: boolean;

  /** 日期格式（默认 'YYYY-MM-DD'） */
  dateFormat?: string;

  /** 时间格式（默认 'HH:mm:ss'） */
  timeFormat?: string;

  /** 自定义分隔符（默认 ['{{', '}}']） */
  delimiters?: [string, string];

  /** 是否移除未填充的变量（默认 false） */
  removeUnfilled?: boolean;

  /** 未填充变量的占位符（可选） */
  unfilledPlaceholder?: string;
}

/**
 * 模板渲染结果接口
 */
export interface TemplateRenderResult {
  /** 是否成功 */
  success: boolean;

  /** 渲染后的内容（成功时） */
  content?: string;

  /** 错误信息（失败时） */
  error?: string;

  /** 未填充的变量列表 */
  unfilledVariables?: string[];

  /** 渲染警告 */
  warnings?: string[];
}

/**
 * 模板变量分组接口
 *
 * 用于组织和展示模板变量
 */
export interface TemplateVariableGroup {
  /** 分组名称 */
  name: string;

  /** 分组描述（可选） */
  description?: string;

  /** 分组内的变量列表 */
  variables: TemplateVariable[];
}

/**
 * 内置模板变量常量
 *
 * 所有模板都可用的系统变量
 */
export const BUILT_IN_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: 'date',
    type: 'date',
    description: '当前日期',
    required: false,
    example: '2024-01-15',
  },
  {
    name: 'time',
    type: 'string',
    description: '当前时间',
    required: false,
    example: '14:30:00',
  },
  {
    name: 'datetime',
    type: 'date',
    description: '当前日期时间',
    required: false,
    example: '2024-01-15 14:30:00',
  },
  {
    name: 'timestamp',
    type: 'number',
    description: 'Unix 时间戳（毫秒）',
    required: false,
    example: 1705303800000,
  },
  {
    name: 'randomId',
    type: 'string',
    description: '随机生成的唯一标识符',
    required: false,
    example: 'a1b2c3d4',
  },
  {
    name: 'uuid',
    type: 'string',
    description: 'UUID v4',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  },
];

/**
 * 文章相关模板变量
 */
export const ARTICLE_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: 'id',
    type: 'string',
    description: '文章唯一标识符',
    required: true,
  },
  {
    name: 'title',
    type: 'string',
    description: '文章标题',
    required: true,
  },
  {
    name: 'content',
    type: 'string',
    description: '文章内容（HTML 格式）',
    required: false,
  },
  {
    name: 'textContent',
    type: 'string',
    description: '文章纯文本内容',
    required: false,
  },
  {
    name: 'summary',
    type: 'string',
    description: '文章摘要',
    required: false,
  },
  {
    name: 'originalUrl',
    type: 'string',
    description: '原文链接',
    required: true,
  },
  {
    name: 'author',
    type: 'string',
    description: '文章作者',
    required: false,
  },
  {
    name: 'publishedAt',
    type: 'date',
    description: '发布日期',
    required: false,
  },
  {
    name: 'readTime',
    type: 'number',
    description: '预估阅读时间（分钟）',
    required: false,
  },
  {
    name: 'subscriptionName',
    type: 'string',
    description: '订阅源名称',
    required: true,
  },
  {
    name: 'subscriptionUrl',
    type: 'string',
    description: '订阅源地址',
    required: true,
  },
  {
    name: 'categoryName',
    type: 'string',
    description: '分类名称',
    required: false,
  },
  {
    name: 'tags',
    type: 'array',
    description: '标签列表',
    required: false,
    nestedVariables: [
      { name: 'item', type: 'string', description: '标签名称', required: true },
    ],
  },
  {
    name: 'keywords',
    type: 'array',
    description: '关键词列表',
    required: false,
    nestedVariables: [
      { name: 'item', type: 'string', description: '关键词', required: true },
    ],
  },
];

/**
 * 模板验证结果接口
 */
export interface TemplateValidationResult {
  /** 是否有效 */
  valid: boolean;

  /** 错误列表 */
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;

  /** 警告列表 */
  warnings: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;

  /** 使用的变量列表 */
  usedVariables: string[];

  /** 未定义的变量列表 */
  undefinedVariables: string[];
}
