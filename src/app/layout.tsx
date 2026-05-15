import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexo',
  applicationName: 'Nexo',
  description: 'Gestión de stock, albaranes y control operativo del restaurante',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
