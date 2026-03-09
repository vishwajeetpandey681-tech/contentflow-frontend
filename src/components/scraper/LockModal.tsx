'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

interface LockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editorName: string
  expiresAt: string | null
  isAdmin: boolean
  onGoBack: () => void
  onTakeOver?: () => void
  takeOverLoading?: boolean
}

export function LockModal({
  open,
  onOpenChange,
  editorName,
  expiresAt,
  isAdmin,
  onGoBack,
  onTakeOver,
  takeOverLoading = false,
}: LockModalProps) {
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) +
      ' (' +
      new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ')'
    : 'Unknown'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Article being edited"
      description={`${editorName} is currently editing this article. Lock expires at ${expiresLabel}.`}
    >
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onGoBack} leftIcon={<ArrowLeft size={12} />}>
          ← Go Back
        </Button>
        {isAdmin && onTakeOver && (
          <Button
            variant="danger"
            size="sm"
            onClick={onTakeOver}
            loading={takeOverLoading}
            style={{ border: '1px solid rgba(239,68,68,0.5)' }}
          >
            Take Over
          </Button>
        )}
      </div>
    </Modal>
  )
}
