import { Box, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { ThemeMode } from '@shared/types'
import { useSettings } from '../App'
import { WorkingFolderPicker } from '../components/WorkingFolderPicker'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

export function SettingsPage(): ReactNode {
  const { settings, setTheme } = useSettings()

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 720 }} elevation={1}>
        <Stack spacing={3}>
          <WorkingFolderPicker />
          <Divider />
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Appearance
            </Typography>
            <TextField
              select
              label="Theme"
              value={settings.theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              sx={{ maxWidth: 240 }}
              size="small"
            >
              {THEME_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Divider />
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" color="text.secondary">
              About
            </Typography>
            <Typography variant="body2" color="text.secondary">
              notegraph is fully local. Your notes never leave this device.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Local user id: {settings.ownerId}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
