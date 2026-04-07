/** Charcha Network — editorial CMS (env-driven for white-label clones). */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Charcha Network',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Editorial CMS — inbox, rewrite, and publish to your news site.',
} as const
