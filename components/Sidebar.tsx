"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { CustomTooltip } from "@/components/custom-tooltip"
import { 
  LayoutDashboard,
  School,
  Users,
  CalendarDays,
  ClipboardList,
  Info,
  Settings,
  Group,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const navItems = {
  student: [
    { name: "Profile", href: "/dashboard/student/profile" },
    { name: "My Sessions", href: "/dashboard/student/training" },
    { name: "Performance", href: "/dashboard/student/performance" },
    { name: "Schedule", href: "/dashboard/student/schedule" },
    { name: "Match Day", href: "/dashboard/student/matchday" },
    { name: "Achievements", href: "/dashboard/student/achievements" },
    { name: "Gallery", href: "/dashboard/student/gallery" },
    { name: "Injury & rehab", href: "/dashboard/student/injury-rehab" },
    { name: "Payments", href: "/dashboard/student/payments" },
    { name: "Scouting", href: "/dashboard/student/scouting" },
    { name: "My Batch", href: "/dashboard/student/batch" },
    { name: "Settings", href: "/dashboard/student/settings" },
    { name: "Logout", href: "/auth" },
  ],
  coach: [
    { name: "Profile", href: "/dashboard/coach/profile" },
    { name: "Batches", href: "/dashboard/coach/batches" },
    { name: "Credentials", href: "/dashboard/coach/credentials" },
    { name: "Sessions", href: "/dashboard/coach/training-data" },
    { name: "Batch Performance", href: "/dashboard/coach/batch-performance" },
    { name: "Team Builder", href: "/dashboard/coach/team-builder" },
    { name: "Match Day", href: "/dashboard/coach/match-day" },
    { name: "Drills", href: "/dashboard/coach/drills" },
    { name: "Settings", href: "/dashboard/coach/settings" },
    { name: "logout", href: "/auth" },
  ],
  admin: [
    { name: "Dashboard", href: "/dashboard/admin/detail" },
    { name: "About", href: "/dashboard/admin/about" },
    { name: "Sessions", href: "/dashboard/admin/sessions" },
    { name: "Match Day", href: "/dashboard/admin/match-day" },
    { name: "Attendance", href: "/dashboard/admin/attendance" },
    { name: "Performance Reports", href: "/dashboard/admin/performance-reports" },
    { name: "Search", href: "/dashboard/admin/search" },
    { name: "Batches", href: "/dashboard/admin/batches" },
    { name: "Finances", href: "/dashboard/admin/finances" },
    { name: "Consult", href: "/dashboard/admin/consult" },
    { name: "Export Data", href: "/dashboard/admin/export-data" },
    { name: "User Management", href: "/dashboard/admin/user-management" },
    { name: "Settings", href: "/dashboard/admin/settings" },
    { name: "logout", href: "/auth" },
  ],
  coordinator: [
    { name: "Dashboard", href: "/dashboard/coordinator" },
    { name: "About", href: "/dashboard/coordinator/overview" },
    { name: "Sessions", href: "/dashboard/coordinator/sessions" },
    { name: "Match Day", href: "/dashboard/coordinator/match-day" },
    { name: "Attendance", href: "/dashboard/coordinator/attendance" },
    { name: "Performance Reports", href: "/dashboard/coordinator/performance-reports" },
    { name: "Search", href: "/dashboard/coordinator/search" },
    { name: "Batches", href: "/dashboard/coordinator/batches" },
    { name: "Finances", href: "/dashboard/coordinator/finances" },
    { name: "Consult", href: "/dashboard/coordinator/consult" },
    { name: "Export Data", href: "/dashboard/coordinator/export-data" },
    { name: "User Management", href: "/dashboard/coordinator/user-management" },
    { name: "logout", href: "/auth" },
  ],
  owner: [
    { name: "Sessions", href: "/dashboard/Owner/sessions" },
    { name: "Match Day", href: "/dashboard/Owner/match-day" },
    { name: "Attendance", href: "/dashboard/Owner/attendance" },
    { name: "Search", href: "/dashboard/Owner/search" },
    { name: "Batches", href: "/dashboard/Owner/batches" },
    { name: "academy management", href: "/dashboard/Owner/academy-management" },
    { name: "Consult", href: "/dashboard/Owner/consult" },
    { name: "User Management", href: "/dashboard/Owner/user-management" },
    { name: "logout", href: "/auth" },
  ],
}

const ownerRoutes = [
  {
    label: "Academies",
    icon: School,
    href: "/dashboard/owner/academies",
    color: "text-violet-500",
  },
  {
    label: "User Management",
    icon: Users,
    href: "/dashboard/owner/user-management",
    color: "text-pink-700",
  },
  {
    label: "Sessions",
    icon: CalendarDays,
    href: "/dashboard/owner/sessions",
    color: "text-orange-700",
  },
  {
    label: "Batches",
    icon: Group,
    href: "/dashboard/owner/batches",
    color: "text-emerald-500",
  },
  {
    label: "Attendance",
    icon: ClipboardList,
    href: "/dashboard/owner/attendance",
    color: "text-green-700",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/owner/settings",
  },
];

export const Sidebar = ({ className }: { className?: string }) => {
  const pathname = usePathname()
  const { user, logout } = useAuth()  // Add logout from useAuth
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!user) return null

  const handleLogout = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    await logout();
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(false)}
        className="fixed top-4 left-4 z-20 md:hidden"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <motion.aside
        initial={{ width: 256 }}
        animate={{ 
          width: isCollapsed ? 80 : 256,
          transition: { duration: 0.2 }
        }}
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } p-4 fixed left-0 top-0 bottom-0 bg-background hidden md:block z-30 ${className || ''}`}
      >
        <Card className="h-full relative">
          {/* Collapse toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 z-50 h-6 w-6 rounded-full bg-primary text-primary-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          <CardHeader className="p-4">
            <CardTitle className={`transition-all duration-200 ${
              isCollapsed ? 'text-center text-sm' : 'text-xl'
            }`}>
              {isCollapsed ? 'AMS' : 'AMS Dashboard'}
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 h-[calc(100vh-8rem)] px-2">
            <CardContent className="p-2">
              {/* Remove Quick Access section and keep only navigation items */}
              <div className="space-y-1">
                {!isCollapsed && (
                  <h2 className="text-lg font-semibold mb-2"></h2>
                )}
                {navItems[user.role as unknown as keyof typeof navItems]?.map((item) => (
                  <CustomTooltip 
                    key={item.name} 
                    content={isCollapsed ? item.name : `Go to ${item.name}`}
                  >
                    {item.name.toLowerCase() === 'logout' ? (
                      <a
                        href="#"
                        onClick={handleLogout}
                        className={`block rounded-md transition-all duration-200
                          ${pathname === item.href 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                          }
                          ${isCollapsed 
                            ? 'p-2 text-center w-10 mx-auto' 
                            : 'w-full p-2'
                          }
                        `}
                      >
                        {isCollapsed ? 'L' : 'Logout'}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={`block rounded-md transition-all duration-200
                          ${pathname === item.href 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                          }
                          ${isCollapsed 
                            ? 'p-2 text-center w-10 mx-auto' 
                            : 'w-full p-2'
                          }
                        `}
                      >
                        {isCollapsed ? item.name.charAt(0) : item.name}
                      </Link>
                    )}
                  </CustomTooltip>
                ))}
              </div>
            </CardContent>
          </ScrollArea>

          <div className={`p-4 border-t transition-all duration-200 ${
            isCollapsed ? 'text-center' : ''
          }`}>
            <div className="text-sm text-muted-foreground truncate">
              {isCollapsed ? user.name?.charAt(0) : `Logged in as: ${user.name}`}
            </div>
          </div>
        </Card>
      </motion.aside>

      {/* Add wrapper div for main content with margin */}
      <div className={`${isCollapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-200`}>
        {/* Main content goes here */}
      </div>

      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  )
}

// Keep the default export
export default Sidebar

