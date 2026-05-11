import { createContext, useContext, useState } from 'react'
import { ENV_CONFIGS } from '../lib/clients'

const EnvContext = createContext(null)

const STORAGE_KEY = 'solum_admin_env'

export function EnvProvider({ children }) {
  const [env, setEnv] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Default to dev — must explicitly confirm to switch to prod
    return stored === 'prod' ? 'prod' : 'dev'
  })

  const switchEnv = (newEnv) => {
    localStorage.setItem(STORAGE_KEY, newEnv)
    setEnv(newEnv)
  }

  return (
    <EnvContext.Provider value={{ env, config: ENV_CONFIGS[env], switchEnv }}>
      {children}
    </EnvContext.Provider>
  )
}

export function useEnv() {
  return useContext(EnvContext)
}
