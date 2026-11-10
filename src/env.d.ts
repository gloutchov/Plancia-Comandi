/// <reference types="vite/client" />

declare module '*.css'

import type { PlanciaApi } from '../electron/preload'

declare global {
  interface Window {
    plancia?: PlanciaApi
  }
}

export {}
