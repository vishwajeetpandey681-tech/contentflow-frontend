'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useContentWorkspace } from '@/lib/content-workspace'

const HEARTBEAT_INTERVAL_MS = 60_000

export interface ArticleLockState {
  isLocked: boolean
  lockedByMe: boolean
  lockedByName: string | null
  lockExpiresAt: string | null
  acquireLock: (takeOver?: boolean) => Promise<{ ok: true } | { ok: false; lockedBy: string; lockedByName: string; expiresAt: string | null }>
  releaseLock: () => Promise<void>
}

export function useArticleLock(articleId: string | null): ArticleLockState {
  const { apis } = useContentWorkspace()
  const [isLocked, setIsLocked] = useState(false)
  const [lockedByMe, setLockedByMe] = useState(false)
  const [lockedByName, setLockedByName] = useState<string | null>(null)
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userId = useAuthStore(s => s.user?.id ?? s.cmsUser?.id)

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const releaseLock = useCallback(async () => {
    if (!articleId) return
    try {
      await apis.inbox.unlock(articleId)
    } catch {
      // ignore errors on release (e.g. already unlocked)
    } finally {
      setIsLocked(false)
      setLockedByMe(false)
      setLockedByName(null)
      setLockExpiresAt(null)
      clearHeartbeat()
    }
  }, [articleId, clearHeartbeat, apis.inbox])

  const acquireLock = useCallback(
    async (takeOver = false): Promise<
      | { ok: true }
      | { ok: false; lockedBy: string; lockedByName: string; expiresAt: string | null }
    > => {
      if (!articleId || !userId) return { ok: false, lockedBy: '', lockedByName: 'Unknown', expiresAt: null }
      try {
        const res = await apis.inbox.lock(articleId, takeOver)
        const data = res.data as { locked?: boolean; lockedBy?: string; lockedByName?: string; lockExpiresAt?: string }
        if (data.locked) {
          setIsLocked(true)
          setLockedByMe(true)
          setLockedByName(data.lockedByName ?? null)
          setLockExpiresAt(data.lockExpiresAt ?? null)
          clearHeartbeat()
          heartbeatRef.current = setInterval(async () => {
            if (!articleId) return
            try {
              const h = await apis.inbox.heartbeat(articleId)
              const d = h.data as { lockExpiresAt?: string }
              setLockExpiresAt(d.lockExpiresAt ?? null)
            } catch {
              clearHeartbeat()
            }
          }, HEARTBEAT_INTERVAL_MS)
          return { ok: true }
        }
        return {
          ok: false,
          lockedBy: data.lockedBy ?? '',
          lockedByName: data.lockedByName ?? 'Unknown',
          expiresAt: (res.data as { expiresAt?: string }).expiresAt ?? null,
        }
      } catch (err: unknown) {
        const res = (err as { response?: { status?: number; data?: unknown } })?.response
        if (res?.status === 409) {
          const d = res.data as { lockedBy?: string; lockedByName?: string; expiresAt?: string }
          return {
            ok: false,
            lockedBy: d.lockedBy ?? '',
            lockedByName: d.lockedByName ?? 'Unknown',
            expiresAt: d.expiresAt ?? null,
          }
        }
        throw err
      }
    },
    [articleId, userId, clearHeartbeat, apis.inbox]
  )

  useEffect(() => {
    return () => {
      clearHeartbeat()
    }
  }, [clearHeartbeat])

  return {
    isLocked,
    lockedByMe,
    lockedByName,
    lockExpiresAt,
    acquireLock,
    releaseLock,
  }
}
