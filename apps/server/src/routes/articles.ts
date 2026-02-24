/**
 * 文章管理路由
 *
 * 提供文章的查询、标记已读、星标等操作 API
 *
 * @module routes/articles
 */

import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { articleService, ArticleError } from '../services/article-service.js';
import type { ApiResponse, PaginatedResponse } from '@rss-reader/shared';

// ==================== Zod 验证 Schema ====================

/**
 * 文章列表查询参数验证
 */
const listArticlesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  subscriptionId: z.string().optional(),
  categoryId: z.string().optional(),
  isRead: z.enum(['true', 'false', '1', '0']).optional().transform(v => v === 'true' || v === '1'),
  isStarred: z.enum(['true', 'false', '1', '0']).optional().transform(v => v === 'true' || v === '1'),
  search: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  hasAiSummary: z.enum(['true', 'false', '1', '0']).optional().transform(v => v === 'true' || v === '1'),
  sortBy: z.enum(['publishedAt', 'createdAt', 'title', 'readProgress']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * 标记已读/未读请求体验证
 */
const markReadBodySchema = z.object({
  isRead: z.boolean(),
});

/**
 * 星标/取消星标请求体验证
 */
const toggleStarBodySchema = z.object({
  isStarred: z.boolean(),
});

/**
 * 批量标记已读请求体验证
 */
const batchReadBodySchema = z.object({
  articleIds: z.array(z.string()).min(1).max(500).optional(),
  subscriptionId: z.string().optional(),
  categoryId: z.string().optional(),
  isRead: z.boolean().default(true),
  olderThan: z.string().datetime().optional(),
});

// ==================== 辅助函数 ====================

/**
 * 获取错误信息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * 判断是否为 ArticleError
 */
function isArticleError(error: unknown): error is ArticleError {
  return error instanceof ArticleError;
}

/**
 * 判断是否为 ZodError
 */
function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

// ==================== 路由定义 ====================

const articlesRouter = new Hono();

/**
 * GET /api/articles/stats
 * 获取文章统计信息
 */
articlesRouter.get('/stats', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';

    const stats = await articleService.getStats(userId);

    return c.json<ApiResponse<typeof stats>>({
      success: true,
      data: stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取文章统计失败:', error);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'STATS_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/articles
 * 获取文章列表（支持分页、过滤）
 */
articlesRouter.get('/', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';

    // 解析并验证查询参数
    const query = listArticlesQuerySchema.parse(c.req.query());

    const result = await articleService.getList(
      {
        userId,
        subscriptionId: query.subscriptionId,
        categoryId: query.categoryId,
        isRead: query.isRead,
        isStarred: query.isStarred,
        search: query.search,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        hasAiSummary: query.hasAiSummary,
      },
      {
        field: query.sortBy,
        order: query.sortOrder,
      },
      {
        page: query.page,
        pageSize: query.pageSize,
      }
    );

    return c.json<PaginatedResponse<typeof result.articles[0]>>({
      success: true,
      data: result.articles,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'LIST_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/articles/:id
 * 获取单篇文章详情
 */
articlesRouter.get('/:id', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    const article = await articleService.getById(articleId, userId);

    if (!article) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '文章不存在',
          errorCode: 'ARTICLE_NOT_FOUND',
          timestamp: Date.now(),
        },
        404
      );
    }

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * PUT /api/articles/:id/read
 * 标记文章已读/未读
 */
articlesRouter.put('/:id/read', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    // 验证请求体
    const body = await c.req.json();
    const { isRead } = markReadBodySchema.parse(body);

    const article = await articleService.markRead(articleId, userId, isRead);

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('标记已读/未读失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    if (isArticleError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'MARK_READ_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * PUT /api/articles/:id/star
 * 星标/取消星标文章
 */
articlesRouter.put('/:id/star', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    // 验证请求体
    const body = await c.req.json();
    const { isStarred } = toggleStarBodySchema.parse(body);

    const article = await articleService.toggleStar(articleId, userId, isStarred);

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('星标/取消星标失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    if (isArticleError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'TOGGLE_STAR_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/articles/batch-read
 * 批量标记已读
 */
articlesRouter.post('/batch-read', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';

    // 验证请求体
    const body = await c.req.json();
    const validated = batchReadBodySchema.parse(body);

    const result = await articleService.batchUpdate(
      {
        userId,
        articleIds: validated.articleIds,
        subscriptionId: validated.subscriptionId,
        categoryId: validated.categoryId,
        olderThan: validated.olderThan ? new Date(validated.olderThan) : undefined,
      },
      {
        isRead: validated.isRead,
      }
    );

    return c.json<ApiResponse<{ count: number }>>({
      success: true,
      data: { count: result.count },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('批量标记已读失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'BATCH_READ_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * PUT /api/articles/:id/progress
 * 更新阅读进度
 */
articlesRouter.put('/:id/progress', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    // 验证请求体
    const body = await c.req.json();
    const progressSchema = z.object({
      progress: z.number().min(0).max(1),
    });
    const { progress } = progressSchema.parse(body);

    const article = await articleService.updateProgress(articleId, userId, progress);

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('更新阅读进度失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    if (isArticleError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        error.statusCode as ContentfulStatusCode
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'UPDATE_PROGRESS_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/articles/:id/previous
 * 获取上一篇文章
 */
articlesRouter.get('/:id/previous', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    const article = await articleService.getPrevious(articleId, userId);

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取上一篇文章失败:', error);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_PREVIOUS_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/articles/:id/next
 * 获取下一篇文章
 */
articlesRouter.get('/:id/next', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';
    const articleId = c.req.param('id');

    const article = await articleService.getNext(articleId, userId);

    return c.json<ApiResponse<typeof article>>({
      success: true,
      data: article,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取下一篇文章失败:', error);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_NEXT_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/articles/search
 * 搜索文章
 */
articlesRouter.post('/search', async (c) => {
  try {
    // TODO: 从认证中间件获取用户 ID
    const userId = 'default-user';

    // 验证请求体
    const body = await c.req.json();
    const searchSchema = z.object({
      query: z.string().min(1).max(200),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    });
    const { query, page, pageSize } = searchSchema.parse(body);

    const result = await articleService.search(userId, query, { page, pageSize });

    return c.json<PaginatedResponse<typeof result.articles[0]>>({
      success: true,
      data: result.articles,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('搜索文章失败:', error);

    if (isZodError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
          errorCode: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'SEARCH_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

export { articlesRouter };
