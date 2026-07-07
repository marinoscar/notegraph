import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Box, IconButton, ListItemButton, ListItemText, Menu, MenuItem } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FolderIcon from '@mui/icons-material/Folder'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { Group } from '@shared/types'

export interface GroupActions {
  onAddChild: (parentId: string) => void
  onRename: (group: Group) => void
  onDelete: (group: Group) => void
}

/** Renders the group hierarchy as an indented, collapsible tree. */
export function GroupTree({
  groups,
  selectedGroupId,
  onSelect,
  actions
}: {
  groups: Group[]
  selectedGroupId: string | null
  onSelect: (id: string | null) => void
  actions: GroupActions
}): ReactNode {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null)
  const [menuGroup, setMenuGroup] = useState<Group | null>(null)

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Group[]>()
    for (const g of groups) {
      const key = g.parentGroupId
      const arr = map.get(key) ?? []
      arr.push(g)
      map.set(key, arr)
    }
    return map
  }, [groups])

  const toggle = (id: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const openMenu = (e: MouseEvent<HTMLElement>, g: Group): void => {
    e.stopPropagation()
    setMenuEl(e.currentTarget)
    setMenuGroup(g)
  }
  const closeMenu = (): void => {
    setMenuEl(null)
    setMenuGroup(null)
  }

  const renderNode = (group: Group, depth: number): ReactNode => {
    const kids = childrenOf.get(group.id) ?? []
    const isOpen = expanded.has(group.id)
    return (
      <Box key={group.id}>
        <ListItemButton
          selected={group.id === selectedGroupId}
          onClick={() => onSelect(group.id)}
          sx={{ pl: 1 + depth * 1.5, pr: 0.5 }}
          dense
        >
          <Box
            sx={{ width: 24, display: 'flex', alignItems: 'center' }}
            onClick={(e) => {
              e.stopPropagation()
              if (kids.length) toggle(group.id)
            }}
          >
            {kids.length ? (
              isOpen ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )
            ) : null}
          </Box>
          <FolderIcon fontSize="small" sx={{ mr: 1, color: group.color ?? 'action.active' }} />
          <ListItemText primary={group.name} primaryTypographyProps={{ noWrap: true }} />
          <IconButton size="small" onClick={(e) => openMenu(e, group)} aria-label="Group actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </ListItemButton>
        {isOpen && kids.map((k) => renderNode(k, depth + 1))}
      </Box>
    )
  }

  const roots = childrenOf.get(null) ?? []

  return (
    <Box>
      {roots.map((g) => renderNode(g, 0))}
      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuGroup) actions.onAddChild(menuGroup.id)
            closeMenu()
          }}
        >
          Add subgroup
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuGroup) actions.onRename(menuGroup)
            closeMenu()
          }}
        >
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuGroup) actions.onDelete(menuGroup)
            closeMenu()
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Box>
  )
}
