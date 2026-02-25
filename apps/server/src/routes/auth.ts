import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { generateState } from 'oslo/cookie'
import { setCookie, deleteCookie } from 'hono/cookie'
import {
  getAuthUrl,
  getAccessToken,
  getGithubUser,
  getGithubUserEmails,
} from '../lib/github-oauth.js'
import { prisma } from '../db/index.js'

const app = new Hono()

// 环境变量验证
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn('⚠️  GitHub OAuth credentials not configured in .env file')
}

// GitHub 登录路由
app.get('/auth/github', async (c) => {
  // 生成随机状态用于 CSRF 保护
  const state = generateState(128)

  // 保存 state 到 cookie
  setCookie(c, 'github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600, // 10 分钟
    path: '/',
  })

  // 生成授权 URL
  const authUrl = getAuthUrl(state)

  // 重定向到 GitHub 授权页面
  return c.redirect(authUrl)
})

// GitHub OAuth 回调路由
app.get('/auth/github/callback', async (c) => {
  // 获取查询参数
  const { code, state } = c.req.query()
  const cookieState = c.req.cookie('github_oauth_state')

  // 验证 state（防止 CSRF 攻击）
  if (!state || !cookieState || state !== cookieState) {
    deleteCookie(c, 'github_oauth_state', { path: '/' })
    return c.json({ success: false, error: 'Invalid state parameter' }, 400)
  }

  // 删除 state cookie
  deleteCookie(c, 'github_oauth_state', { path: '/' })

  // 检查授权码
  if (!code || typeof code !== 'string') {
    return c.json({ success: false, error: 'No authorization code' }, 400)
  }

  try {
    // 交换授权码获取访问令牌
    const { accessToken } = await getAccessToken(code)

    // 获取 GitHub 用户信息
    const githubUser = await getGithubUser(accessToken)
    const email = await getGithubUserEmails(accessToken)

    // 查找或创建用户
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id.toString() },
      update: {
        name: githubUser.name || githubUser.login,
        email: email,
        avatar: githubUser.avatar_url,
        githubLogin: githubUser.login,
        githubAccessToken: accessToken,
        lastLoginAt: new Date(),
      },
      create: {
        githubId: githubUser.id.toString(),
        name: githubUser.name || githubUser.login,
        email: email,
        avatar: githubUser.avatar_url,
        githubLogin: githubUser.login,
        githubAccessToken: accessToken,
      },
    })

    // 设置用户会话 cookie（简化版，实际应使用 JWT）
    setCookie(c, 'user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    })

    // 重定向到前端
    return c.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?success=true`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return c.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent((error as any).message)}`
    )
  }
})

// 获取当前用户信息
app.get('/auth/me', async (c) => {
  const userId = c.req.cookie('user_id')

  if (!userId) {
    return c.json({ success: false, error: 'Not authenticated' }, 401)
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        githubLogin: true,
        createdAt: true,
      },
    })

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({ success: true, data: user })
  } catch (error) {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// 登出
app.post('/auth/logout', (c) => {
  deleteCookie(c, 'user_id', { path: '/' })
  return c.json({ success: true, message: 'Logged out successfully' })
})

export default app
