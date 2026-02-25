# GitHub OAuth 配置指南

## 快速开始

### 1. 创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **OAuth Apps** → **New OAuth App**

填写以下信息：

| 配置项 | 值 |
|--------|-----|
| **Application name** | Prium RSS Reader |
| **Homepage URL** | `https://rss.trotter.top` |
| **Application description** | RSS 阅读器，支持 GitHub 登录和文章管理 |
| **Authorization callback URL** | `https://rss.trotter.top/api/auth/github/callback` |
| **Application type** | Web application |

### 2. 选择授权范围

```
- [x] user:email          # 获取用户邮箱
- [x] user:read          # 读取公开信息
```

### 3. 生成密钥

创建后会得到：

- **Client ID**: `gh_xxxxxxxx`（公开，可以分享）
- **Client Secret**: `ghp_xxxxxxxxx`（私密，需妥善保存）

## 环境变量配置

在项目根目录创建或更新 `.env` 文件：

```bash
# GitHub OAuth 配置
GITHUB_CLIENT_ID=gh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=https://rss.trotter.top/api/auth/github/callback

# 前端地址（用于 OAuth 回调重定向）
FRONTEND_URL=https://rss.trotter.top
```

### 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | ✅ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | ✅ |
| `GITHUB_REDIRECT_URI` | OAuth 回调地址（必须与 GitHub App 中配置一致） | ✅ |
| `FRONTEND_URL` | 前端地址（用于 OAuth 回调后的重定向） | ✅ |

## API 端点

### GitHub 登录流程

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/auth/github` | 发起 GitHub 登录 |
| GET | `/api/auth/github/callback` | GitHub OAuth 回调 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/logout` | 登出 |

### 使用示例

#### 前端发起登录

```javascript
// 跳转到 GitHub 登录
window.location.href = '/api/auth/github'
```

#### 获取当前用户

```javascript
const response = await axios.get('/api/auth/me')
console.log(response.data.data)
```

## 前端集成

### 1. 登录按钮

```vue
<script setup>
const handleLogin = () => {
  // 跳转到后端登录接口
  window.location.href = '/api/auth/github'
}
</script>

<template>
  <button @click="handleLogin" class="btn btn-github">
    <svg class="w-5 h-5" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.386.5.302 11.386-12 0 0-.228 0-.4-.109-.537-.312-.197-.775-.252-1.595-.252-2.283 0-.857.453-1.62.557-2.283 1.574 1.574 3.938 1.574 5.512-3.938 0-7.086-3.074-7.086-7.086 0-.391 0-.568-.427-1.717.327-.568 1.717-2.086 5.826-2.086 8.514 0 .428.318.734.557 1.35 1.083 1.35 2.866 0 1.439-.847 2.866-1.62 2.866-3.938 0-7.086-3.074-7.086-7.086 0-.485-.369-1.028-.773-1.717.404-1.717 2.777 0-2.554-1.62-2.777-3.938 0-6.627-5.373-12-12 0-5.302 3.438-9.8 8.207-11.386.5.302-11.386-12 0 0-.228 0-.4-.109-.537-.312-.197-.775-.252-1.595-.252-2.283 0-.857.453-1.62.557-2.283 1.574 1.574 3.938 1.574 5.512-3.938 0-7.086-3.074-7.086-7.086 0-.391 0-.568-.427-1.717.327-.568 1.717-2.086 5.826-2.086 8.514 0 .428.318.734.557 1.35 1.083 1.35 2.866 0 1.439-.847 2.866-1.62 2.866-3.938 0-7.086-3.074-7.086-7.086z"/>
    </svg>
    Login with GitHub
  </button>
</template>
```

### 2. 检查登录状态

```vue
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const user = ref(null)
const loading = ref(true)

const fetchUser = async () => {
  try {
    const response = await axios.get('/api/auth/me')
    user.value = response.data.data
  } catch (error) {
    user.value = null
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  await axios.post('/api/auth/logout')
  user.value = null
}

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="user">
      <img :src="user.avatar" alt="Avatar" class="w-8 h-8 rounded-full" />
      <span>{{ user.name }}</span>
      <button @click="handleLogout">Logout</button>
    </div>
    <div v-else>
      <button @click="window.location.href='/api/auth/github'">Login</button>
    </div>
  </div>
</template>
```

## 数据库表结构

### User 表

```prisma
model User {
  id                String   @id @default(cuid())
  githubId          String   @unique
  name              String?
  email             String?
  avatar            String?
  githubLogin       String?
  githubAccessToken String
  lastLoginAt       DateTime @updatedAt
  createdAt         DateTime @default(now())
}
```

## 安全注意事项

1. **Client Secret 保护**
   - 永远不要在前端暴露 Client Secret
   - 只在服务器端使用

2. **State 参数**
   - 使用随机 state 防止 CSRF 攻击
   - 验证回调的 state 是否与生成的一致

3. **HTTPS**
   - 生产环境必须使用 HTTPS
   - 本地开发可以使用 HTTP

4. **Cookie 安全**
   - 设置 `httpOnly` 防止 XSS 攻击
   - 设置 `secure` 在 HTTPS 下
   - 设置 `sameSite: 'Lax'`

5. **令牌存储**
   - 访问令牌安全存储在数据库中
   - 考虑使用 JWT 进行会话管理

## 故障排查

### 授权回调失败

检查：
1. GitHub OAuth App 的 Authorization callback URL 是否正确
2. 环境变量 `GITHUB_REDIRECT_URI` 是否匹配
3. 前端 URL `FRONTEND_URL` 是否正确

### 无法获取用户邮箱

检查：
1. GitHub App 是否请求了 `user:email` 权限
2. 用户的主邮箱是否已验证
3. 用户邮箱设置为公开

### CORS 错误

更新后端 CORS 配置：

```typescript
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rss.trotter.top',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}))
```

## 测试

### 本地测试

1. 配置本地环境变量：

```bash
cd apps/server
cp .env.example .env
# 编辑 .env，填入你的 GitHub Client ID 和 Secret
```

2. 启动后端服务器：

```bash
pnpm dev
```

3. 访问 `http://localhost:3001/api/auth/github`

4. 完成 GitHub 授权后，应该会被重定向到前端

### 生产环境测试

1. 部署到生产环境
2. 确保环境变量正确配置
3. 测试完整的 OAuth 流程

## 下一步

- [ ] 实现 JWT 令牌认证
- [ ] 添加用户个人资料页面
- [ ] 实现订阅源共享功能
- [ ] 添加 GitHub Star 按钮（如果项目开源）
