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
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <div id="main-content" tabIndex={-1} className="flex min-h-full flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
