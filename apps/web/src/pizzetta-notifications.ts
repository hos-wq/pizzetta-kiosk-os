let audioContext: AudioContext | null = null

function playCrustChime() {
  try {
    audioContext ??= new AudioContext()
    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(523.25, now)
    oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.16)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.36)
  } catch { /* Audio is optional until the user has interacted with the page. */ }
}

export function setPizzettaBadge(value: number) {
  const badge = Math.max(0, Math.floor(value))
  const navigatorWithBadge = navigator as Navigator & { setAppBadge?: (contents?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (badge > 0) void navigatorWithBadge.setAppBadge?.(badge)
  else void navigatorWithBadge.clearAppBadge?.()
  if (badge > 0) document.title = `(${badge}) Pizzetta`
  else document.title = 'Pizzetta Kiosk'
}

export async function enablePizzettaNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'default') await Notification.requestPermission()
  return Notification.permission
}

export function announcePizzettaEvent(title: string, body: string, badge = 1) {
  setPizzettaBadge(badge)
  playCrustChime()
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: '/brand/pizzetta-logo-paper-border.svg', badge: '/brand/pizzetta-logo-paper-border.svg', tag: 'pizzetta-order-update' }) } catch { /* iOS may require a service-worker notification. */ }
  }
}

export function registerPizzettaNotificationUnlock() {
  const unlock = () => { playCrustChime(); window.removeEventListener('pointerdown', unlock) }
  window.addEventListener('pointerdown', unlock, { once: true })
}
