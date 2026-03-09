'use client'

import { useState, useEffect } from 'react'
import { Users, Loader2, Check, Server, Clock, Trash2, UserPlus, Copy, X } from 'lucide-react'
import { settingsApi, teamApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

const ENVIRONMENTS = [
  { id: 'development', label: 'Development', desc: 'Local or dev builds' },
  { id: 'staging', label: 'Staging', desc: 'Pre-production testing' },
  { id: 'production', label: 'Production', desc: 'Live environment' },
] as const

const LOG_RETENTION_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 72, label: '72 hours (3 days)' },
  { value: 168, label: '7 days' },
  { value: 336, label: '14 days' },
  { value: 720, label: '30 days' },
]

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

export default function TeamPage() {
  const user = useAuthStore(s => s.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [environment, setEnvironment] = useState<'development' | 'staging' | 'production'>('development')
  const [timezone, setTimezone] = useState('UTC')
  const [logRetentionHours, setLogRetentionHours] = useState(72)
  const [teamUsers, setTeamUsers] = useState<{ id: string; email: string; name: string }[]>([])
  const [invites, setInvites] = useState<{ email: string; token: string; createdAt: string; expiresAt: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)

  const loadData = () => {
    Promise.all([settingsApi.get(), teamApi.listUsers(), teamApi.listInvites()])
      .then(([data, teamData, inviteData]) => {
        setTeamName(data.teamName || '')
        setTeamDescription(data.teamDescription || '')
        setEnvironment((data.environment as 'development' | 'staging' | 'production') || 'development')
        setTimezone(data.timezone || 'UTC')
        setLogRetentionHours(data.logRetentionHours ?? 72)
        setTeamUsers(teamData.users || [])
        setInvites(inviteData.invites || [])
      })
      .catch(() => toast.error('Failed to load team settings'))
      .finally(() => setLoading(false))
  }

  const refreshInvites = () => {
    teamApi.listInvites().then(d => setInvites(d.invites || [])).catch(() => {})
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      toast.error('Enter an email address')
      return
    }
    setInviteLoading(true)
    setLastInviteLink(null)
    try {
      const { inviteLink } = await teamApi.createInvite(email)
      await navigator.clipboard.writeText(inviteLink)
      setLastInviteLink(inviteLink)
      toast.success('Invite link copied to clipboard')
      setInviteEmail('')
      refreshInvites()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvite = async (token: string) => {
    try {
      await teamApi.revokeInvite(token)
      toast.success('Invite revoked')
      refreshInvites()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke')
    }
  }

  const copyInviteLink = (token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${base}/register?invite=${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link copied')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsApi.update({
        teamName: teamName.trim(),
        teamDescription: teamDescription.trim(),
        environment,
        timezone: timezone || 'UTC',
        logRetentionHours,
      })
      toast.success('Team settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
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
            <Users size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Team & Environment</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Configure workspace and deployment environment
            </p>
          </div>
        </div>

        <form onSubmit={handleSave}>
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
              Workspace
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Team / Workspace name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Content Team, Marketing"
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
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Description (optional)
              </label>
              <textarea
                value={teamDescription}
                onChange={e => setTeamDescription(e.target.value)}
                placeholder="Brief description of this workspace"
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
                }}
              />
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
              Environment
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              Select the deployment environment for this instance
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ENVIRONMENTS.map(env => (
                <label
                  key={env.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    background: environment === env.id ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                    border: `1px solid ${environment === env.id ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={env.id}
                    checked={environment === env.id}
                    onChange={() => setEnvironment(env.id)}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Server size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{env.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{env.desc}</div>
                  </div>
                </label>
              ))}
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
              General
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <Clock size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                Timezone
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <Trash2 size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                Log retention
              </label>
              <select
                value={logRetentionHours}
                onChange={e => setLogRetentionHours(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              >
                {LOG_RETENTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                Scrape logs older than this are auto-deleted
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 12,
                marginBottom: 16,
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>Per-user control</strong> — Each team member has their own custom prompt per source, can enable/disable sources independently, and their saves are personal. Sources are shared; preferences are individual.
            </div>
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
              Team members
            </div>
            {teamUsers.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No team members yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamUsers.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{u.name || 'User'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    {u.id === user?.id && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--accent-glow)',
                          color: 'var(--accent-light)',
                          border: '1px solid rgba(124,58,237,0.2)',
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6 }}>Registration link</div>
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/register` : '/register'}
                onClick={e => {
                  (e.target as HTMLInputElement).select()
                  const link = typeof window !== 'undefined' ? `${window.location.origin}/register` : '/register'
                  navigator.clipboard.writeText(link)
                  toast.success('Link copied')
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 12,
                  fontFamily: 'Geist Mono, monospace',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                title="Click to copy"
              />
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              <strong style={{ color: 'var(--text)' }}>Per-user settings:</strong> Each team member can have their own custom prompt per source and choose which sources are active for them. In Inbox, use &quot;My sources only&quot; to filter by your active sources.
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 16 }}>
              Invite new members by email
            </p>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                }}
              />
              <button
                type="submit"
                disabled={inviteLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  background: inviteLoading ? 'var(--accent-glow)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                  opacity: inviteLoading ? 0.7 : 1,
                }}
              >
                {inviteLoading ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : <UserPlus size={14} />}
                Invite
              </button>
            </form>
            {lastInviteLink && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Invite link (copied)</div>
                <input
                  type="text"
                  readOnly
                  value={lastInviteLink}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 12,
                    fontFamily: 'Geist Mono, monospace',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                    cursor: 'text',
                  }}
                />
              </div>
            )}
            {invites.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Pending invites</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {invites.map(inv => {
                    const base = typeof window !== 'undefined' ? window.location.origin : ''
                    const inviteLink = `${base}/register?invite=${inv.token}`
                    return (
                    <div
                      key={inv.token}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: 10,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 120, fontSize: 12, color: 'var(--text)' }}>{inv.email}</span>
                        <button
                        type="button"
                        onClick={() => copyInviteLink(inv.token)}
                        style={{
                          padding: '6px 10px',
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Copy size={12} />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.token)}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text-dim)',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <X size={12} />
                        Revoke
                      </button>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Invite link</div>
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        onClick={e => {
                          (e.target as HTMLInputElement).select()
                          copyInviteLink(inv.token)
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 12,
                          fontFamily: 'Geist Mono, monospace',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                        title="Click to copy"
                      />
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '13px 24px',
              minHeight: 46,
              background: saving ? 'var(--accent-glow)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: saving ? 'none' : '0 2px 12px rgba(124,58,237,0.3)',
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? (
              <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <Check size={16} />
            )}
            Save team settings
          </button>
        </form>
      </div>
    </div>
  )
}
