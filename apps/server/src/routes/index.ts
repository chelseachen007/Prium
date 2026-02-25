import { Hono } from 'hono'

const app = new Hono()

// 导入各模块路由
import subscriptionsRouter from './subscriptions.js';
import categoriesRouter from './categories.js';
import { articlesRouter } from './articles.js';
import { obsidianRouter } from './obsidian.js';
import { auth } from './auth.js';
// import filterRulesRouter from './filter-rules.js'
// import syncRouter from './sync.js'
// import aiRouter from './ai.js'
// import preferencesRouter from './preferences.js'

// 注册路由
app.route('/subscriptions', subscriptionsRouter)
app.route('/articles', articlesRouter)
app.route('/categories', categoriesRouter)
app.route('/obsidian', obsidianRouter)
app.route('/auth', auth)

// 健康检查
app.get('/health', (c) => {
  return c.json({
    version: 'v1',
    endpoints: [
      '/subscriptions',
      '/articles',
      '/categories',
      '/auth',
      '/filter-rules',
      '/sync',
      '/obsidian',
      '/ai',
      '/preferences',
    ],
  });
});

// 注册各模块路由
// routes.route('/subscriptions', subscriptionsRouter);
// routes.route('/categories', categoriesRouter);
// routes.route('/articles', articlesRouter);
// routes.route('/obsidian', obsidianRouter);
// routes.route('/auth', auth);
// routes.route('/filter-rules', filterRulesRouter)
// routes.route('/sync', syncRouter)
// routes.route('/ai', aiRouter)
// routes.route('/preferences', preferencesRouter)

// 测试路由（开发阶段）
app.get('/test', (c) => {
  return c.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  })
})

export default app
