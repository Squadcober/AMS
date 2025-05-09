import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"

// Import providers in correct order to avoid circular dependencies
import { SessionProvider } from "@/contexts/SessionContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import { BatchProvider } from "@/contexts/BatchContext"
import { CoachProvider } from "@/contexts/CoachContext"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AMS - Digitizing Sports",
  description: "Advanced Management System for Sports",
  icons: {
    icon: "/logo.png", // Use your logo as favicon
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="min-h-screen bg-background">
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AuthProvider>
          <PlayerProvider>
            <BatchProvider>
              <CoachProvider>
                <SessionProvider>
                  {children}
                </SessionProvider>
              </CoachProvider>
           </BatchProvider>
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
      </body>
    </html>
  )
}

