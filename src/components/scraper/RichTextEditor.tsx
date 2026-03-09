'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Bold, Italic, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, Link } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
}

export function RichTextEditor({ value, onChange, placeholder, disabled, minHeight = 200 }: RichTextEditorProps) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  const handleInput = useCallback(() => {
    const el = elRef.current
    if (!el) return
    onChange(el.innerHTML)
  }, [onChange])

  const execCmd = (cmd: string, value?: string) => {
    elRef.current?.focus()
    document.execCommand(cmd, false, value)
    handleInput()
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '6px 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <button type="button" onClick={() => execCmd('formatBlock', 'h1')} title="Heading 1" style={{ ...btnStyle, fontSize: 10, fontWeight: 700 }}>H1</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'h2')} title="Heading 2" style={{ ...btnStyle, fontSize: 10, fontWeight: 700 }}>H2</button>
        <button type="button" onClick={() => execCmd('formatBlock', 'h4')} title="Heading 4" style={{ ...btnStyle, fontSize: 10, fontWeight: 700 }}>H4</button>
        <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <button type="button" onClick={() => execCmd('bold')} title="Bold" style={btnStyle}>
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => execCmd('italic')} title="Italic" style={btnStyle}>
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => execCmd('insertUnorderedList')} title="Bullet list" style={btnStyle}>
          <List size={14} />
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} title="Numbered list" style={btnStyle}>
          <ListOrdered size={14} />
        </button>
        <button type="button" onClick={() => execCmd('formatBlock', 'blockquote')} title="Blockquote" style={btnStyle}>
          <Quote size={14} />
        </button>
        <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <button type="button" onClick={() => execCmd('justifyLeft')} title="Align left" style={btnStyle}>
          <AlignLeft size={14} />
        </button>
        <button type="button" onClick={() => execCmd('justifyCenter')} title="Align center" style={btnStyle}>
          <AlignCenter size={14} />
        </button>
        <button type="button" onClick={() => execCmd('justifyRight')} title="Align right" style={btnStyle}>
          <AlignRight size={14} />
        </button>
        <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) execCmd('createLink', url)
          }}
          title="Insert link"
          style={btnStyle}
        >
          <Link size={14} />
        </button>
      </div>
      <div
        ref={elRef}
        className="rich-text-content"
        contentEditable={!disabled}
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        style={{
          minHeight,
          padding: 12,
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text)',
          outline: 'none',
          overflowY: 'auto',
        }}
      />
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  background: 'transparent',
  border: 'none',
  borderRadius: 4,
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
