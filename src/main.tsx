import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

let updateSW: (reload?: boolean) => Promise<void> = async () => {}

updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdates = () => {
      if (navigator.onLine) {
        void registration.update()
      }
    }

    checkForUpdates()

    const intervalId = window.setInterval(checkForUpdates, 30 * 60 * 1000)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    })

    window.addEventListener('online', checkForUpdates)

    window.addEventListener('beforeunload', () => {
      window.clearInterval(intervalId)
    })
  },
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('pwa-update-available', {
        detail: { updateSW },
      }),
    )
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
