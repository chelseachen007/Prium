/**
 * 过滤规则相关类型定义
 * @module types/filter
 */

/**
 * 过滤动作类型
 */
export type FilterAction =
  | 'markRead'      // 标记为已读
  | 'markStarred'   // 标记为收藏
  | 'addTag'        // 添加标签
  | 'highlight'     // 高亮标记
  | 'pushToInstapaper' // 推送到 Instapaper
  | 'pushToNotion'  // 推送到 Notion
  | 'delete';       // 删除/跳过

/**
 * 过滤范围类型
 */
export type FilterScope = 'global' | 'category' | 'subscription';

/**
 * 过滤字段类型
 */
export type FilterField = 'title' | 'content' | 'author' | 'url';

/**
 * 匹配条件类型
 */
export type MatchCondition =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan';

/**
 * 过滤规则接口
 *
 * 用于定义文章的自动过滤规则
 *
 * @example
 * ```typescript
 * const filter: FilterRule = {
 *   id: 'filter-001',
 *   name: '排除广告文章',
 *   field: 'title',
 *   condition: 'contains',
 *   pattern: '广告',
 *   action: 'markRead',
 *   isEnabled: true,
 *   priority: 10,
 *   scope: 'global',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface FilterRule {
  /** 规则唯一标识符 */
  id: string;

  /** 用户ID */
  userId: string;

  /** 规则名称 */
  name: string;

  /** 规则描述（可选） */
  description?: string;

  /** 是否启用 */
  isEnabled: boolean;

  /** 优先级（数值越大优先级越高） */
  priority: number;

  /** 过滤字段 */
  field: FilterField;

  /** 匹配条件 */
  condition: MatchCondition;

  /** 匹配模式/值 */
  pattern: string;

  /** 是否区分大小写 */
  caseSensitive: boolean;

  /** 执行动作 */
  action: FilterAction;

  /** 动作值（如标签名） */
  actionValue?: string;

  /** 过滤范围 */
  scope: FilterScope;

  /** 应用的订阅 ID 列表 */
  subscriptionIds?: string[];

  /** 应用的分类 ID 列表 */
  categoryIds?: string[];

  /** 匹配次数 */
  matchCount: number;

  /** 最后匹配时间 */
  lastMatchedAt?: Date;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建过滤规则请求接口
 */
export interface CreateFilterRuleRequest {
  /** 规则名称 */
  name: string;

  /** 规则描述（可选） */
  description?: string;

  /** 是否启用（可选，默认 true） */
  isEnabled?: boolean;

  /** 优先级（可选，默认 0） */
  priority?: number;

  /** 过滤字段 */
  field: FilterField;

  /** 匹配条件 */
  condition: MatchCondition;

  /** 匹配模式/值 */
  pattern: string;

  /** 是否区分大小写（可选，默认 false） */
  caseSensitive?: boolean;

  /** 执行动作 */
  action: FilterAction;

  /** 动作值（可选） */
  actionValue?: string;

  /** 过滤范围（可选，默认 global） */
  scope?: FilterScope;

  /** 应用的订阅 ID 列表（可选） */
  subscriptionIds?: string[];

  /** 应用的分类 ID 列表（可选） */
  categoryIds?: string[];
}

/**
 * 更新过滤规则请求接口
 */
export interface UpdateFilterRuleRequest {
  /** 规则名称（可选） */
  name?: string;

  /** 规则描述（可选） */
  description?: string;

  /** 是否启用（可选） */
  isEnabled?: boolean;

  /** 优先级（可选） */
  priority?: number;

  /** 过滤字段（可选） */
  field?: FilterField;

  /** 匹配条件（可选） */
  condition?: MatchCondition;

  /** 匹配模式/值（可选） */
  pattern?: string;

  /** 是否区分大小写（可选） */
  caseSensitive?: boolean;

  /** 执行动作（可选） */
  action?: FilterAction;

  /** 动作值（可选） */
  actionValue?: string;

  /** 过滤范围（可选） */
  scope?: FilterScope;

  /** 应用的订阅 ID 列表（可选） */
  subscriptionIds?: string[];

  /** 应用的分类 ID 列表（可选） */
  categoryIds?: string[];
}

/**
 * 过滤上下文接口
 * 传递给过滤服务的文章信息
 */
export interface FilterContext {
  /** 文章标题 */
  title: string;

  /** 文章内容 */
  content?: string;

  /** 文章纯文本内容 */
  contentText?: string;

  /** 文章作者 */
  author?: string;

  /** 文章 URL */
  url: string;

  /** 订阅 ID */
  subscriptionId: string;

  /** 分类 ID */
  categoryId?: string;
}

/**
 * 过滤结果动作接口
 */
export interface FilterResultAction {
  /** 动作类型 */
  action: FilterAction;

  /** 动作值 */
  value?: string;

  /** 匹配的规则 ID */
  ruleId: string;

  /** 规则名称 */
  ruleName: string;
}

/**
 * 过滤结果接口
 *
 * 表示对文章应用过滤规则后的结果
 */
