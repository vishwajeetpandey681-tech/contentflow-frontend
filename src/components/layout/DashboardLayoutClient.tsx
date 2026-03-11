'use client'

import AuthGuard from '@/components/AuthGuard'
import DashboardShell from '@/components/layout/DashboardShell'

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  )
}
