import { createAdminApi } from './adminApi'
import { adminEnvironment, supabase } from './supabase'

export const adminApi = createAdminApi({
  supabase,
  environment: adminEnvironment,
})
