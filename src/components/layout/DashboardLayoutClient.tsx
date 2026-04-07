'use client'

import AuthGuard from '@/components/AuthGuard'
import DashboardShell from '@/components/layout/DashboardShell'
import { ContentWorkspaceProvider, studioWorkspaceValue } from '@/lib/content-workspace'

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ContentWorkspaceProvider value={studioWorkspaceValue}>
        <DashboardShell>{children}</DashboardShell>
      </ContentWorkspaceProvider>
    </AuthGuard>
  )
}
