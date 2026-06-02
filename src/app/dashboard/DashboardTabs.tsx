"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Tab = { label: string; href: string }

export default function DashboardTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex -mb-px overflow-x-auto">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-green-700 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
