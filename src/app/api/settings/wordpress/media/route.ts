import { NextRequest, NextResponse } from 'next/server'

const getBackendBase = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4500/api'
  return url.replace(/\/api\/?$/, '')
}

/** Proxy GET (list) and POST (upload) to backend media endpoint */
export async function GET(request: NextRequest) {
  try {
    const backend = getBackendBase()
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${backend}/api/settings/wordpress/media${qs ? `?${qs}` : ''}`
    const auth = request.headers.get('authorization')
    const headers: Record<string, string> = {}
    if (auth) headers.Authorization = auth

    const res = await fetch(url, { headers, cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[media proxy GET]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Proxy failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const backend = getBackendBase()
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${backend}/api/settings/wordpress/media${qs ? `?${qs}` : ''}`
    const auth = request.headers.get('authorization')
    const contentType = request.headers.get('content-type') || 'image/webp'

    const body = await request.arrayBuffer()
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(body.byteLength),
    }
    if (auth) headers.Authorization = auth

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[media proxy POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
