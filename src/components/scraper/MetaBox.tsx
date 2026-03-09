'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface MetaBoxProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function MetaBox({ title, children, defaultOpen = true }: MetaBoxProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        marginBottom: 12,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div style={{ padding: '12px 12px 12px', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
