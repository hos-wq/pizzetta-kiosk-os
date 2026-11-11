import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(async () => {
  cleanup()
  await new Promise<void>((resolve) => setTimeout(resolve, 50))
  document.querySelectorAll('.br-lightbox-backdrop, .br-lightbox-viewport, .br-lightbox-confirm').forEach((node) => node.remove())
  document.body.className = ''
})
