import "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
  }

  interface Session {
    user: User & {
      id: string
      role: UserRole
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
  }
}