'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  cmsInboxApi,
  cmsRewriteApi,
  cmsPublishApiStub,
  cmsSourcesApi,
  cmsTrendsApi,
  cmsWebsiteApi,
  cmsSettingsApi,
  cmsWpMetaApiStub,
  cmsMediaApiStub,
} from '@/lib/cms-api'

/** APIs for inbox, rewrite, trends — CMS JWT only; WordPress is stubbed. */
export type ContentWorkspaceApis = {
  inbox: typeof cmsInboxApi
  rewrite: typeof cmsRewriteApi
  publish: typeof cmsPublishApiStub
  website: typeof cmsWebsiteApi
  sources: typeof cmsSourcesApi
  trends: typeof cmsTrendsApi
  settings: typeof cmsSettingsApi
  wpMeta: typeof cmsWpMetaApiStub
  media: typeof cmsMediaApiStub
}

export type ContentWorkspaceValue = {
  mode: 'cms'
  wordpressEnabled: boolean
  routePrefix: { inbox: string }
  apis: ContentWorkspaceApis
}

const ContentWorkspaceContext = createContext<ContentWorkspaceValue | null>(null)

export function useContentWorkspace(): ContentWorkspaceValue {
  const v = useContext(ContentWorkspaceContext)
  if (!v) {
    throw new Error('useContentWorkspace must be used within ContentWorkspaceProvider (Charcha CMS layout).')
  }
  return v
}

export function ContentWorkspaceProvider({
  value,
  children,
}: {
  value: ContentWorkspaceValue
  children: ReactNode
}) {
  return <ContentWorkspaceContext.Provider value={value}>{children}</ContentWorkspaceContext.Provider>
}

/** Charcha editorial workspace — public site via `website` API; WordPress flows are disabled. */
export const cmsWorkspaceValue: ContentWorkspaceValue = {
  mode: 'cms',
  wordpressEnabled: false,
  routePrefix: { inbox: '/cms/inbox' },
  apis: {
    inbox: cmsInboxApi,
    rewrite: cmsRewriteApi,
    publish: cmsPublishApiStub,
    website: cmsWebsiteApi,
    sources: cmsSourcesApi,
    trends: cmsTrendsApi,
    settings: cmsSettingsApi,
    wpMeta: cmsWpMetaApiStub,
    media: cmsMediaApiStub,
  },
}
