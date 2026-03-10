import { NextRequest, NextResponse } from 'next/server'

const getBackendBase = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
  return url.replace(/\/api\/?$/, '')
}

/** Proxy POST to backend media/fetch */
export async function POST(request: NextRequest) {
  try {
    const backend = getBackendBase()
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${backend}/api/settings/wordpress/media/fetch${qs ? `?${qs}` : ''}`
    const auth = request.headers.get('authorization')
    const body = await request.json().catch(() => ({}))
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (auth) headers.Authorization = auth

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[media fetch proxy]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 500 }
    )
  }
}
