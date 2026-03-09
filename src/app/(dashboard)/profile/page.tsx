'use client'

import { useState, useEffect } from 'react'
import { User, Loader2, Check, Lock } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const setAuth = useAuthStore(s => s.setAuth)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
    }
    setLoading(false)
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authApi.updateProfile({ name: name.trim() })
      setAuth(useAuthStore.getState().token!, res.data.data.user)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setPasswordSaving(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      toast.success('Password changed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 max-w-2xl p-4 md:p-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-light)',
            }}
          >
            <User size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Profile</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Manage your account details
            </p>
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              fontFamily: 'Geist Mono, monospace',
              marginBottom: 16,
            }}
          >
            Account
          </div>
          <form onSubmit={handleSaveProfile}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'not-allowed',
                }}
              />
              <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                Email cannot be changed
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 20px',
                minHeight: 40,
                background: saving ? 'var(--accent-glow)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: saving ? 'none' : '0 2px 8px rgba(124,58,237,0.3)',
              }}
            >
              {saving ? (
                <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <Check size={14} />
              )}
              Save profile
            </button>
          </form>
        </div>

        <div
          style={{
            padding: 20,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                fontFamily: 'Geist Mono, monospace',
              }}
            >
              Password
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                padding: '6px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {showPassword ? 'Cancel' : 'Change password'}
            </button>
          </div>
          {showPassword && (
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  minHeight: 40,
                  background: passwordSaving ? 'var(--accent-glow)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: passwordSaving ? 'not-allowed' : 'pointer',
                  opacity: passwordSaving ? 0.7 : 1,
                  boxShadow: passwordSaving ? 'none' : '0 2px 8px rgba(124,58,237,0.3)',
                }}
              >
                {passwordSaving ? (
                  <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <Lock size={14} />
                )}
                Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
