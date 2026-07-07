import { Autocomplete, Box, Chip, MenuItem, TextField } from '@mui/material'
import type { ReactNode } from 'react'
import type { Group, Note, Tag } from '@shared/types'
import { tagColor } from '../util/tagColor'

/** Group + tag editor for the currently open note (Phase 2). */
export function NoteMetaBar({
  note,
  groups,
  tags,
  onSetGroup,
  onSetTags
}: {
  note: Note
  groups: Group[]
  tags: Tag[]
  onSetGroup: (groupId: string | null) => void
  onSetTags: (names: string[]) => void
}): ReactNode {
  const colorFor = (name: string): string =>
    tagColor(name, tags.find((t) => t.name === name)?.color)

  return (
    <Box sx={{ display: 'flex', gap: 2, px: 2, pt: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        select
        size="small"
        label="Group"
        value={note.groupId ?? ''}
        onChange={(e) => onSetGroup(e.target.value === '' ? null : e.target.value)}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">
          <em>No group</em>
        </MenuItem>
        {groups.map((g) => (
          <MenuItem key={g.id} value={g.id}>
            {g.name}
          </MenuItem>
        ))}
      </TextField>

      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={tags.map((t) => t.name)}
        value={note.tags}
        onChange={(_e, value) =>
          onSetTags(Array.from(new Set((value as string[]).map((v) => v.trim()).filter(Boolean))))
        }
        sx={{ flex: 1, minWidth: 280 }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...chipProps } = getTagProps({ index })
            const c = colorFor(option)
            return (
              <Chip
                key={key}
                label={option}
                size="small"
                {...chipProps}
                sx={{ backgroundColor: c, color: '#fff', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.8)' } }}
              />
            )
          })
        }
        renderInput={(params) => (
          <TextField {...params} label="Tags" placeholder="Add a tag and press Enter" />
        )}
      />
    </Box>
  )
}
