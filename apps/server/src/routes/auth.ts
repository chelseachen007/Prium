import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { prisma } from '../db/index.js'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const auth = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key'
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173'

// 注册 schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

// 登录 schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

/**
 * 账号密码注册
 */
auth.post('/register', async (c) => {
  const body = await c.req.json()
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid input' })
  }

  const { email, password, name } = result.data

  // 检查邮箱是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new HTTPException(400, { message: 'Email already exists' })
  }

  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10)

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })

  // 生成 JWT
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  }
  const token = await sign(payload, JWT_SECRET)

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
})

/**
 * 账号密码登录
 */
auth.post('/login', async (c) => {
  const body = await c.req.json()
  const result = loginSchema.safeParse(body)

  if (!result.success) {
    throw new HTTPException(400, { message: 'Invalid input' })
  }

  const { email, password } = result.data

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    throw new HTTPException(401, { message: 'Invalid email or password' })
  }

  // 验证密码
  const validPassword = await bcrypt.compare(password, user.password)

  if (!validPassword) {
    throw new HTTPException(401, { message: 'Invalid email or password' })
  }

  // 生成 JWT
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  }
  const token = await sign(payload, JWT_SECRET)

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
})

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/auth/github/callback'

// Google OAuth 配置
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'

/**
 * GitHub 登录跳转
 */
auth.get('/github', (c) => {
  if (!GITHUB_CLIENT_ID) {
    throw new HTTPException(500, { message: 'GitHub Client ID not configured' })
  }
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=user:email`
  return c.redirect(url)
})

/**
 * GitHub 回调处理
 */
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.redirect(`${WEB_URL}/login?error=no_code`)
  }

  try {
    // 1. 获取 Access Token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    })

    const tokenData = await tokenResponse.json() as any
    if (tokenData.error) {
      throw new Error(tokenData.error_description)
    }

    const accessToken = tokenData.access_token

    // 2. 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const userData = await userResponse.json() as any

    // 3. 获取用户邮箱（如果是私有的）
    let email = userData.email
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const emails = await emailsResponse.json() as any[]
      const primaryEmail = emails.find((e: any) => e.primary && e.verified)
      if (primaryEmail) {
        email = primaryEmail.email
      }
    }

    if (!email) {
      return c.redirect(`${WEB_URL}/login?error=no_email`)
    }

    // 4. 查找或创建用户
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { accounts: { some: { provider: 'github', providerAccountId: String(userData.id) } } }
        ]
      },
      include: { accounts: true }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: userData.name || userData.login,
          avatarUrl: userData.avatar_url,
          accounts: {
            create: {
              type: 'oauth',
              provider: 'github',
              providerAccountId: String(userData.id),
              accessToken,
            }
          }
        },
        include: { accounts: true }
      })
    } else {
      // 检查是否已关联该 GitHub 账号，如果没有则关联
      const existingAccount = user.accounts.find(acc => acc.provider === 'github' && acc.providerAccountId === String(userData.id))
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'github',
            providerAccountId: String(userData.id),
            accessToken,
          }
        })
      }
    }

    // 5. 生成 JWT Token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }
    const token = await sign(payload, JWT_SECRET)

    // 6. 重定向回前端
    return c.redirect(`${WEB_URL}/auth/callback?token=${token}`)

  } catch (error) {
    console.error('GitHub Auth Error:', error)
    return c.redirect(`${WEB_URL}/login?error=auth_failed`)
  }
})

/**
 * Google 登录跳转
 */
auth.get('/google', (c) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new HTTPException(500, { message: 'Google Client ID not configured' })
  }
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`
  return c.redirect(url)
})

/**
 * Google 回调处理
 */
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.redirect(`${WEB_URL}/login?error=no_code`)
  }

  try {
    // 1. 获取 Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json() as any
    if (tokenData.error) {
      throw new Error(tokenData.error_description)
    }

    // 2. 获取用户信息
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const userData = await userResponse.json() as any

    // 3. 查找或创建用户
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { accounts: { some: { provider: 'google', providerAccountId: userData.id } } }
        ]
      },
      include: { accounts: true }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          avatarUrl: userData.picture,
          accounts: {
            create: {
              type: 'oauth',
              provider: 'google',
              providerAccountId: userData.id,
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
            }
          }
        },
        include: { accounts: true }
      })
    } else {
      const existingAccount = user.accounts.find(acc => acc.provider === 'google' && acc.providerAccountId === userData.id)
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: userData.id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
          }
        })
      }
    }

    // 4. 生成 JWT Token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    }
    const token = await sign(payload, JWT_SECRET)

    // 5. 重定向回前端
    return c.redirect(`${WEB_URL}/auth/callback?token=${token}`)

  } catch (error) {
    console.error('Google Auth Error:', error)
    return c.redirect(`${WEB_URL}/login?error=auth_failed`)
  }
})

/**
 * 获取当前用户信息 (需要在前端请求头带 Authorization: Bearer <token>)
 */
// 注意：这部分通常需要在应用层添加中间件来解析 JWT 并放入 Context
// 这里仅作为示例，如果需要受保护的路由，应添加 verifyJwt 中间件

export { auth }
