import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: { default: 'CSR Studio', template: '%s · CSR Studio' },
  description: 'Content automation platform — scrape, rewrite, and publish to WordPress.',
  applicationName: 'CSR Studio',
  authors: [{ name: 'CSR Studio' }],
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CSR Studio',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0c',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: '#0a0a0c', colorScheme: 'dark' }}>
      <body style={{
        background: '#0a0a0c',
        color: '#fafafa',
        minHeight: '100dvh',
      }}>
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1c1c1f',
              color: '#fafafa',
              border: '1px solid #333338',
              borderRadius: '10px',
              fontSize: '12px',
              fontFamily: 'Geist, sans-serif',
              maxWidth: '380px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#0a0a0c' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0a0a0c' },
              duration: 5000,
            },
          }}
        />
      </body>
    </html>
  )
}
