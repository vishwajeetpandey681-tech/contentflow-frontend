import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteConfig.name,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#030c06',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ background: '#030c06', colorScheme: 'dark' }}>
      <body
        style={{
          background: '#030c06',
          color: '#f0faf3',
          minHeight: '100dvh',
        }}
      >
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0e2113',
              color: '#f0faf3',
              border: '1px solid #1b3525',
              borderRadius: '10px',
              fontSize: '12px',
              fontFamily: 'Geist, sans-serif',
              maxWidth: '380px',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#030c06' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#030c06' },
              duration: 5000,
            },
          }}
        />
      </body>
    </html>
  )
}
