/// <reference types="vite/client" />

declare module '*.css'

import type { MoloApi } from '../electron/preload'

declare global {
  interface Window {
    molo?: MoloApi
  }
}

export {}
