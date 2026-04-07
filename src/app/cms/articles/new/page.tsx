'use client'

export default function CmsNewArticlePage() {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800 }}>New article</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 12 }}>Use POST /api/website/cms/articles from API or add a rich editor here next.</p>
    </div>
  )
}
