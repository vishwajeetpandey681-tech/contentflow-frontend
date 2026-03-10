import { NextRequest, NextResponse } from 'next/server'

const getBackendBase = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
  return url.replace(/\/api\/?$/, '')
}

/** Proxy DELETE to backend media/:id */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const backend = getBackendBase()
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${backend}/api/settings/wordpress/media/${id}${qs ? `?${qs}` : ''}`
    const auth = request.headers.get('authorization')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth) headers.Authorization = auth

    const res = await fetch(url, { method: 'DELETE', headers, cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[media proxy DELETE]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
