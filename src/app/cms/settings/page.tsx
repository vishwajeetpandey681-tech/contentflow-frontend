'use client'

export default function CmsSiteSettingsPage() {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800 }}>Site settings</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 12 }}>
        Global site name, logo, and categories are stored in backend <code style={{ fontSize: 12 }}>websiteSettings</code> — admin UI
        can be wired here next.
      </p>
    </div>
  )
}
