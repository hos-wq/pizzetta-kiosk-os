import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const manifest = document.getElementById('pizzetta-manifest') as HTMLLinkElement | null
if (manifest && window.location.pathname.startsWith('/restaurant')) manifest.href = '/manifest-restaurant.webmanifest'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw-pizzetta.js', { scope: '/' }).then(registration => registration.update()).catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
