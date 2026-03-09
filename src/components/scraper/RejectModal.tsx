'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface RejectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason?: string) => void
}

export function RejectModal({ open, onOpenChange, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined)
    setReason('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setReason('')
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Reject article"
      description="Optionally provide a reason for rejection."
    >
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Reason for rejection (optional)"
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 12,
          resize: 'vertical',
          marginBottom: 16,
        }}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={handleConfirm}>
          Reject
        </Button>
      </div>
    </Modal>
  )
}
