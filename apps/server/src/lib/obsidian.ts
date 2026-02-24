/**
 * Obsidian 集成核心服务
 *
 * 提供 Vault 路径验证、文件读写、文件夹扫描等核心功能
 *
 * @module lib/obsidian
 */

import fs from 'fs/promises';
import path from 'path';
import { constants } from 'fs';

/**
 * Obsidian 错误类型
 */
export class ObsidianError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ObsidianError';
  }
}

/**
 * Vault 验证结果
 */
export interface VaultValidationResult {
  valid: boolean;
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isAccessible: boolean;
  hasObsidianFolder: boolean;
  error?: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  isFile: boolean;
  extension: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * 文件夹扫描选项
 */
export interface ScanOptions {
  /** 是否递归扫描子文件夹 */
  recursive?: boolean;
  /** 文件扩展名过滤 */
  extensions?: string[];
  /** 最大扫描深度 */
  maxDepth?: number;
  /** 排除的文件夹名称 */
  excludeFolders?: string[];
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
}

/**
 * 默认扫描选项
 */
const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  recursive: true,
  extensions: [],
  maxDepth: 10,
  excludeFolders: ['.obsidian', '.trash', '.git', 'node_modules'],
  includeHidden: false,
};

/**
 * 默认排除的敏感路径
 */
const SENSITIVE_PATHS = [
  '.obsidian',
  '.trash',
  '.git',
  '.gitignore',
];

/**
 * Obsidian 核心服务类
 */
export class ObsidianCore {
  private vaultPath: string | null = null;

  /**
   * 设置 Vault 路径
   */
  setVaultPath(vaultPath: string): void {
    this.vaultPath = path.resolve(vaultPath);
  }

  /**
   * 获取当前 Vault 路径
   */
  getVaultPath(): string | null {
    return this.vaultPath;
  }

  /**
   * 验证 Vault 路径
   *
   * @param vaultPath - 要验证的路径
   * @returns 验证结果
   */
  async validateVaultPath(vaultPath: string): Promise<VaultValidationResult> {
    const resolvedPath = path.resolve(vaultPath);
    const result: VaultValidationResult = {
      valid: false,
      path: resolvedPath,
      exists: false,
      isDirectory: false,
      isAccessible: false,
      hasObsidianFolder: false,
    };

    try {
      // 检查路径是否存在
      const stats = await fs.stat(resolvedPath);
      result.exists = true;
      result.isDirectory = stats.isDirectory();

      if (!result.isDirectory) {
        result.error = '路径不是一个目录';
        return result;
      }

      // 检查访问权限
      await fs.access(resolvedPath, constants.R_OK | constants.W_OK);
      result.isAccessible = true;

      // 检查是否存在 .obsidian 文件夹（Obsidian 特征）
      const obsidianPath = path.join(resolvedPath, '.obsidian');
      try {
        const obsidianStats = await fs.stat(obsidianPath);
        result.hasObsidianFolder = obsidianStats.isDirectory();
      } catch {
        // 没有 .obsidian 文件夹也允许，可能是新创建的 Vault
        result.hasObsidianFolder = false;
      }

      // 如果满足基本条件，则认为有效
      result.valid = result.exists && result.isDirectory && result.isAccessible;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        result.error = '路径不存在';
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        result.error = '没有访问权限';
      } else {
        result.error = (error as Error).message;
      }
    }

