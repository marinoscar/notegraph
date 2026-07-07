import { IconButton, InputAdornment, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import type { ReactNode } from 'react'

export function SearchBar({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): ReactNode {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Search notes…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => onChange('')} aria-label="Clear search">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null
      }}
    />
  )
}
