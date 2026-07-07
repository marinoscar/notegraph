import { Box, Stack, TextField, Typography } from '@mui/material'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { ReactNode } from 'react'
import { useSettings } from '../App'
import { resolveMode } from '../theme'
import type { SaveState } from '../pages/NotesPage'

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'All changes saved',
  saving: 'Saving…',
  saved: 'Saved'
}

export function NoteEditor({
  title,
  body,
  onChange,
  saveState
}: {
  title: string
  body: string
  onChange: (patch: { title?: string; body?: string }) => void
  saveState: SaveState
}): ReactNode {
  const { settings } = useSettings()
  const mode = resolveMode(settings.theme)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 1 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          variant="standard"
          placeholder="Untitled"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          InputProps={{ style: { fontSize: '1.4rem', fontWeight: 600 } }}
          fullWidth
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {SAVE_LABEL[saveState]}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <CodeMirror
          value={body}
          height="100%"
          theme={mode}
          extensions={[markdown()]}
          onChange={(value) => onChange({ body: value })}
          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
          style={{ height: '100%', fontSize: '0.95rem' }}
        />
      </Box>
    </Box>
  )
}
