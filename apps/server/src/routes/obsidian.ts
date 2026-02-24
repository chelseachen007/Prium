/**
 * Obsidian 联动路由
 *
 * 提供 Obsidian 配置管理、模板处理、文章保存等操作 API
 *
 * @module routes/obsidian
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  obsidianService,
  type SaveArticleOptions,
  type TemplateInfo,
} from '../services/obsidian-service.js';
import { ObsidianError } from '../lib/obsidian.js';
import type { ApiResponse } from '@rss-reader/shared';
import type { ObsidianConfig, ObsidianVaultInfo } from '@rss-reader/shared';

// ==================== Zod 验证 Schema ====================

/**
 * Obsidian 配置更新验证
 */
const updateConfigBodySchema = z.object({
  vaultPath: z.string().min(1, 'Vault 路径不能为空').optional(),
  notesFolder: z.string().min(1).optional(),
  attachmentsFolder: z.string().optional(),
  isEnabled: z.boolean().optional(),
  autoSync: z.boolean().optional(),
  syncInterval: z.number().int().min(60).max(86400).optional(),
  templateId: z.string().optional(),
  namingPattern: z.string().min(1).optional(),
  downloadImages: z.boolean().optional(),
  useFrontMatter: z.boolean().optional(),
});

/**
 * 验证 Vault 路径请求体验证
 */
const validateVaultBodySchema = z.object({
  vaultPath: z.string().min(1, 'Vault 路径不能为空'),
});

/**
 * 保存文章请求体验证
 */
const saveArticleBodySchema = z.object({
  templateId: z.string().optional(),
  folder: z.string().optional(),
  fileName: z.string().max(200).optional(),
  overwrite: z.boolean().default(false).optional(),
  downloadImages: z.boolean().default(true).optional(),
  additionalTags: z.array(z.string()).max(20).optional(),
});

/**
 * 批量保存文章请求体验证
 */