export interface FilterResult {
  /** 是否应该跳过创建（delete 动作） */
  shouldSkip: boolean;

  /** 初始已读状态 */
  isRead: boolean;

  /** 初始收藏状态 */
  isStarred: boolean;

  /** 初始高亮状态 */
  isHighlighted: boolean;

  /** 标签列表 */
  tags: string[];

  /** 匹配的规则 ID 列表 */
  matchedRuleIds: string[];

  /** 需要外部推送的动作 */
  externalActions: FilterResultAction[];

  /** 是否被过滤规则处理过 */
  isFiltered: boolean;
}

/**
 * 过滤规则统计接口
 */
export interface FilterRuleStats {
  /** 规则 ID */
  ruleId: string;

  /** 匹配次数 */
  matchCount: number;

  /** 最后匹配时间 */
  lastMatchedAt?: Date;
}

/**
 * 外部服务类型
 */
export type ExternalServiceType = 'instapaper' | 'notion' | 'pocket';

/**
 * Instapaper 配置接口
 */
export interface InstapaperConfig {
  username: string;
  password: string;
}

/**
 * Notion 配置接口
 */
export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

/**
 * Pocket 配置接口
 */
export interface PocketConfig {
  consumerKey: string;
  accessToken: string;
}

/**
 * 外部服务配置接口
 */
export interface ExternalServiceConfig {
  /** 服务 ID */
  id: string;

  /** 用户 ID */
  userId: string;

  /** 服务类型 */
  serviceType: ExternalServiceType;

  /** 服务名称 */
  name: string;

  /** 是否启用 */
  isActive: boolean;

  /** 最后使用时间 */
  lastUsedAt?: Date;

  /** 使用次数 */
  usedCount: number;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建外部服务请求接口
 */
export interface CreateExternalServiceRequest {
  /** 服务类型 */
  serviceType: ExternalServiceType;

  /** 服务名称 */
  name: string;

  /** 配置信息（Instapaper/Notion/Pocket 配置） */
  config: InstapaperConfig | NotionConfig | PocketConfig;
}

/**
 * 更新外部服务请求接口
 */
export interface UpdateExternalServiceRequest {
  /** 服务名称（可选） */
  name?: string;

  /** 是否启用（可选） */
  isActive?: boolean;

  /** 配置信息（可选） */
  config?: InstapaperConfig | NotionConfig | PocketConfig;
}

/**
 * 外部服务测试结果接口
 */
export interface ExternalServiceTestResult {
  /** 是否成功 */
  success: boolean;

  /** 错误信息 */
  error?: string;
}

/**
 * 预设过滤规则模板接口
 */
export interface FilterTemplate {
  /** 模板唯一标识符 */
  id: string;

  /** 模板名称 */
  name: string;

  /** 模板描述 */
  description: string;

  /** 模板分类 */
  category: 'spam' | 'quality' | 'topic' | 'custom';

  /** 规则配置 */
  rules: Omit<CreateFilterRuleRequest, 'id' | 'createdAt' | 'updatedAt'>[];
}

/**
 * 内置过滤规则模板
 */
export const BUILT_IN_FILTER_TEMPLATES: FilterTemplate[] = [
  {
    id: 'template-ad-filter',
    name: '广告过滤',
    description: '自动标记包含广告关键词的文章为已读',
    category: 'spam',
    rules: [
      {
        name: '排除广告文章',
        field: 'title',
        condition: 'contains',
        pattern: '广告|推广|Sponsored|AD|赞助',
        action: 'markRead',
        scope: 'global',
      },
    ],
  },
  {
    id: 'template-highlight-keywords',
    name: '关键词高亮',
    description: '高亮包含指定关键词的文章',
    category: 'topic',
    rules: [
      {
        name: '高亮重要关键词',
        description: '自动高亮包含重要关键词的文章',
        field: 'title',
        condition: 'contains',
        pattern: 'AI|人工智能|机器学习|深度学习',
        action: 'highlight',
        scope: 'global',
      },
    ],
  },
  {
    id: 'template-auto-star',
    name: '自动收藏',
    description: '自动收藏来自特定作者的文章',
    category: 'quality',
    rules: [
      {
        name: '收藏指定作者',
        description: '自动收藏特定作者的文章',
        field: 'author',
        condition: 'contains',
        pattern: '',
        action: 'markStarred',
        scope: 'global',
      },
    ],
  },
];

// 保留旧类型以兼容
export type FilterType = 'include' | 'exclude' | 'replace' | 'score';
export type MatchConditionLegacy = MatchCondition;

/**
 * 过滤规则组接口（保留用于兼容）
 */
export interface FilterGroup {
  id: string;
  name: string;
  description?: string;
  operator: 'and' | 'or';
  ruleIds: string[];
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 过滤规则执行统计接口
 */
export interface FilterStats {
  ruleId: string;
  executionCount: number;
  matchCount: number;
  excludeCount: number;
  avgExecutionTime: number;
  lastExecutedAt: Date;
}
