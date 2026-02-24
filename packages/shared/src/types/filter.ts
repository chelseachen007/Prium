/**
 * 过滤规则相关类型定义
 * @module types/filter
 */

/**
 * 过滤规则类型
 */
export type FilterType = 'include' | 'exclude' | 'replace' | 'score';

/**
 * 过滤字段类型
 */
export type FilterField = 'title' | 'content' | 'author' | 'url' | 'category' | 'tag';

/**
 * 匹配条件类型
 */
export type MatchCondition = 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';

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
 *   type: 'exclude',
 *   field: 'title',
 *   condition: 'contains',
 *   value: ['广告', '推广', 'Sponsored'],
 *   isEnabled: true,
 *   priority: 10,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 * ```
 */
export interface FilterRule {
  /** 规则唯一标识符 */
  id: string;

  /** 规则名称 */
  name: string;

  /** 规则描述（可选） */
  description?: string;

  /** 过滤类型 */
  type: FilterType;

  /** 过滤字段 */
  field: FilterField;

  /** 匹配条件 */
  condition: MatchCondition;

  /** 匹配值 */
  value: string | string[] | number;

  /** 是否启用 */
  isEnabled: boolean;

  /** 优先级（数值越大优先级越高） */
  priority: number;

  /** 应用的订阅 ID 列表（为空则应用到全部） */
  subscriptionIds?: string[];

  /** 应用的分类 ID 列表（为空则应用到全部） */
  categoryIds?: string[];

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

  /** 过滤类型 */
  type: FilterType;

  /** 过滤字段 */
  field: FilterField;

  /** 匹配条件 */
  condition: MatchCondition;

  /** 匹配值 */
  value: string | string[] | number;

  /** 是否启用（可选，默认 true） */
  isEnabled?: boolean;

  /** 优先级（可选，默认 0） */
  priority?: number;

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

  /** 过滤类型（可选） */
  type?: FilterType;

  /** 过滤字段（可选） */
  field?: FilterField;

  /** 匹配条件（可选） */
  condition?: MatchCondition;

  /** 匹配值（可选） */
  value?: string | string[] | number;

  /** 是否启用（可选） */
  isEnabled?: boolean;

  /** 优先级（可选） */
  priority?: number;

  /** 应用的订阅 ID 列表（可选） */
  subscriptionIds?: string[];

  /** 应用的分类 ID 列表（可选） */
  categoryIds?: string[];
}

/**
 * 过滤结果接口
 *
 * 表示对文章应用过滤规则后的结果
 */
export interface FilterResult {
  /** 文章 ID */
  articleId: string;

  /** 是否通过所有规则 */
  passed: boolean;

  /** 匹配的规则列表 */
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    type: FilterType;
  }>;

  /** 被排除的规则列表 */
  excludedBy?: Array<{
    ruleId: string;
    ruleName: string;
    reason: string;
  }>;

  /** 质量评分调整（可选） */
  scoreAdjustment?: number;
}

/**
 * 过滤规则组接口
 *
 * 用于组合多个过滤规则
 */
export interface FilterGroup {
  /** 规则组唯一标识符 */
  id: string;

  /** 规则组名称 */
  name: string;

  /** 规则组描述（可选） */
  description?: string;

  /** 组内规则的逻辑关系 */
  operator: 'and' | 'or';

  /** 规则 ID 列表 */
  ruleIds: string[];

  /** 是否启用 */
  isEnabled: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
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
  rules: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>[];
}

/**
 * 内置过滤规则模板
 */
export const BUILT_IN_FILTER_TEMPLATES: FilterTemplate[] = [
  {
    id: 'template-ad-filter',
    name: '广告过滤',
    description: '过滤包含广告关键词的文章',
    category: 'spam',
    rules: [
      {
        name: '排除广告文章',
        type: 'exclude',
        field: 'title',
        condition: 'contains',
        value: ['广告', '推广', 'Sponsored', 'AD'],
        isEnabled: true,
        priority: 100,
      },
    ],
  },
  {
    id: 'template-low-quality',
    name: '低质量过滤',
    description: '过滤低质量文章',
    category: 'quality',
    rules: [
      {
        name: '排除短标题',
        type: 'exclude',
        field: 'title',
        condition: 'lessThan',
        value: 5,
        isEnabled: true,
        priority: 50,
      },
    ],
  },
];

/**
 * 过滤规则执行统计接口
 */
export interface FilterStats {
  /** 规则 ID */
  ruleId: string;

  /** 执行次数 */
  executionCount: number;

  /** 匹配次数 */
  matchCount: number;

  /** 排除次数 */
  excludeCount: number;

  /** 平均执行时间（毫秒） */
  avgExecutionTime: number;

  /** 最后执行时间 */
  lastExecutedAt: Date;
}
