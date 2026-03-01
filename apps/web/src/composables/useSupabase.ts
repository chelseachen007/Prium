/**
 * Supabase Client Composable
 * @module composables/useSupabase
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase 配置缺失，请检查环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
}

/**
 * Supabase 客户端实例
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

/**
 * useSupabase Composable
 *
 * 提供 Supabase 客户端访问
 *
 * @example
 * ```typescript
 * const supabase = useSupabase()
 *
 * // 查询数据
 * const { data, error } = await supabase.from('subscriptions').select('*')
 * ```
 */
export function useSupabase() {
  return supabase
}

export default supabase
