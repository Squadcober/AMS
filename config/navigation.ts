export const navItems = {
  student: [
    { name: "Profile", href: "/dashboard/student/profile" },
    // ...existing navigation items...
  ],
  coach: [
    { name: "Profile", href: "/dashboard/coach/profile" },
    // ...existing navigation items...
  ],
  admin: [
    { name: "Dashboard", href: "/dashboard/admin/about" },
    // ...existing navigation items...
  ],
  coordinator: [
    { name: "Dashboard", href: "/dashboard/coordinator/overview" },
    // ...existing navigation items...
  ],
  owner: [
    { name: "Sessions", href: "/dashboard/Owner/academy-management" },
    // ...existing navigation items...
  ],
} as const;

export type UserRole = keyof typeof navItems;
