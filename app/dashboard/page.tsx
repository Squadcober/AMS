"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { UserRole } from "@/types/user"
// Make sure UserRole is defined as follows in '@/types/user':
// export enum UserRole {
//   STUDENT = "STUDENT",
//   COACH = "COACH",
//   ADMIN = "ADMIN",
//   COORDINATOR = "COORDINATOR",
//   OWNER = "OWNER"
// }

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case UserRole.STUDENT:
          router.push("/dashboard/student/profile")
          break
        case UserRole.COACH:
          router.push("/dashboard/coach/profile")
          break
        case UserRole.ADMIN:
          router.push("/dashboard/admin/about")
          break
        case UserRole.COORDINATOR:
          router.push("/dashboard/coordinator/overview")
          break
        case UserRole.OWNER:
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