    return result;
  }

  /**
   * 安全地解析路径（防止目录遍历攻击）
   *
   * @param targetPath - 目标路径（相对于 Vault 根目录）
   * @returns 解析后的安全路径
   * @throws {ObsidianError} 如果路径不安全
   */
  resolveSafePath(targetPath: string): string {
    if (!this.vaultPath) {
      throw new ObsidianError('Vault 路径未设置', 'VAULT_NOT_SET');
    }

    // 移除开头的斜杠和反斜杠
    const normalizedTarget = targetPath.replace(/^[\/\\]+/, '');

    // 解析完整路径
    const resolvedPath = path.resolve(this.vaultPath, normalizedTarget);

    // 检查路径是否在 Vault 内
    if (!resolvedPath.startsWith(this.vaultPath)) {
      throw new ObsidianError(
        '路径超出 Vault 范围，可能是目录遍历攻击',
        'PATH_TRAVERSAL_DETECTED',
        { targetPath, resolvedPath, vaultPath: this.vaultPath }
      );
    }

    // 检查是否包含敏感路径
    const relativePath = path.relative(this.vaultPath, resolvedPath);
    for (const sensitive of SENSITIVE_PATHS) {
      if (relativePath.startsWith(sensitive) || relativePath.includes(`/${sensitive}/`) || relativePath.includes(`\\${sensitive}\\`)) {
        throw new ObsidianError(
          `不允许访问敏感路径: ${sensitive}`,
          'SENSITIVE_PATH_ACCESS',
          { targetPath, sensitive }
        );
      }
    }

    return resolvedPath;
  }

  /**
   * 读取文件内容
   *
   * @param filePath - 文件路径（相对于 Vault 根目录）
   * @returns 文件内容
   */
  async readFile(filePath: string): Promise<string> {
    const safePath = this.resolveSafePath(filePath);

    try {
      // 检查是否是文件
      const stats = await fs.stat(safePath);
      if (!stats.isFile()) {
        throw new ObsidianError('路径不是文件', 'NOT_A_FILE', { path: filePath });
      }

      return await fs.readFile(safePath, 'utf-8');
    } catch (error) {
      if (error instanceof ObsidianError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('文件不存在', 'FILE_NOT_FOUND', { path: filePath });
      }
      throw new ObsidianError(
        `读取文件失败: ${(error as Error).message}`,
        'READ_ERROR',
        { path: filePath, originalError: error }
      );
    }
  }

  /**
   * 写入文件内容
   *
   * @param filePath - 文件路径（相对于 Vault 根目录）
   * @param content - 文件内容
   * @param options - 写入选项
   */
  async writeFile(
    filePath: string,
    content: string,
    options: { createDir?: boolean; overwrite?: boolean } = {}
  ): Promise<void> {
    const { createDir = true, overwrite = true } = options;
    const safePath = this.resolveSafePath(filePath);

    try {
      // 检查文件是否存在
      const fileExists = await this.pathExists(safePath);

      if (fileExists && !overwrite) {
        throw new ObsidianError('文件已存在', 'FILE_EXISTS', { path: filePath });
      }

      // 创建目录（如果需要）
      if (createDir) {
        const dirPath = path.dirname(safePath);
        await fs.mkdir(dirPath, { recursive: true });
      }

      await fs.writeFile(safePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof ObsidianError) {
        throw error;
      }
      throw new ObsidianError(
        `写入文件失败: ${(error as Error).message}`,
        'WRITE_ERROR',
        { path: filePath, originalError: error }
      );
    }
  }

  /**
   * 检查路径是否存在
   *
   * @param targetPath - 目标路径
   * @returns 是否存在
   */
  async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除文件
   *
   * @param filePath - 文件路径（相对于 Vault 根目录）
   */
  async deleteFile(filePath: string): Promise<void> {
    const safePath = this.resolveSafePath(filePath);

    try {
      const stats = await fs.stat(safePath);
      if (!stats.isFile()) {
        throw new ObsidianError('路径不是文件', 'NOT_A_FILE', { path: filePath });
      }

      await fs.unlink(safePath);
    } catch (error) {
      if (error instanceof ObsidianError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('文件不存在', 'FILE_NOT_FOUND', { path: filePath });
      }
      throw new ObsidianError(
        `删除文件失败: ${(error as Error).message}`,
        'DELETE_ERROR',
        { path: filePath, originalError: error }
      );
    }
  }

  /**
   * 扫描文件夹
   *
   * @param folderPath - 文件夹路径（相对于 Vault 根目录）
   * @param options - 扫描选项
   * @returns 文件和文件夹列表
   */
  async scanFolder(
    folderPath: string = '',
    options: ScanOptions = {}
  ): Promise<FileInfo[]> {
    const mergedOptions = { ...DEFAULT_SCAN_OPTIONS, ...options };
    const safePath = this.resolveSafePath(folderPath);

    try {
      const stats = await fs.stat(safePath);
      if (!stats.isDirectory()) {
        throw new ObsidianError('路径不是目录', 'NOT_A_DIRECTORY', { path: folderPath });
      }
    } catch (error) {
      if (error instanceof ObsidianError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('目录不存在', 'DIRECTORY_NOT_FOUND', { path: folderPath });
      }
      throw error;
    }

    const results: FileInfo[] = [];
    await this.scanFolderRecursive(safePath, folderPath, mergedOptions, 0, results);
    return results;
  }

  /**
   * 递归扫描文件夹
   */
  private async scanFolderRecursive(
    currentPath: string,
    relativePath: string,
    options: Required<ScanOptions>,
    depth: number,
    results: FileInfo[]
  ): Promise<void> {
    if (depth > options.maxDepth) {
      return;
    }

    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const name = entry.name;
      const entryRelativePath = relativePath ? `${relativePath}/${name}` : name;
      const entryFullPath = path.join(currentPath, name);

      // 跳过隐藏文件
      if (!options.includeHidden && name.startsWith('.')) {
        continue;
      }

      // 跳过排除的文件夹
      if (entry.isDirectory() && options.excludeFolders.includes(name)) {
        continue;
      }

      // 获取文件信息
      let stats;
      try {
        stats = await fs.stat(entryFullPath);
      } catch {
        continue; // 跳过无法访问的文件
      }

      const extension = path.extname(name).toLowerCase();
      const isDirectory = entry.isDirectory();
      const isFile = entry.isFile();

      // 扩展名过滤
      if (isFile && options.extensions.length > 0) {
        if (!options.extensions.includes(extension)) {
          continue;
        }
      }

      results.push({
        name,
        path: entryFullPath,
        relativePath: entryRelativePath,
        isDirectory,
        isFile,
        extension,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      });

      // 递归扫描子目录
      if (isDirectory && options.recursive) {
        await this.scanFolderRecursive(
          entryFullPath,
          entryRelativePath,
          options,
          depth + 1,
          results
        );
      }
    }
  }

  /**
   * 创建文件夹
   *
   * @param folderPath - 文件夹路径（相对于 Vault 根目录）
   */
  async createFolder(folderPath: string): Promise<void> {
    const safePath = this.resolveSafePath(folderPath);

    try {
      await fs.mkdir(safePath, { recursive: true });
    } catch (error) {
      throw new ObsidianError(
        `创建文件夹失败: ${(error as Error).message}`,
        'CREATE_FOLDER_ERROR',
        { path: folderPath, originalError: error }
      );
    }
  }

  /**
   * 删除文件夹
   *
   * @param folderPath - 文件夹路径（相对于 Vault 根目录）
   * @param recursive - 是否递归删除
   */
  async deleteFolder(folderPath: string, recursive: boolean = false): Promise<void> {
    const safePath = this.resolveSafePath(folderPath);

    try {
      if (recursive) {
        await fs.rm(safePath, { recursive: true });
      } else {
        await fs.rmdir(safePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('文件夹不存在', 'FOLDER_NOT_FOUND', { path: folderPath });
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOTEMPTY') {
        throw new ObsidianError('文件夹不为空', 'FOLDER_NOT_EMPTY', { path: folderPath });
      }
      throw new ObsidianError(
        `删除文件夹失败: ${(error as Error).message}`,
        'DELETE_FOLDER_ERROR',
        { path: folderPath, originalError: error }
      );
    }
  }

  /**
   * 获取文件信息
   *
   * @param filePath - 文件路径（相对于 Vault 根目录）
   * @returns 文件信息
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const safePath = this.resolveSafePath(filePath);

    try {
      const stats = await fs.stat(safePath);
      const name = path.basename(filePath);
      const extension = path.extname(name).toLowerCase();

      return {
        name,
        path: safePath,
        relativePath: filePath,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        extension,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('文件或目录不存在', 'PATH_NOT_FOUND', { path: filePath });
      }
      throw new ObsidianError(
        `获取文件信息失败: ${(error as Error).message}`,
        'STAT_ERROR',
        { path: filePath, originalError: error }
      );
    }
  }

  /**
   * 复制文件
   *
   * @param sourcePath - 源文件路径（相对于 Vault 根目录）
   * @param destPath - 目标路径（相对于 Vault 根目录）
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const safeSourcePath = this.resolveSafePath(sourcePath);
    const safeDestPath = this.resolveSafePath(destPath);

    try {
      // 确保目标是文件
      const sourceStats = await fs.stat(safeSourcePath);
      if (!sourceStats.isFile()) {
        throw new ObsidianError('源路径不是文件', 'SOURCE_NOT_FILE', { path: sourcePath });
      }

      // 创建目标目录
      const destDir = path.dirname(safeDestPath);
      await fs.mkdir(destDir, { recursive: true });

      await fs.copyFile(safeSourcePath, safeDestPath);
    } catch (error) {
      if (error instanceof ObsidianError) {
        throw error;
      }
      throw new ObsidianError(
        `复制文件失败: ${(error as Error).message}`,
        'COPY_ERROR',
        { sourcePath, destPath, originalError: error }
      );
    }
  }

  /**
   * 移动/重命名文件
   *
   * @param sourcePath - 源路径（相对于 Vault 根目录）
   * @param destPath - 目标路径（相对于 Vault 根目录）
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const safeSourcePath = this.resolveSafePath(sourcePath);
    const safeDestPath = this.resolveSafePath(destPath);

    try {
      // 创建目标目录
      const destDir = path.dirname(safeDestPath);
      await fs.mkdir(destDir, { recursive: true });

      await fs.rename(safeSourcePath, safeDestPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ObsidianError('源文件不存在', 'SOURCE_NOT_FOUND', { path: sourcePath });
      }
      throw new ObsidianError(
        `移动文件失败: ${(error as Error).message}`,
        'MOVE_ERROR',
        { sourcePath, destPath, originalError: error }
      );
    }
  }

  /**
   * 检查路径是否为 Markdown 文件
   */
  isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }

  /**
   * 生成唯一的文件名
   *
   * @param baseName - 基础文件名
   * @param folderPath - 所在文件夹
   * @param extension - 文件扩展名
   * @returns 唯一的文件名
   */
  async generateUniqueFileName(
    baseName: string,
    folderPath: string = '',
    extension: string = '.md'
  ): Promise<string> {
    let fileName = `${baseName}${extension}`;
    let counter = 1;
    const safeFolderPath = folderPath ? this.resolveSafePath(folderPath) : this.vaultPath;

    if (!safeFolderPath) {
      throw new ObsidianError('Vault 路径未设置', 'VAULT_NOT_SET');
    }

    while (await this.pathExists(path.join(safeFolderPath, fileName))) {
      fileName = `${baseName}-${counter}${extension}`;
      counter++;
    }

    return fileName;
  }
}

// 导出单例实例
export const obsidianCore = new ObsidianCore();
