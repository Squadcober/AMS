'use client'

import { useAuth } from "@/contexts/AuthContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function SessionsPageContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div>Loading authentication...</div>
  }

  if (!user) {
    return null
  }

  // Move all the existing SessionsContent code here
  // ...existing code...
}