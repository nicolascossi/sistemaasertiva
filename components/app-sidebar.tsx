"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Users, FileText, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/cotizaciones",
    label: "Cotizaciones",
    icon: FileText,
  },
  {
    href: "/productos",
    label: "Productos",
    icon: Package,
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-white">
      <div className="flex h-14 items-center border-b border-border px-5">
        <span className="text-sm font-bold uppercase tracking-widest text-foreground">
          ASERTIVA
        </span>
      </div>
      <nav className="flex flex-1 flex-col p-3 gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Cotizador v1.1</p>
      </div>
    </aside>
  )
}
