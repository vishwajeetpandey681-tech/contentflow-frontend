'use client'

import { usePathname } from 'next/navigation'
import CmsAuthGuard from '@/components/CmsAuthGuard'
import CmsShell from '@/components/layout/CmsShell'
import { cmsWorkspaceValue, ContentWorkspaceProvider } from '@/lib/content-workspace'
import { isCmsLoginRoute } from '@/lib/pathname'

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isCmsLoginRoute(pathname)) {
    return <>{children}</>
  }
  return (
    <CmsAuthGuard>
      <ContentWorkspaceProvider value={cmsWorkspaceValue}>
        <CmsShell>{children}</CmsShell>
      </ContentWorkspaceProvider>
    </CmsAuthGuard>
  )
}
