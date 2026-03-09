'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)
  const next = searchParams.get('next') || '/scraper/inbox/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (token) router.replace(next)
  }, [token, router, next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email and password are required')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.login({ email: email.trim(), password })
      const { token, user } = res.data.data
      setAuth(token, user)
      toast.success('Welcome back!')
      router.push(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px 16px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Subtle radial glow behind the card */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '28px 24px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
              flexShrink: 0,
            }}
          >
            CF
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>CSR Studio</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.3px' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '11px 13px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.3px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                padding: '11px 13px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              minHeight: 46,
              background: loading ? 'var(--accent-glow)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s, background 0.15s',
              opacity: loading ? 0.7 : 1,
              boxShadow: loading ? 'none' : '0 2px 12px rgba(124,58,237,0.35)',
            }}
          >
            {loading ? (
              <span style={{ animation: 'spin 0.6s linear infinite', fontSize: 16 }}>⟳</span>
            ) : (
              <>
                <LogIn size={16} />
                Sign in
              </>
            )}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register/" style={{ color: 'var(--accent-light)', fontWeight: 500, textDecoration: 'none' }}>
            Register
          </Link>
        </p>
        <p style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>
          Idea & developed by <strong style={{ color: 'var(--text-muted)' }}>Vishwajeet Pandey</strong>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
