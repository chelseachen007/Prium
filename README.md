# RSS 阅读器

一个现代化的 RSS 阅读器，支持与 Obsidian 深度联动。

## 功能特性

### Phase 1 (MVP) - 当前阶段

- **订阅管理**
  - 添加/删除/编辑订阅源
  - RSS/Atom 解析
  - 分类管理
  - OPML 导入/导出
  - 订阅源健康检测

- **阅读功能**
  - 文章列表展示（列表/卡片视图）
  - 文章阅读页面
  - 已读/未读状态
  - 星标/收藏功能
  - 全文搜索

- **Obsidian 联动** ⭐ 核心功能
  - 配置 Obsidian Vault 路径
  - 手动保存文章到 Obsidian
  - 模板系统
  - 自动提取 Front Matter 元数据
  - 附件下载

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- Pinia (状态管理)
- Vue Router

### 后端
- Node.js + Hono
- Prisma ORM
- SQLite (开发) / PostgreSQL (生产)

## 项目结构

```
rss-reader/
├── apps/
│   ├── web/                    # 前端应用
│   │   ├── src/
│   │   │   ├── components/     # 组件
│   │   │   ├── views/          # 页面
│   │   │   ├── stores/         # Pinia stores
│   │   │   ├── composables/    # 组合式函数
│   │   │   └── types/          # TypeScript 类型
│   │   └── package.json
│   │
│   └── server/                 # 后端应用
│       ├── src/
│       │   ├── routes/         # API 路由
│       │   ├── services/       # 业务逻辑
│       │   ├── lib/            # 工具库
│       │   └── db/             # 数据库
│       ├── prisma/
│       │   └── schema.prisma   # 数据模型
│       └── package.json
│
└── packages/
    └── shared/                 # 共享代码
        └── types/              # 共享类型定义
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
cd rss-reader

# 安装所有依赖
pnpm install

# 或者使用 npm
npm install
```

### 初始化数据库

```bash
cd apps/server
npx prisma db push
```

### 启动开发服务器

```bash
# 在项目根目录，同时启动前后端
pnpm dev:server  # 终端1 - 启动后端 (http://localhost:3001)
pnpm dev:web     # 终端2 - 启动前端 (http://localhost:5173)
```

### 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

## API 端点

### 订阅管理
- `GET /api/subscriptions` - 获取所有订阅
- `POST /api/subscriptions` - 添加订阅
- `PUT /api/subscriptions/:id` - 更新订阅
- `DELETE /api/subscriptions/:id` - 删除订阅
- `POST /api/subscriptions/import` - OPML 导入
- `GET /api/subscriptions/export` - OPML 导出

### 分类管理
- `GET /api/categories` - 获取所有分类
- `POST /api/categories` - 创建分类
- `PUT /api/categories/:id` - 更新分类
- `DELETE /api/categories/:id` - 删除分类

### 文章管理
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取单篇文章
- `PUT /api/articles/:id/read` - 标记已读
- `PUT /api/articles/:id/star` - 星标文章

### Obsidian 联动
- `GET /api/obsidian/config` - 获取配置
- `PUT /api/obsidian/config` - 更新配置
- `POST /api/obsidian/save/:articleId` - 保存文章
- `GET /api/obsidian/templates` - 获取模板列表
- `GET /api/obsidian/folders` - 获取文件夹列表

## Obsidian 模板

应用提供三个内置模板：

1. **RSS 文章模板** (`rss-article.md`) - 保存完整文章
2. **RSS 灵感模板** (`rss-inspiration.md`) - 记录灵感
3. **RSS 日报模板** (`rss-daily.md`) - 每日阅读汇总

### 可用变量

```
{{title}}        - 文章标题
{{content}}      - 文章内容
{{summary}}      - AI 摘要
{{url}}          - 原文链接
{{source}}       - 订阅源名称
{{author}}       - 作者
{{date}}         - 当前日期
{{readTime}}     - 预计阅读时间
{{#each tags}}   - 循环标签
{{#if summary}}  - 条件渲染
```

## 开发计划

- [x] 项目初始化
- [x] 数据库设计
- [x] API 路由实现
- [x] 前端页面开发
- [x] Obsidian 集成
- [ ] AI 摘要功能 (Phase 2)
- [ ] 重复检测 (Phase 2)
- [ ] 热点发现 (Phase 3)

## 许可证

MIT
