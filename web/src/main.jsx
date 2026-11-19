import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initialRouteLoader } from './lib/routeLoaders.js'
import { initAnalytics } from './lib/analytics.js'

initAnalytics();

const root = document.getElementById('root')
const mount = () => createRoot(root).render(<StrictMode><App /></StrictMode>)
if (root.hasChildNodes()) {
  initialRouteLoader(window.location.pathname)().then(mount, mount)
} else {
  mount()
}
