'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  inboxApi,
  rewriteApi,
  publishApi,
  sourcesApi,
  trendsApi,
  websiteApi,
  settingsApi,
  wpMetaApi,
  mediaApi,
} from '@/lib/api'
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

/** APIs used by inbox, rewrite, publish sheets, and trends — all bound to one HTTP client per workspace. */
export type ContentWorkspaceApis = {
  inbox: typeof inboxApi
  rewrite: typeof rewriteApi
  publish: typeof publishApi
  website: typeof websiteApi
  sources: typeof sourcesApi
  trends: typeof trendsApi
  settings: typeof settingsApi
  wpMeta: typeof wpMetaApi
  media: typeof mediaApi
}

export type ContentWorkspaceValue = {
  /** `studio` = multisite orchestration; `cms` = single public site (reader URLs from NEXT_PUBLIC_WEBSITE_URL). */
  mode: 'studio' | 'cms'
  studioMultisite: boolean
  /** WordPress publish / media / WP metadata — Studio only; CMS uses `website` API. */
  wordpressEnabled: boolean
  /** Base path for inbox + rewrite routes, no trailing slash (e.g. `/scraper/inbox`, `/cms/inbox`). */
  routePrefix: { inbox: string }
  apis: ContentWorkspaceApis
}

const ContentWorkspaceContext = createContext<ContentWorkspaceValue | null>(null)

export function useContentWorkspace(): ContentWorkspaceValue {
  const v = useContext(ContentWorkspaceContext)
  if (!v) {
    throw new Error('useContentWorkspace must be used within ContentWorkspaceProvider (dashboard or CMS layout).')
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

export const studioWorkspaceValue: ContentWorkspaceValue = {
  mode: 'studio',
  studioMultisite: true,
  wordpressEnabled: true,
  routePrefix: { inbox: '/scraper/inbox' },
  apis: {
    inbox: inboxApi,
    rewrite: rewriteApi,
    publish: publishApi,
    website: websiteApi,
    sources: sourcesApi,
    trends: trendsApi,
    settings: settingsApi,
    wpMeta: wpMetaApi,
    media: mediaApi,
  },
}

export const cmsWorkspaceValue: ContentWorkspaceValue = {
  mode: 'cms',
  studioMultisite: false,
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
