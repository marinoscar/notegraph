import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import type { ReactNode } from 'react'
import { useSettings } from '../App'

/**
 * Lets the user choose the working folder that holds their content — the
 * source of truth (VISION.md §5.1a). Used full-screen as first-run onboarding
 * and inline on the Settings page.
 */
export function WorkingFolderPicker({ onboarding = false }: { onboarding?: boolean }): ReactNode {
  const { settings, chooseWorkingFolder } = useSettings()

  if (onboarding) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 520, textAlign: 'center' }} elevation={2}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Welcome to notegraph
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Choose a working folder where your notes will live as markdown files. This is your
            data — kept locally, readable and portable outside the app. You can change it later in
            Settings.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<FolderOpenIcon />}
            onClick={chooseWorkingFolder}
          >
            Choose working folder
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Working folder
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography
          sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}
          color={settings.workingFolderPath ? 'text.primary' : 'text.secondary'}
        >
          {settings.workingFolderPath ?? 'Not set'}
        </Typography>
        <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={chooseWorkingFolder}>
          Change folder
        </Button>
      </Stack>
    </Stack>
  )
}
