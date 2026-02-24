# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

RSS 阅读器 - 一个现代化的 RSS 阅读器，支持与 Obsidian 深度联动。采用 Monorepo 架构，包含前端 (Vue 3)、后端 (Hono) 和共享类型包。

## 常用命令

```bash
# 安装依赖
pnpm install

# 初始化数据库（首次运行）
cd apps/server && npx prisma db push

# 开发模式
pnpm dev:server  # 后端服务 http://localhost:3001
pnpm dev:web     # 前端应用 http://localhost:5173

# 构建项目
pnpm build:shared  # 构建共享类型包（需先执行）
pnpm build:web     # 构建前端
pnpm build:server  # 构建后端

# 数据库操作
cd apps/server
npx prisma studio      # 打开数据库管理界面
npx prisma db push     # 同步 schema 到数据库
npx prisma generate    # 生成 Prisma Client

# 类型检查
cd apps/web && pnpm type-check
cd apps/server && pnpm typecheck
```

## 架构说明

### Monorepo 结构

```
apps/
  web/      # Vue 3 前端应用
  server/   # Hono 后端服务

packages/
  shared/   # 共享 TypeScript 类型定义
```

### 前端架构 (apps/web)

- **框架**: Vue 3 + TypeScript + Vite
- **样式**: Tailwind CSS
- **状态管理**: Pinia stores (`src/stores/`)
- **路由**: Vue Router (`src/router/index.ts`)
- **API 请求**: `useApi` composable (`src/composables/useApi.ts`)

主要 Store:
- `articles.ts` - 文章列表、分页、标记操作
- `subscriptions.ts` - 订阅管理
- `categories.ts` - 分类管理
- `settings.ts` - 应用设置

### 后端架构 (apps/server)

- **框架**: Hono (轻量级 Web 框架)
- **ORM**: Prisma
- **数据库**: SQLite (开发) / PostgreSQL (生产)

目录结构:
- `src/routes/` - API 路由处理
- `src/services/` - 业务逻辑层
- `src/lib/` - 工具库 (RSS 解析、Obsidian 集成、模板引擎)
- `prisma/schema.prisma` - 数据模型定义

### 共享类型包 (packages/shared)

前后端共享的 TypeScript 类型定义，包括:
- Article, Subscription, Category 实体类型
- API 请求/响应类型
- Obsidian 集成类型
- 过滤规则类型

## Obsidian 集成

核心功能，支持将文章保存到 Obsidian Vault:
- 配置 Vault 路径 (`lib/obsidian.ts`)
- 模板系统 (`lib/template-engine.ts`)
- 保存文章 API (`routes/obsidian.ts`)

模板变量: `{{title}}`, `{{content}}`, `{{url}}`, `{{source}}`, `{{date}}` 等

## API 路由

- `/api/subscriptions` - 订阅 CRUD、刷新、OPML 导入导出
- `/api/articles` - 文章列表、详情、标记已读/收藏
- `/api/categories` - 分类管理
- `/api/obsidian` - Obsidian 配置和保存

## 数据库模型

主要表:
- `subscriptions` - RSS 订阅源
- `articles` - 文章
- `categories` - 分类
- `obsidian_notes` - Obsidian 笔记记录
- `user_preferences` - 用户偏好设置
- `ai_api_keys` - AI API 密钥 (Phase 2)

## 开发注意事项

1. **ES Modules**: 项目使用 `"type": "module"`，后端导入需使用 `.js` 扩展名
2. **共享包依赖**: 前后端通过 `@rss-reader/shared` 引用共享类型，修改后需重新构建
3. **CORS**: 后端已配置允许 `localhost:5173` 和 `localhost:3000`
4. **文章过滤**: 新订阅只导入最近一个月的文章
