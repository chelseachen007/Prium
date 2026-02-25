import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const router = useRouter()
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function login(email: string, password: string): Promise<void> {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      })
      const { token, user } = response.data
      setToken(token)
      setUser(user)
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.response?.data?.message || '登录失败')
    }
  }

  async function register(email: string, password: string, name?: string): Promise<void> {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        name
      })
      const { token, user } = response.data
      setToken(token)
      setUser(user)
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.response?.data?.message || '注册失败')
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    setUser,
    logout,
    login,
    register
  }
})
