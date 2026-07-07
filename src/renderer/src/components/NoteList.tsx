import { List, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export interface NoteListItem {
  id: string
  title: string
  subtitle: string
}

export function NoteList({
  items,
  selectedId,
  onSelect,
  emptyLabel
}: {
  items: NoteListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyLabel: string
}): ReactNode {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <List dense disablePadding sx={{ overflow: 'auto' }}>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          selected={item.id === selectedId}
          onClick={() => onSelect(item.id)}
        >
          <ListItemText
            primary={item.title || 'Untitled'}
            secondary={item.subtitle}
            primaryTypographyProps={{ noWrap: true }}
            secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
          />
        </ListItemButton>
      ))}
    </List>
  )
}
