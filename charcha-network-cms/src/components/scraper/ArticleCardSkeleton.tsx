'use client'

export function ArticleCardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        minHeight: 140,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton-shimmer rounded-full h-6 w-16" style={{ minWidth: 64 }} />
        <div className="skeleton-shimmer rounded-full h-2 w-2" style={{ flexShrink: 0 }} />
        <div className="skeleton-shimmer rounded h-3 w-12" />
      </div>
      <div className="skeleton-shimmer rounded h-4 w-full mb-2" style={{ height: 18 }} />
      <div className="skeleton-shimmer rounded h-4 w-3/4 mb-4" style={{ height: 18, width: '75%' }} />
      <div className="flex gap-2">
        <div className="skeleton-shimmer rounded-lg h-10 w-24" />
        <div className="skeleton-shimmer rounded-lg h-10 w-10" />
      </div>
    </div>
  )
}
