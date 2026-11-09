import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { routePreload } from './build/routePreload.js'

export default defineConfig({
  plugins: [react(), routePreload()],
})
