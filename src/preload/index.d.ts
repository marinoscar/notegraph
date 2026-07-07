import type { NotegraphApi } from '@shared/api'

declare global {
  interface Window {
    notegraph: NotegraphApi
  }
}

export {}
