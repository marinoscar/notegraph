import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import HistoryIcon from '@mui/icons-material/History'
import type { NoteSummary, NoteVersion, SearchResult } from '@shared/types'
import { api } from '../ipc/client'
import { SearchBar } from '../components/SearchBar'
import { NoteList, type NoteListItem } from '../components/NoteList'
import { NoteEditor } from '../components/NoteEditor'

export type SaveState = 'idle' | 'saving' | 'saved'

const AUTOSAVE_MS = 800
const SEARCH_MS = 250

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function NotesPage(): ReactNode {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState<NoteVersion[]>([])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function refreshList(): Promise<NoteSummary[]> {
    const list = await api.notes.list()
    setNotes(list)
    return list
  }

  useEffect(() => {
    refreshList()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  async function selectNote(id: string): Promise<void> {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const note = await api.notes.get(id)
    if (!note) {
      await refreshList()
      return
    }
    setSelectedId(id)
    setTitle(note.title)
    setBody(note.body)
    setSaveState('idle')
  }

  function scheduleSave(id: string, nextTitle: string, nextBody: string): void {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(async () => {
      await api.notes.save(id, { title: nextTitle, body: nextBody })
      setSaveState('saved')
      await refreshList()
    }, AUTOSAVE_MS)
  }

  function handleEditorChange(patch: { title?: string; body?: string }): void {
    if (!selectedId) return
    const nextTitle = patch.title ?? title
    const nextBody = patch.body ?? body
    if (patch.title !== undefined) setTitle(patch.title)
    if (patch.body !== undefined) setBody(patch.body)
    scheduleSave(selectedId, nextTitle, nextBody)
  }

  async function handleNew(): Promise<void> {
    const note = await api.notes.create()
    await refreshList()
    await selectNote(note.id)
  }

  async function handleDelete(): Promise<void> {
    if (!selectedId) return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    await api.notes.delete(selectedId)
    setSelectedId(null)
    setTitle('')
    setBody('')
    await refreshList()
  }

  function handleSearchChange(text: string): void {
    setSearch(text)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (text.trim() === '') {
      setResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setResults(await api.search.query(text))
    }, SEARCH_MS)
  }

  async function openVersions(): Promise<void> {
    if (!selectedId) return
    setVersions(await api.notes.versions(selectedId))
    setVersionsOpen(true)
  }

  async function restoreVersion(versionId: string): Promise<void> {
    const restored = await api.notes.restoreVersion(versionId)
    setVersionsOpen(false)
    if (restored) {
      setTitle(restored.title)
      setBody(restored.body)
      setSaveState('saved')
      await refreshList()
    }
  }

  const searching = search.trim() !== ''
  const items: NoteListItem[] = useMemo(() => {
    if (searching) {
      return results.map((r) => ({ id: r.id, title: r.title, subtitle: r.snippet }))
    }
    return notes.map((n) => ({ id: n.id, title: n.title, subtitle: formatDate(n.updatedAt) }))
  }, [searching, results, notes])

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left pane: search + list */}
      <Box
        sx={{
          width: 320,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Stack spacing={1} sx={{ p: 1.5 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} fullWidth>
            New note
          </Button>
          <SearchBar value={search} onChange={handleSearchChange} />
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <NoteList
            items={items}
            selectedId={selectedId}
            onSelect={selectNote}
            emptyLabel={searching ? 'No matches' : 'No notes yet — create one'}
          />
        </Box>
      </Box>

      {/* Right pane: editor */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedId ? (
          <>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ px: 2, pt: 1, alignItems: 'center' }}
            >
              <Tooltip title="Version history">
                <IconButton size="small" onClick={openVersions}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete note">
                <IconButton size="small" onClick={handleDelete} color="error">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <NoteEditor
                title={title}
                body={body}
                onChange={handleEditorChange}
                saveState={saveState}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">Select or create a note</Typography>
          </Box>
        )}
      </Box>

      <Dialog open={versionsOpen} onClose={() => setVersionsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Version history</DialogTitle>
        <DialogContent dividers>
          {versions.length === 0 ? (
            <Typography color="text.secondary">No saved versions yet.</Typography>
          ) : (
            <List dense>
              {versions.map((v) => (
                <ListItem
                  key={v.id}
                  secondaryAction={
                    <Button size="small" onClick={() => restoreVersion(v.id)}>
                      Restore
                    </Button>
                  }
                >
                  <ListItemText primary={formatDate(v.createdAt)} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
