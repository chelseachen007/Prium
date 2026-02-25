# Prium - GitHub OAuth 配置

## GitHub OAuth App 设置

### 1. 创建 GitHub OAuth App

访问 [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**

填写以下信息：

| 配置项 | 值 |
|--------|-----|
| **Application name** | Prium RSS Reader |
| **Homepage URL** | `https://rss.trotter.top` |
| **Application description** | RSS 阅读器，支持 GitHub 登录和文章管理 |
| **Authorization callback URL** | `https://rss.trotter.top/api/auth/github/callback` |
| **Application type** | Web application |

### 2. 授权范围

选择以下权限：

```
- [x] user:email          # 获取用户邮箱
- [x] user:read          # 读取公开信息
```

### 3. 获取密钥

创建后会得到：
- **Client ID**: `gh_xxxxxxxx`
- **Client Secret**: `ghp_xxxxxxxxx`

## Prium 环境变量配置

在项目根目录创建或更新 `.env` 文件：

```bash
# GitHub OAuth 配置
GITHUB_CLIENT_ID=gh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REDIRECT_URI=https://rss.trotter.top/api/auth/github/callback

# 前端地址（用于 OAuth 回调）
FRONTEND_URL=https://rss.trotter.top
```

### 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | ✅ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | ✅ |
| `GITHUB_REDIRECT_URI` | OAuth 回调地址 | ✅ |
| `FRONTEND_URL` | 前端地址（用于回调重定向） | ✅ |

## 部署步骤

### 1. 本地开发

```bash
cd apps/server

# 更新 Prisma Schema（添加 User 表）
npx prisma generate
npx prisma db push

# 安装新依赖
pnpm install oslo oauth2

# 启动服务器
pnpm dev
```

### 2. Docker 部署

更新 `apps/server/Dockerfile` 和 `docker-compose.yml` 以包含环境变量。

```bash
cd /home/admin/deploy

# 更新环境变量
vim .env

# 重新部署
./deploy.sh -r prium
```

## API 端点

### GitHub 登录流程

1. **前端发起登录**
   ```
   GET /api/auth/github
   ```
   - 生成授权 URL
   - 保存 state 到 cookie
   - 重定向到 GitHub

2. **GitHub 授权页面**
   - 用户授权
   - 重定向回回调 URL

3. **处理回调**
   ```
   GET /api/auth/github/callback?code=xxx&state=xxx
   ```
   - 验证 state
   - 交换 code 获取 access token
   - 获取 GitHub 用户信息
   - 创建或更新用户
   - 设置用户 cookie
   - 重定向到前端

4. **获取当前用户**
   ```
   GET /api/auth/me
   ```
   - 从 cookie 获取用户 ID
   - 返回用户信息

### API 端点列表

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/auth/github` | 发起 GitHub 登录 |
| GET | `/api/auth/github/callback` | GitHub OAuth 回调 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/logout` | 登出 |

## 数据库表结构

需要添加 User 表来存储 GitHub 用户信息：

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

## 前端集成

### 1. 登录按钮

```vue
<script setup>
import { useNavigate } from 'vue-router'

const navigate = useNavigate()

const handleLogin = () => {
  // 跳转到后端登录接口
  window.location.href = '/api/auth/github'
}
</script>

<template>
  <button @click="handleLogin" class="flex items-center gap-2">
    <svg class="w-5 h-5" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.386.5.302 11.386-12 0 0-6.627-5.373-12-12zm5.854 0c-.228 0-.4-.109-.537-.312-.197-.775-.252-1.595-.252-2.283 0-.857.453-1.62.557-2.283 1.574 1.574 3.938 1.574 5.512-3.938 0-7.086-3.074-7.086-7.086 0-.391 0-.568-.427-1.717.327-.568 1.717-2.086 5.826-2.086 8.514 0 .428.318.734.557 1.35 1.083 1.35 2.866 0 2.283-1.348 2.866-2.97 0-.485-.369-1.028-.773-1.717.404-1.717-2.777 0-2.554-1.62-2.777-3.938 0 .321.245.734.496 1.598 1.083 1.598 2.866 0 1.439-.847 2.866-1.973 0-3.548-2.27-3.548-5.927 0 .485-.734 1.028-1.717 1.717-2.777 0-1.574-.847-2.97-1.62-3.938 0 .321-.734.496-1.598 1.083-1.598 2.866 0 2.554 1.277 2.777 1.62 3.938 0 .193.734.557.1.598 1.083 1.598 2.866 0 .734 1.717-.369 2.283-.773 2.283-1.973 0-1.083.568-1.62 2.777-.252 2.777-3.548-1.277 2.97-.252 3.938-1.598 5.512-3.938 8.514 0 .321.734.557.1.598 1.083 1.598 2.866 0 .193.245.734.496 1.598 1.083 1.598 2.866 0 .734 1.717.369 2.283.773 2.283 1.973 0 1.574.847 2.777 1.62 3.938 0 .321.734.557.1.598 1.083 1.598 2.866 0 .485 1.717.252 2.283.773 2.283 1.973 0 2.554 1.277 2.777 1.62 3.938 0 .321.734.557 1.598 1.083 1.598 2.866 0 .193.734.557 1.496 1.598 2.866 0 .857 1.598 2.866 3.938 0 .321.734.557 1.598 1.083 1.598 2.866 0 .857 1.598 2.866 3.938z"/>
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

## 安全注意事项

1. **Client Secret 保护**：永远不要在前端暴露 Client Secret
2. **State 参数**：使用随机 state 防止 CSRF 攻击
3. **HTTPS**：生产环境必须使用 HTTPS
4. **Cookie 安全**：设置 httpOnly、secure、sameSite
5. **令牌存储**：访问令牌安全存储在数据库中

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

更新后端 CORS 配置，允许 `https://rss.trotter.top`：
```typescript
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://rss.trotter.top',
  ],
  // ...
}))
```
