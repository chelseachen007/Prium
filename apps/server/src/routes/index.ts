/**
 * API 路由入口
 *
 * 统一管理所有 API 路由模块
 *
 * @module routes/index
 */

import { Hono } from 'hono';

// 导入各模块路由
import subscriptionsRouter from './subscriptions.js';
import categoriesRouter from './categories.js';
import { articlesRouter } from './articles.js';
import { obsidianRouter } from './obsidian.js';
// import filterRulesRouter from './filter-rules.js'
// import syncRouter from './sync.js'
// import aiRouter from './ai.js'
// import preferencesRouter from './preferences.js'

const routes = new Hono();

// API 版本信息
routes.get('/', (c) => {
  return c.json({
    version: 'v1',
    endpoints: [
      '/subscriptions',
      '/articles',
      '/categories',
      '/filter-rules',
      '/sync',
      '/obsidian',
      '/ai',
      '/preferences',
    ],
  });
});

// 注册各模块路由
routes.route('/subscriptions', subscriptionsRouter);
routes.route('/categories', categoriesRouter);
routes.route('/articles', articlesRouter);
routes.route('/obsidian', obsidianRouter);
// routes.route('/filter-rules', filterRulesRouter)
// routes.route('/sync', syncRouter)
// routes.route('/ai', aiRouter)
// routes.route('/preferences', preferencesRouter)

// 测试路由（开发阶段）
routes.get('/test', (c) => {
  return c.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

// 健康检查路由
routes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { routes };
