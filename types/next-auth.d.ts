import { DefaultUser } from "next-auth"

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string
    academyId?: string
    username?: string
  }

  interface Session {
    user?: User
  }

  interface JWT {
    role?: string
    academyId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    academyId?: string
  }
}
