import { Hono } from 'hono'

const app = new Hono()

// 路由导入
import subscriptions from './subscriptions'
import articles from './articles'
import categories from './categories'
import obsidian from './obsidian'
import auth from './auth'

// 注册路由
app.route('/subscriptions', subscriptions)
app.route('/articles', articles)
app.route('/categories', categories)
app.route('/obsidian', obsidian)
app.route('/auth', auth)

// 健康检查
app.get('/health', (c) => {
  return c.json({
    success: true,
    service: 'RSS Reader API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

export default app
