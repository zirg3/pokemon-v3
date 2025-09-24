import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

// Create a singleton Supabase client
let supabaseInstance: any = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(`https://${projectId}.supabase.co`, publicAnonKey)
  }
  return supabaseInstance
}

// Export the singleton instance
export const supabase = getSupabaseClient()