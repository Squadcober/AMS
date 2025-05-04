"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import SplashScreen from './SplashScreen'

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Show splash screen on route change
    setIsLoading(true)

    // Hide splash screen after delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // Adjust timing as needed

    return () => clearTimeout(timer)
  }, [pathname]) // Re-run when route changes

  if (isLoading) {
    return <SplashScreen />
  }

  return <>{children}</>
}
