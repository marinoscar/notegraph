import { createTheme, type Theme } from '@mui/material/styles'
import type { ThemeMode } from '@shared/types'

/** Resolve a stored ThemeMode ('system' → OS preference) to a concrete mode. */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode: resolveMode(mode),
      primary: { main: '#4f6df5' }
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily:
        'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }
  })
}
