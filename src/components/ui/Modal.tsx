'use client'

import * as Dialog from '@radix-ui/react-dialog'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  description?: string
}

export function Modal({ open, onOpenChange, title, children, description }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            animation: 'fadeIn 0.15s ease',
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            minWidth: 360,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            animation: 'cardIn 0.25s ease',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: description ? 4 : 16,
            }}
          >
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 16,
              }}
            >
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