const batchSaveBodySchema = z.object({
  articleIds: z.array(z.string()).min(1, '至少选择一篇文章').max(50, '单次最多保存 50 篇文章'),
  options: saveArticleBodySchema.optional(),
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
 * 判断是否为 ObsidianError
 */
function isObsidianError(error: unknown): error is ObsidianError {
  return error instanceof ObsidianError;
}

/**
 * 判断是否为 ZodError
 */
function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

// ==================== 路由定义 ====================

const obsidianRouter = new Hono();

/**
 * GET /api/obsidian/config
 * 获取 Obsidian 配置
 */
obsidianRouter.get('/config', async (c) => {
  try {
    const config = await obsidianService.getConfig();

    if (!config) {
      return c.json<ApiResponse<ObsidianConfig | null>>({
        success: true,
        data: null,
        timestamp: Date.now(),
      });
    }

    return c.json<ApiResponse<ObsidianConfig>>({
      success: true,
      data: config,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取 Obsidian 配置失败:', error);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_CONFIG_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * PUT /api/obsidian/config
 * 更新 Obsidian 配置
 */
obsidianRouter.put('/config', async (c) => {
  try {
    // 验证请求体
    const body = await c.req.json();
    const validated = updateConfigBodySchema.parse(body);

    const config = await obsidianService.updateConfig(validated);

    return c.json<ApiResponse<ObsidianConfig>>({
      success: true,
      data: config,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('更新 Obsidian 配置失败:', error);

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

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'UPDATE_CONFIG_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/validate
 * 验证 Vault 路径
 */
obsidianRouter.post('/validate', async (c) => {
  try {
    // 验证请求体
    const body = await c.req.json();
    const { vaultPath } = validateVaultBodySchema.parse(body);

    const result = await obsidianService.validateConfig({ vaultPath });

    return c.json<ApiResponse<{ valid: boolean; error?: string }>>({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('验证 Vault 路径失败:', error);

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
        errorCode: 'VALIDATE_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/obsidian/vault-info
 * 获取 Vault 信息
 */
obsidianRouter.get('/vault-info', async (c) => {
  try {
    const info = await obsidianService.getVaultInfo();

    return c.json<ApiResponse<ObsidianVaultInfo>>({
      success: true,
      data: info,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取 Vault 信息失败:', error);

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        error.code === 'NOT_CONFIGURED' ? 400 : 500
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'VAULT_INFO_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/obsidian/folders
 * 获取文件夹列表
 */
obsidianRouter.get('/folders', async (c) => {
  try {
    const folders = await obsidianService.getFolders();

    return c.json<ApiResponse<string[]>>({
      success: true,
      data: folders,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取文件夹列表失败:', error);

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        error.code === 'NOT_CONFIGURED' ? 400 : 500
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_FOLDERS_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * GET /api/obsidian/templates
 * 获取模板列表
 */
obsidianRouter.get('/templates', async (c) => {
  try {
    const templates = await obsidianService.getTemplates();

    return c.json<ApiResponse<TemplateInfo[]>>({
      success: true,
      data: templates,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'GET_TEMPLATES_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/save/:articleId
 * 保存单篇文章到 Obsidian
 */
obsidianRouter.post('/save/:articleId', async (c) => {
  try {
    const articleId = c.req.param('articleId');

    // 解析请求体（可选）
    let options: SaveArticleOptions = {};
    try {
      const body = await c.req.json();
      const validated = saveArticleBodySchema.parse(body);
      options = {
        templateId: validated.templateId,
        folder: validated.folder,
        fileName: validated.fileName,
        overwrite: validated.overwrite,
        downloadImages: validated.downloadImages,
        additionalTags: validated.additionalTags,
      };
    } catch {
      // 请求体为空或解析失败，使用默认选项
    }

    const result = await obsidianService.saveArticle(articleId, options);

    if (!result.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: result.error || '保存失败',
          errorCode: 'SAVE_ARTICLE_ERROR',
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<
      ApiResponse<{
        noteId: string;
        filePath: string;
      }>
    >({
      success: true,
      data: {
        noteId: result.noteId!,
        filePath: result.filePath!,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('保存文章到 Obsidian 失败:', error);

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'SAVE_ARTICLE_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/batch-save
 * 批量保存文章到 Obsidian
 */
obsidianRouter.post('/batch-save', async (c) => {
  try {
    // 验证请求体
    const body = await c.req.json();
    const validated = batchSaveBodySchema.parse(body);

    // 准备保存选项
    let options: SaveArticleOptions = {};
    if (validated.options) {
      options = {
        templateId: validated.options.templateId,
        folder: validated.options.folder,
        fileName: validated.options.fileName,
        overwrite: validated.options.overwrite,
        downloadImages: validated.options.downloadImages,
        additionalTags: validated.options.additionalTags,
      };
    }

    const result = await obsidianService.batchSaveArticles(validated.articleIds, options);

    return c.json<
      ApiResponse<{
        total: number;
        success: number;
        failed: number;
        results: Array<{
          articleId: string;
          success: boolean;
          filePath?: string;
          error?: string;
        }>;
      }>
    >({
      success: true,
      data: {
        total: result.total,
        success: result.success,
        failed: result.failed,
        results: result.results,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('批量保存文章失败:', error);

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

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'BATCH_SAVE_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/sync
 * 同步所有待同步的笔记
 */
obsidianRouter.post('/sync', async (c) => {
  try {
    const result = await obsidianService.syncNotes();

    return c.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('同步笔记失败:', error);

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'SYNC_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/download-attachment
 * 下载附件到 Obsidian 附件文件夹
 */
obsidianRouter.post('/download-attachment', async (c) => {
  try {
    // 验证请求体
    const body = await c.req.json();
    const downloadSchema = z.object({
      url: z.string().url('请输入有效的 URL'),
      fileName: z.string().max(200).optional(),
    });
    const { url, fileName } = downloadSchema.parse(body);

    const localPath = await obsidianService.downloadAttachment(url, fileName);

    return c.json<ApiResponse<{ path: string }>>({
      success: true,
      data: { path: localPath },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('下载附件失败:', error);

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

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'DOWNLOAD_ATTACHMENT_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

/**
 * POST /api/obsidian/download-images
 * 批量下载图片到 Obsidian 附件文件夹
 */
obsidianRouter.post('/download-images', async (c) => {
  try {
    // 验证请求体
    const body = await c.req.json();
    const downloadImagesSchema = z.object({
      urls: z.array(z.string().url()).min(1).max(20),
    });
    const { urls } = downloadImagesSchema.parse(body);

    const localPaths = await obsidianService.downloadImages(urls);

    return c.json<ApiResponse<{ paths: string[] }>>({
      success: true,
      data: { paths: localPaths },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('批量下载图片失败:', error);

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

    if (isObsidianError(error)) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: Date.now(),
        },
        400
      );
    }

    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: getErrorMessage(error),
        errorCode: 'DOWNLOAD_IMAGES_ERROR',
        timestamp: Date.now(),
      },
      500
    );
  }
});

export { obsidianRouter };
