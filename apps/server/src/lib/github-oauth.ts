import { OAuth2Client } from 'oslo/oauth2'

// GitHub OAuth2 配置
export const githubOAuth2Client = new OAuth2Client({
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  authorizeEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  redirectURI: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/auth/github/callback',
})

// 授权范围
export const SCOPES = ['user:email', 'user:read'] as const

// 获取授权 URL
export function getAuthUrl(state: string): string {
  return githubOAuth2Client.getAuthorizationUri(state, SCOPES)
}

// 交换授权码获取访问令牌
export async function getAccessToken(code: string) {
  const result = await githubOAuth2Client.validateAuthorizationCode(code)

  if (!result.tokens) {
    throw new Error('Failed to get access token')
  }

  return {
    accessToken: result.tokens.access_token,
    refreshToken: result.tokens.refresh_token,
    tokenType: result.tokens.token_type,
    expiresIn: result.tokens.expires_in,
  }
}

// 获取 GitHub 用户信息
export async function getGithubUser(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user')
  }

  return await response.json()
}

// 获取 GitHub 用户邮箱
export async function getGithubUserEmails(accessToken: string) {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user emails')
  }

  const emails = await response.json()
  // 查找主邮箱
  const primaryEmail = emails.find((email: any) => email.primary && email.verified)

  if (!primaryEmail) {
    throw new Error('No verified email found')
  }

  return primaryEmail.email
}
