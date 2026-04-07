'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { useEffect, useCallback } from 'react'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '5px 8px',
        borderRadius: 4,
        border: 'none',
        background: active ? 'rgba(204,0,0,0.3)' : 'transparent',
        color: active ? '#fda4af' : 'rgba(255,255,255,0.7)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        lineHeight: 1,
        fontWeight: active ? 700 : 400,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(204,0,0,0.3)' : 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
}

export function RichEditor({ value, onChange, placeholder = 'Write your article content here…' }: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      Image.configure({ HTMLAttributes: { class: 'editor-image' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: 'outline: none; min-height: 400px;',
      },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL:', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount?.words() ?? 0
  const charCount = editor.storage.characterCount?.characters() ?? 0

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
      }}>
        {/* Heading */}
        <select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1'
            : editor.isActive('heading', { level: 2 }) ? 'h2'
            : editor.isActive('heading', { level: 3 }) ? 'h3'
            : editor.isActive('heading', { level: 4 }) ? 'h4'
            : 'p'
          }
          onChange={e => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: parseInt(v[1]) as 1|2|3|4 }).run()
          }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.8)',
            padding: '4px 8px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <Divider />

        {/* Basic formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
          ▓
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">≡</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">≡</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">≡</ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">• —</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">1. —</ToolbarButton>

        <Divider />

        {/* Block */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">❝</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">{`<>`}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">{`{ }`}</ToolbarButton>

        <Divider />

        {/* Link & Image */}
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Add Link">🔗</ToolbarButton>
        <ToolbarButton onClick={addImage} title="Insert Image">🖼</ToolbarButton>

        <Divider />

        {/* HR */}
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">—</ToolbarButton>

        <Divider />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">↪</ToolbarButton>
      </div>

      {/* Editor area */}
      <div
        style={{ padding: '20px 24px', minHeight: 400 }}
        onClick={() => editor.commands.focus()}
      >
        <style>{`
          .tiptap-editor h1 { font-size: 2em; font-weight: 800; margin: 0.75em 0 0.4em; color: rgba(255,255,255,0.95); }
          .tiptap-editor h2 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0 0.4em; color: rgba(255,255,255,0.95); }
          .tiptap-editor h3 { font-size: 1.25em; font-weight: 600; margin: 0.75em 0 0.4em; color: rgba(255,255,255,0.9); }
          .tiptap-editor h4 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.3em; color: rgba(255,255,255,0.9); }
          .tiptap-editor p { margin: 0.6em 0; line-height: 1.8; color: rgba(255,255,255,0.82); font-size: 15px; }
          .tiptap-editor strong { color: rgba(255,255,255,0.95); }
          .tiptap-editor ul, .tiptap-editor ol { padding-left: 1.6em; margin: 0.6em 0; color: rgba(255,255,255,0.82); }
          .tiptap-editor li { margin: 0.3em 0; line-height: 1.7; }
          .tiptap-editor blockquote { border-left: 3px solid #cc0000; margin: 1em 0; padding: 8px 16px; color: rgba(255,255,255,0.6); background: rgba(204,0,0,0.06); border-radius: 0 4px 4px 0; }
          .tiptap-editor code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em; color: #fda4af; }
          .tiptap-editor pre { background: rgba(0,0,0,0.4); padding: 14px 18px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
          .tiptap-editor pre code { background: none; padding: 0; color: rgba(255,255,255,0.85); }
          .tiptap-editor a.editor-link { color: #60a5fa; text-decoration: underline; }
          .tiptap-editor img.editor-image { max-width: 100%; border-radius: 6px; margin: 12px 0; }
          .tiptap-editor hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 1.5em 0; }
          .tiptap-editor mark { background: rgba(251,191,36,0.25); color: #fbbf24; padding: 1px 3px; border-radius: 2px; }
          .tiptap-editor .is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; pointer-events: none; color: rgba(255,255,255,0.2); font-style: italic; }
          .tiptap-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; pointer-events: none; color: rgba(255,255,255,0.2); font-style: italic; }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* Footer: word/char count */}
      <div style={{
        padding: '6px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        display: 'flex', gap: 16,
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
        <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
      </div>
    </div>
  )
}
