import { redirect } from 'next/navigation'

/** Landing URL — send editors straight to the CMS inbox. */
export default function HomePage() {
  redirect('/cms/inbox/')
}
