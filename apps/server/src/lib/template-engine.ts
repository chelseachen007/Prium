/**
 * 模板引擎
 *
 * 支持 {{variable}} 语法、条件渲染 {{#if}}、循环 {{#each}} 等功能
 *
 * @module lib/template-engine
 */

import type {
  TemplateRenderResult,
  TemplateRenderOptions,
  TemplateValidationResult,
  TemplateVariable,
} from '@rss-reader/shared';

/**
 * 模板解析错误
 */
export class TemplateError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

/**
 * 默认渲染选项
 */
const DEFAULT_OPTIONS: Required<TemplateRenderOptions> = {
  escapeHtml: false,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm:ss',
  delimiters: ['{{', '}}'],
  removeUnfilled: false,
  unfilledPlaceholder: '',
};

/**
 * 模板引擎类
 */
export class TemplateEngine {
  private options: Required<TemplateRenderOptions>;

  constructor(options: TemplateRenderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 渲染模板
   *
   * @param template - 模板内容
   * @param variables - 变量值
   * @param options - 渲染选项
   * @returns 渲染结果
   */
  render(
    template: string,
    variables: Record<string, unknown>,
    options: TemplateRenderOptions = {}
  ): TemplateRenderResult {
    const mergedOptions = { ...this.options, ...options };
    const warnings: string[] = [];
    const unfilledVariables: string[] = [];

    try {
      // 预处理变量
      const processedVariables = this.preprocessVariables(variables, mergedOptions);

      // 解析和渲染模板
      let content = this.renderTemplate(template, processedVariables, mergedOptions);

      // 检查未填充的变量
      const variablePattern = this.createVariablePattern(mergedOptions.delimiters);
      const matches = content.match(variablePattern);
      if (matches) {
        for (const match of matches) {
          const varName = this.extractVariableName(match, mergedOptions.delimiters);
          if (varName && !unfilledVariables.includes(varName)) {
            unfilledVariables.push(varName);
          }
        }
      }

      // 处理未填充的变量
      if (mergedOptions.removeUnfilled || mergedOptions.unfilledPlaceholder) {
        content = content.replace(variablePattern, mergedOptions.unfilledPlaceholder);
      }

      return {
        success: true,
        content,
        unfilledVariables: unfilledVariables.length > 0 ? unfilledVariables : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证模板
   *
   * @param template - 模板内容
   * @param variables - 变量定义
   * @returns 验证结果
   */
  validate(
    template: string,
    variables: TemplateVariable[] = []
  ): TemplateValidationResult {
    const errors: TemplateValidationResult['errors'] = [];
    const warnings: TemplateValidationResult['warnings'] = [];
    const usedVariables: string[] = [];
    const undefinedVariables: string[] = [];

    const definedVarNames = new Set(variables.map((v) => v.name));

    try {
      // 检查语法错误
      this.validateSyntax(template, errors);

      // 提取使用的变量
      const variablePattern = this.createVariablePattern(this.options.delimiters);
      const matches = template.match(variablePattern) || [];

      for (const match of matches) {
        const varName = this.extractVariableName(match, this.options.delimiters);
        if (varName) {
          // 检查是否是条件或循环语法
          if (varName.startsWith('#if') || varName.startsWith('/if') ||
              varName.startsWith('#each') || varName.startsWith('/each') ||
              varName.startsWith('else')) {
            continue;
          }

          // 提取实际变量名（处理嵌套属性如 article.title）
          const actualVarName = varName.split('.')[0];
          if (!usedVariables.includes(actualVarName)) {
            usedVariables.push(actualVarName);
          }

          // 检查是否已定义
          if (!definedVarNames.has(actualVarName)) {
            if (!undefinedVariables.includes(actualVarName)) {
              undefinedVariables.push(actualVarName);
            }
          }
        }
      }

      // 检查条件块配对
      this.validateBlockPairs(template, 'if', errors);
      this.validateBlockPairs(template, 'each', errors);

    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      usedVariables,
      undefinedVariables,
    };
  }

  /**
   * 验证模板语法
   */
  private validateSyntax(
    template: string,
    errors: TemplateValidationResult['errors']
  ): void {
    const lines = template.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let pos = 0;

      while (pos < line.length) {
        const openTag = line.indexOf(this.options.delimiters[0], pos);
        if (openTag === -1) break;

        const closeTag = line.indexOf(this.options.delimiters[1], openTag + this.options.delimiters[0].length);
        if (closeTag === -1) {
          errors.push({
            message: `未闭合的变量标签: ${this.options.delimiters[0]}`,
            line: i + 1,
            column: openTag + 1,
          });
          break;
        }

        pos = closeTag + this.options.delimiters[1].length;
      }
    }
  }

  /**
   * 验证块元素配对
   */
  private validateBlockPairs(
    template: string,
    blockType: 'if' | 'each',
    errors: TemplateValidationResult['errors']
  ): void {
    const openPattern = new RegExp(`\\{\\{#${blockType}\\s+([^}]+)\\}\\}`, 'g');
    const closePattern = new RegExp(`\\{\\{/${blockType}\\}\\}`, 'g');

    const openMatches = template.match(openPattern) || [];
    const closeMatches = template.match(closePattern) || [];

    if (openMatches.length !== closeMatches.length) {
      errors.push({
        message: `${blockType} 块不配对: 开始标签 ${openMatches.length} 个，结束标签 ${closeMatches.length} 个`,
      });
    }
  }

  /**
   * 预处理变量
   */
  private preprocessVariables(
    variables: Record<string, unknown>,
    options: Required<TemplateRenderOptions>
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = { ...variables };

    // 添加内置变量
    const now = new Date();
    processed.date = this.formatDate(now, options.dateFormat);
    processed.time = this.formatTime(now, options.timeFormat);
    processed.datetime = `${processed.date} ${processed.time}`;
    processed.timestamp = now.getTime();
    processed.randomId = this.generateRandomId();
    processed.uuid = this.generateUUID();

    return processed;
  }

  /**
   * 渲染模板
   */
  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
    options: Required<TemplateRenderOptions>
  ): string {
    let result = template;

    // 1. 处理条件块 {{#if}}
    result = this.processConditionals(result, variables, options);

    // 2. 处理循环块 {{#each}}
    result = this.processLoops(result, variables, options);

    // 3. 替换简单变量 {{variable}}
    result = this.replaceVariables(result, variables, options);

    return result;
  }

  /**
   * 处理条件块
   */
  private processConditionals(
    template: string,
    variables: Record<string, unknown>,
    options: Required<TemplateRenderOptions>
  ): string {
    const [openDelim, closeDelim] = options.delimiters;
    const ifPattern = new RegExp(
      `${this.escapeRegex(openDelim)}#if\\s+([^}]+)${this.escapeRegex(closeDelim)}([\\s\\S]*?)${this.escapeRegex(openDelim)}/if${this.escapeRegex(closeDelim)}`,
      'g'
    );

    return template.replace(ifPattern, (_, condition, content) => {
      // 处理 else 分支
      const elsePattern = new RegExp(
        `^([\\s\\S]*?)${this.escapeRegex(openDelim)}else${this.escapeRegex(closeDelim)}([\\s\\S]*)$`
      );
      const elseMatch = content.match(elsePattern);

      const ifContent = elseMatch ? elseMatch[1] : content;
      const elseContent = elseMatch ? elseMatch[2] : '';

      // 评估条件
      const conditionResult = this.evaluateCondition(condition.trim(), variables);

      return conditionResult ? ifContent : elseContent;
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    // 处理比较运算符
    const comparisonOperators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];

    for (const op of comparisonOperators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map((s) => s.trim());
        const leftValue = this.getVariableValue(left, variables);
        const rightValue = this.parseLiteral(right) ?? this.getVariableValue(right, variables);

        switch (op) {
          case '===':
          case '==':
            return leftValue == rightValue;
          case '!==':
          case '!=':
            return leftValue != rightValue;
          case '>':
            return Number(leftValue) > Number(rightValue);
          case '>=':
            return Number(leftValue) >= Number(rightValue);
          case '<':
            return Number(leftValue) < Number(rightValue);
          case '<=':
            return Number(leftValue) <= Number(rightValue);
        }
      }
    }

    // 简单真值检查
    const value = this.getVariableValue(condition, variables);
    return Boolean(value);
  }

  /**
   * 解析字面量
   */
  private parseLiteral(value: string): string | number | boolean | null {
    const trimmed = value.trim();

    // 字符串
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // 布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // null/undefined
    if (trimmed === 'null' || trimmed === 'undefined') return null;

    // 数字
    const num = Number(trimmed);
    if (!isNaN(num)) return num;

    return null;
  }

  /**
   * 处理循环块
   */
  private processLoops(
    template: string,
    variables: Record<string, unknown>,
    options: Required<TemplateRenderOptions>
  ): string {
    const [openDelim, closeDelim] = options.delimiters;
    const eachPattern = new RegExp(
      `${this.escapeRegex(openDelim)}#each\\s+([^}]+)${this.escapeRegex(closeDelim)}([\\s\\S]*?)${this.escapeRegex(openDelim)}/each${this.escapeRegex(closeDelim)}`,
      'g'
    );

    return template.replace(eachPattern, (_, arrayPath, content) => {
      const arrayValue = this.getVariableValue(arrayPath.trim(), variables);

      if (!Array.isArray(arrayValue)) {
        return '';
      }

      return arrayValue.map((item, index) => {
        // 在循环内容中替换 this 和 @index
        let itemContent = content;

        // 替换 {{this}}
        itemContent = itemContent.replace(
          new RegExp(`${this.escapeRegex(openDelim)}this${this.escapeRegex(closeDelim)}`, 'g'),
          String(item)
        );

        // 替换 {{@index}}
        itemContent = itemContent.replace(
          new RegExp(`${this.escapeRegex(openDelim)}@index${this.escapeRegex(closeDelim)}`, 'g'),
          String(index)
        );

        // 如果 item 是对象，替换其属性
        if (typeof item === 'object' && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            itemContent = itemContent.replace(
              new RegExp(`${this.escapeRegex(openDelim)}this\\.${key}${this.escapeRegex(closeDelim)}`, 'g'),
              String(value)
            );
          }
        }

        return itemContent;
      }).join('');
    });
  }

  /**
   * 替换简单变量
   */
  private replaceVariables(
    template: string,
    variables: Record<string, unknown>,
    options: Required<TemplateRenderOptions>
  ): string {
    const [openDelim, closeDelim] = options.delimiters;
    const variablePattern = new RegExp(
      `${this.escapeRegex(openDelim)}([^#\\/][^}]*)${this.escapeRegex(closeDelim)}`,
      'g'
    );

    return template.replace(variablePattern, (_, varPath) => {
      const value = this.getVariableValue(varPath.trim(), variables);

      if (value === undefined || value === null) {
        return `${openDelim}${varPath}${closeDelim}`;
      }

      if (Array.isArray(value)) {
        return value.join(', ');
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      let stringValue = String(value);

      // HTML 转义
      if (options.escapeHtml) {
        stringValue = this.escapeHtml(stringValue);
      }

      return stringValue;
    });
  }

  /**
   * 获取变量值
   */
  private getVariableValue(path: string, variables: Record<string, unknown>): unknown {
    const parts = path.split('.').filter((p) => p !== 'this');
    let value: unknown = variables;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 创建变量匹配模式
   */
  private createVariablePattern(delimiters: [string, string]): RegExp {
    return new RegExp(
      `${this.escapeRegex(delimiters[0])}[^}]+${this.escapeRegex(delimiters[1])}`,
      'g'
    );
  }

  /**
   * 提取变量名
   */
  private extractVariableName(match: string, delimiters: [string, string]): string {
    return match
      .slice(delimiters[0].length, -delimiters[1].length)
      .trim();
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date, format: string): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 生成随机 ID
   */
  private generateRandomId(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成 UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// 导出单例实例
export const templateEngine = new TemplateEngine();
