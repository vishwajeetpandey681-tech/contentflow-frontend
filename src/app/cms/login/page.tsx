'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, parseAuthSuccessPayload } from '@/lib/api'
import { ensureTrailingSlashForInternalNav } from '@/lib/pathname'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

function CmsLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setCmsAuth = useAuthStore(s => s.setCmsAuth)
  const cmsToken = useAuthStore(s => s.cmsToken)
  const next = searchParams.get('next') || '/cms/inbox/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cmsToken) router.replace(ensureTrailingSlashForInternalNav(next))
  }, [cmsToken, router, next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email and password are required')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.loginCms({ email: email.trim(), password })
      const { token, user, redirect } = parseAuthSuccessPayload(res)
      setCmsAuth(token, user)
      toast.success('Welcome to CMS')
      router.push(ensureTrailingSlashForInternalNav(redirect || next))
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
        background: '#0f0606',
        padding: 24,
        fontFamily: 'DM Sans, Geist, sans-serif',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(204,0,0,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,107,0,0.08) 0%, transparent 60%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #CC0000, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 26,
            }}
          >
            📰
          </div>
          <div
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 22,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff4444, #FF6B00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Charcha CMS
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Content Management System</div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 32,
          }}
        >
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 22 }}>Sign in for publishers & writers</p>

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@charchaexpress.com"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 13,
                color: 'white',
                marginBottom: 14,
              }}
            />
            <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'white',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 12,
                background: 'linear-gradient(135deg, #CC0000, #FF6B00)',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'Syne, sans-serif',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in to CMS →'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <Link href="/login/" style={{ display: 'block', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
            Editor? <span style={{ color: '#a78bfa' }}>Sign in to Studio →</span>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Charcha Express
        </div>
      </div>
    </div>
  )
}

export default function CmsLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0606' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>Loading…</span>
        </div>
      }
    >
      <CmsLoginForm />
    </Suspense>
  )
}
