'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const studio = getCookie('csr_token')
    const cms = getCookie('cms_token')
    if (studio) router.replace('/scraper/inbox/')
    else if (cms) router.replace('/cms')
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080c14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(108,99,255,0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 85%, rgba(204,0,0,0.08) 0%, transparent 55%)',
      }}
    >
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 28, letterSpacing: '0.08em' }}>
        Charcha Express
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          width: '100%',
          maxWidth: 640,
        }}
      >
        <Link
          href="/login/"
          style={{
            textDecoration: 'none',
            borderRadius: 16,
            padding: 28,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(108,99,255,0.25)',
            transition: 'transform 0.15s, border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              fontSize: 22,
            }}
          >
            ✦
          </div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6c63ff, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 8,
            }}
          >
            CSR Studio
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 20 }}>
            Editorial tools for editors &amp; admins — scrape, rewrite, approve.
          </p>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>Sign in →</span>
        </Link>

        <Link
          href="/cms/login/"
          style={{
            textDecoration: 'none',
            borderRadius: 16,
            padding: 28,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(204,0,0,0.3)',
            transition: 'transform 0.15s, border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #CC0000, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              fontSize: 22,
            }}
          >
            📰
          </div>
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: '#ff6b6b',
              marginBottom: 8,
            }}
          >
            Charcha CMS
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 20 }}>
            Content management for publishers &amp; writers.
          </p>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ff8787' }}>Sign in →</span>
        </Link>
      </div>

      <p style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} Charcha Express</p>
    </div>
  )
}
