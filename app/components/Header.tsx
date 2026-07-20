"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { UserDropdown } from "./userDropdown"
import { Menu, X } from "lucide-react"

interface HeaderProps {
  session: any
  status: string
  dropdownOpen: boolean
  setDropdownOpen: (open: boolean) => void
  onViewRideHistory?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  session,
  status,
  dropdownOpen,
  setDropdownOpen,
  onViewRideHistory,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleViewRideHistory = () => {
    console.log("Header: onViewRideHistory called", typeof onViewRideHistory)
    if (onViewRideHistory) {
      onViewRideHistory()
    } else {
      console.error("onViewRideHistory is not defined")
    }
  }

  const navItems = [
    { label: "Ride", href: "#" },
    { label: "Drive", href: "#" },
    { label: "Business", href: "#" },
    { label: "About", href: "#" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200" style={{boxShadow: 'var(--shadow-sm)'}}>
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-black rounded-xl group-hover:bg-gray-800 transition-colors duration-200">
              <i className="text-lg md:text-xl text-yellow-400 ri-taxi-line" aria-hidden="true"></i>
            </div>
            <span className="hidden sm:inline font-extrabold text-xl md:text-2xl text-gray-900 tracking-tight">
              Ryda
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 lg:gap-12">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm lg:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200 relative group"
            >
              {item.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300 rounded-full"></span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden lg:flex items-center gap-5">
            <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">En</button>
            <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200">Help</button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {status === "loading" ? (
              <span className="text-sm text-gray-400">Loading...</span>
            ) : session ? (
              <UserDropdown
                username={session.user?.name || session.user?.email || ""}
                isOpen={dropdownOpen}
                onToggle={() => setDropdownOpen(!dropdownOpen)}
                onSignOut={() => signOut()}
                onViewRideHistory={handleViewRideHistory}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-block text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link href="/register">
                  <button className="px-4 md:px-5 py-2 md:py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-sm font-bold rounded-xl transition-all duration-200 hover:shadow-md active:scale-95">
                    Sign up
                  </button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white">
          <div className="flex flex-col px-4 py-3 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 flex gap-4">
              <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 text-left transition-colors">En</button>
              <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 text-left transition-colors">Help</button>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
