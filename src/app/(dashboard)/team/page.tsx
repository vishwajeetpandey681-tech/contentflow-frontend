import { redirect } from 'next/navigation'

/** Legacy URL — team management lives under Settings. */
export default function TeamPageRedirect() {
  redirect('/settings/team/')
}
