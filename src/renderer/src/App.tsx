import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsIcon from '@mui/icons-material/Settings'
import NotesIcon from '@mui/icons-material/Notes'
import type { AppSettings, ThemeMode } from '@shared/types'
import { api } from './ipc/client'
import { buildTheme, resolveMode } from './theme'
import { NotesPage } from './pages/NotesPage'
import { SettingsPage } from './pages/SettingsPage'
import { WorkingFolderPicker } from './components/WorkingFolderPicker'

interface SettingsContextValue {
  settings: AppSettings
  setTheme: (mode: ThemeMode) => Promise<void>
  chooseWorkingFolder: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within <App>')
  return ctx
}

export function App(): ReactNode {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [systemTick, setSystemTick] = useState(0)
  const location = useLocation()

  useEffect(() => {
    api.settings.get().then(setSettings)
  }, [])

  // Re-render on OS theme change while in "system" mode.
  useEffect(() => {
    if (settings?.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemTick((t) => t + 1)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings?.theme])

  const theme = useMemo(
    () => buildTheme(settings?.theme ?? 'system'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings?.theme, systemTick]
  )

  const ctx = useMemo<SettingsContextValue | null>(() => {
    if (!settings) return null
    return {
      settings,
      setTheme: async (mode) => {
        await api.settings.setTheme(mode)
        setSettings((s) => (s ? { ...s, theme: mode } : s))
      },
      chooseWorkingFolder: async () => {
        const picked = await api.settings.pickWorkingFolder()
        if (!picked) return
        const next = await api.settings.setWorkingFolder(picked)
        setSettings(next)
      }
    }
  }, [settings])

  if (!settings || !ctx) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    )
  }

  const resolved = resolveMode(settings.theme)
  const onSettings = location.pathname === '/settings'

  return (
    <SettingsContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar variant="dense">
              <Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>
                notegraph
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={resolved === 'dark' ? 'Switch to light' : 'Switch to dark'}>
                <IconButton
                  onClick={() => ctx.setTheme(resolved === 'dark' ? 'light' : 'dark')}
                  size="small"
                >
                  {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
              <Button
                component={Link}
                to={onSettings ? '/' : '/settings'}
                startIcon={onSettings ? <NotesIcon /> : <SettingsIcon />}
                size="small"
                color="inherit"
              >
                {onSettings ? 'Notes' : 'Settings'}
              </Button>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            {!settings.workingFolderPath ? (
              <WorkingFolderPicker onboarding />
            ) : (
              <Routes>
                <Route path="/" element={<NotesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            )}
          </Box>
        </Box>
      </ThemeProvider>
    </SettingsContext.Provider>
  )
}
