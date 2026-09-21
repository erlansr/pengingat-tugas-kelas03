import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/figtree'
import '@fontsource-variable/bricolage-grotesque'
import './hooks/useInstall' // pasang listener beforeinstallprompt sedini mungkin
import './index.css'
import App from './App'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
