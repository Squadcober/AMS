"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { UserRole } from "@/types/user"

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case "student":
          router.push("/dashboard/student/profile")
          break
        case "coach":
          router.push("/dashboard/coach/profile")
          break
        case "admin":
          router.push("/dashboard/admin/about")
          break
        case "coordinator" as UserRole:
          router.push("/dashboard/coordinator/overview")
          break
        case "owner":
          router.push("/dashboard/admin/academy-management")
          break
        default:
          router.push("/auth")
      }
    } else {
      router.push("/auth")
    }
  }, [user, router])

  return null
}

