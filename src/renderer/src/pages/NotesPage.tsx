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
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import HistoryIcon from '@mui/icons-material/History'
import InboxIcon from '@mui/icons-material/Inbox'
import type { Group, Note, NoteVersion, SearchResult, Tag } from '@shared/types'
import { api } from '../ipc/client'
import { SearchBar } from '../components/SearchBar'
import { NoteList, type NoteListItem } from '../components/NoteList'
import { NoteEditor } from '../components/NoteEditor'
import { GroupTree } from '../components/GroupTree'
import { TagBar } from '../components/TagBar'
import { NoteMetaBar } from '../components/NoteMetaBar'

export type SaveState = 'idle' | 'saving' | 'saved'

const AUTOSAVE_MS = 800
const FILTER_DEBOUNCE_MS = 250

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function NotesPage(): ReactNode {
  const [items, setItems] = useState<NoteListItem[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [current, setCurrent] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const [search, setSearch] = useState('')
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null)
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState<NoteVersion[]>([])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshGroups = async (): Promise<void> => setGroups(await api.groups.list())
  const refreshTags = async (): Promise<void> => setTags(await api.tags.list())

  const refreshList = async (): Promise<void> => {
    const results: SearchResult[] = await api.search.query({
      text: search.trim() || undefined,
      groupId: filterGroupId ?? undefined,
      tagIds: filterTagIds.length ? filterTagIds : undefined
    })
    setItems(
      results.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.snippet || formatDate(r.updatedAt)
      }))
    )
  }

  // Initial load.
  useEffect(() => {
    refreshGroups()
    refreshTags()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  // Re-run the (debounced) query whenever search text or filters change.
  useEffect(() => {
    const t = setTimeout(refreshList, FILTER_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterGroupId, filterTagIds])

  async function selectNote(id: string): Promise<void> {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const note = await api.notes.get(id)
    if (!note) {
      await refreshList()
      return
    }
    setSelectedId(id)
    setCurrent(note)
    setTitle(note.title)
    setBody(note.body)
    setSaveState('idle')
  }

  function scheduleSave(id: string, nextTitle: string, nextBody: string): void {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(async () => {
      const saved = await api.notes.save(id, { title: nextTitle, body: nextBody })
      setCurrent(saved)
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
    const note = await api.notes.create(filterGroupId)
    await refreshList()
    await selectNote(note.id)
  }

  async function handleDelete(): Promise<void> {
    if (!selectedId) return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    await api.notes.delete(selectedId)
    setSelectedId(null)
    setCurrent(null)
    setTitle('')
    setBody('')
    await refreshList()
  }

  // ---- group / tag assignment for the open note --------------------------
  async function setNoteGroup(groupId: string | null): Promise<void> {
    if (!selectedId) return
    const updated = await api.notes.setGroup(selectedId, groupId)
    if (updated) setCurrent(updated)
    await refreshList()
  }

  async function setNoteTags(names: string[]): Promise<void> {
    if (!selectedId) return
    const updated = await api.notes.setTags(selectedId, names)
    if (updated) setCurrent(updated)
    await Promise.all([refreshTags(), refreshList()])
  }

  // ---- group management --------------------------------------------------
  async function reloadCurrent(): Promise<void> {
    if (!selectedId) return
    const note = await api.notes.get(selectedId)
    setCurrent(note)
  }

  async function addTopGroup(): Promise<void> {
    const name = window.prompt('New group name')
    if (!name?.trim()) return
    await api.groups.create(name.trim(), null)
    await refreshGroups()
  }

  const groupActions = {
    onAddChild: async (parentId: string) => {
      const name = window.prompt('New subgroup name')
      if (!name?.trim()) return
      await api.groups.create(name.trim(), parentId)
      await refreshGroups()
    },
    onRename: async (g: Group) => {
      const name = window.prompt('Rename group', g.name)
      if (!name?.trim()) return
      await api.groups.rename(g.id, name.trim())
      await refreshGroups()
    },
    onDelete: async (g: Group) => {
      if (!window.confirm(`Delete group "${g.name}"? Notes in it become ungrouped.`)) return
      await api.groups.delete(g.id)
      if (filterGroupId === g.id) setFilterGroupId(null)
      await Promise.all([refreshGroups(), refreshList(), reloadCurrent()])
    }
  }

  // ---- tag management ----------------------------------------------------
  function toggleTagFilter(id: string): void {
    setFilterTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function deleteTag(tag: Tag): Promise<void> {
    if (!window.confirm(`Delete tag "${tag.name}" from all notes?`)) return
    await api.tags.delete(tag.id)
    setFilterTagIds((prev) => prev.filter((x) => x !== tag.id))
    await Promise.all([refreshTags(), refreshList(), reloadCurrent()])
  }

  async function renameTag(tag: Tag): Promise<void> {
    const name = window.prompt('Rename tag', tag.name)
    if (!name?.trim() || name.trim() === tag.name) return
    try {
      await api.tags.rename(tag.id, name.trim())
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
      return
    }
    await Promise.all([refreshTags(), refreshList(), reloadCurrent()])
  }

  // ---- version history ---------------------------------------------------
  async function openVersions(): Promise<void> {
    if (!selectedId) return
    setVersions(await api.notes.versions(selectedId))
    setVersionsOpen(true)
  }

  async function restoreVersion(versionId: string): Promise<void> {
    const restored = await api.notes.restoreVersion(versionId)
    setVersionsOpen(false)
    if (restored) {
      setCurrent(restored)
      setTitle(restored.title)
      setBody(restored.body)
      setSaveState('saved')
      await refreshList()
    }
  }

  const allNotesSelected = filterGroupId === null

  const listMemo = useMemo(() => items, [items])

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left pane */}
      <Box
        sx={{
          width: 320,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <Stack spacing={1} sx={{ p: 1.5 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} fullWidth>
            New note
          </Button>
          <SearchBar value={search} onChange={setSearch} />
        </Stack>

        <Box sx={{ maxHeight: '32%', overflow: 'auto' }}>
          <ListItemButton
            selected={allNotesSelected}
            onClick={() => setFilterGroupId(null)}
            dense
            sx={{ pl: 2 }}
          >
            <InboxIcon fontSize="small" sx={{ mr: 1 }} />
            <ListItemText primary="All notes" />
            <Tooltip title="New top-level group">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  void addTopGroup()
                }}
              >
                <CreateNewFolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ListItemButton>
          <GroupTree
            groups={groups}
            selectedGroupId={filterGroupId}
            onSelect={setFilterGroupId}
            actions={groupActions}
          />
        </Box>

        <Divider />
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <NoteList
            items={listMemo}
            selectedId={selectedId}
            onSelect={selectNote}
            emptyLabel={search || filterTagIds.length || filterGroupId ? 'No matches' : 'No notes yet — create one'}
          />
        </Box>

        <Divider />
        <Box sx={{ maxHeight: 140, overflow: 'auto' }}>
          <TagBar
            tags={tags}
            selectedTagIds={filterTagIds}
            onToggle={toggleTagFilter}
            onDelete={deleteTag}
            onRename={renameTag}
          />
        </Box>
      </Box>

      {/* Right pane */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedId && current ? (
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
            <NoteMetaBar
              note={current}
              groups={groups}
              tags={tags}
              onSetGroup={setNoteGroup}
              onSetTags={setNoteTags}
            />
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
