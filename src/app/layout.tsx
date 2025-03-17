// app/layout.tsx
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

// Remove the Google font import
// import { Inter } from 'next/font/google'
// const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'College Marketplace Admin',
  description: 'Admin dashboard for college marketplace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Remove the inter.className reference */}
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}