export type UserRole = 'super_admin' | 'admin' | 'editor' | 'publisher' | 'writer'

export const ROLE_PERMISSIONS: Record<
  UserRole,
  { studio: string[]; cms: string[] }
> = {
  super_admin: {
    studio: ['view', 'scrape', 'rewrite', 'approve', 'publish', 'settings', 'team'],
    cms: ['view', 'create', 'edit', 'delete', 'publish', 'schedule', 'settings'],
  },
  admin: {
    studio: ['view', 'scrape', 'rewrite', 'approve', 'publish', 'settings'],
    cms: ['view', 'create', 'edit', 'delete', 'publish', 'schedule'],
  },
  editor: {
    studio: ['view', 'scrape', 'rewrite', 'approve'],
    cms: ['view', 'create', 'edit'],
  },
  publisher: {
    studio: [],
    cms: ['view', 'create', 'edit', 'publish', 'schedule'],
  },
  writer: {
    studio: [],
    cms: ['view', 'create', 'edit'],
  },
}

export function hasPermission(
  role: string | undefined,
  section: 'studio' | 'cms',
  action: string
): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role as UserRole]?.[section]
  if (!perms) return false
  return perms.includes(action) || perms.includes('*')
}
