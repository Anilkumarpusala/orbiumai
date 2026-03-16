import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Orbium AI — Your AI Workforce',
  description: 'Your AI team that works while you sleep.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
