import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw-pizzetta.js', { scope: '/' }).then(registration => registration.update()).catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
import '../../../UI/src/index.css';
