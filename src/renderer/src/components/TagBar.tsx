import { Box, Chip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { Tag } from '@shared/types'
import { tagColor } from '../util/tagColor'

/**
 * Tag filter bar: click a chip to toggle it as a filter (AND semantics);
 * the ✕ deletes the tag everywhere; double-click renames it.
 */
export function TagBar({
  tags,
  selectedTagIds,
  onToggle,
  onDelete,
  onRename
}: {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (id: string) => void
  onDelete: (tag: Tag) => void
  onRename: (tag: Tag) => void
}): ReactNode {
  if (tags.length === 0) return null
  return (
    <Box sx={{ px: 1.5, py: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {tags.map((t) => {
        const selected = selectedTagIds.includes(t.id)
        const color = tagColor(t.name, t.color)
        return (
          <Chip
            key={t.id}
            label={t.name}
            size="small"
            onClick={() => onToggle(t.id)}
            onDelete={() => onDelete(t)}
            onDoubleClick={() => onRename(t)}
            variant={selected ? 'filled' : 'outlined'}
            sx={{
              cursor: 'pointer',
              borderColor: color,
              color: selected ? '#fff' : color,
              backgroundColor: selected ? color : 'transparent',
              '& .MuiChip-deleteIcon': { color: selected ? 'rgba(255,255,255,0.8)' : color }
            }}
          />
        )
      })}
      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
        double-click a tag to rename
      </Typography>
    </Box>
  )
}
