"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuthStore } from "@/lib/store/auth-store"
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store"
import { formatAccountNumber } from "@/lib/utils"
import { ChevronDown, Plus, BarChart2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useIntercomContext } from "@/components/intercom"

// Utility to get initial from name or email
function getInitial(nameOrEmail: string) {
  if (!nameOrEmail) return ""
  const trimmed = nameOrEmail.trim()
  if (trimmed.length === 0) return ""
  return trimmed[0].toUpperCase()
}

export function Header() {
  const { user, userDoc, logout } = useAuthStore()
  const { userAdsAccounts, selectedAdsAccount, setSelectedAdsAccount } = useUserAdsAccountsStore()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { show } = useIntercomContext()

  // Dropdown handler
  const handleSelectAccount = (account: any) => {
    if (!selectedAdsAccount || selectedAdsAccount.id !== account.id) {
      setSelectedAdsAccount(account)
      setDropdownOpen(false)
      router.push("/dashboard")
    } else {
      setDropdownOpen(false)
      if (!pathname || !pathname.startsWith("/dashboard")) {
        router.push("/dashboard")
      }
    }
    setMobileMenuOpen(false)
  }

  const getLogoHref = () => {
    if (!user || userAdsAccounts.length === 0) return "/"
    if (userAdsAccounts.length === 1) return "/dashboard"
    return "/summary"
  }

  // Avatar fallback
  const avatarUrl = userDoc?.Avatar || "/images/default-avatar.png"
  const userName = userDoc?.Name || userDoc?.Email || "User"
  const userInitial = getInitial(userName)

  // Handle menu open/close and outside click
  React.useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <header className="w-full bg-[#FAFBFF] h-16 flex items-center border-b border-[#F0F1F6] px-4 md:px-6 lg:px-20 relative">
      <div className="flex w-full max-w-[1440px] mx-auto items-center justify-between">
        {/* Left: Logo + Account Dropdown */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={getLogoHref()} className="flex items-center gap-2 min-w-0">
            <Image src="/images/adalert-logo.avif" alt="AdAlert Logo" width={32} height={32} priority />
            <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">adAlert.io</span>
          </Link>

          {user && userAdsAccounts.length > 0 && (
<div className="relative ml-4 hidden md:inline-block">
              <button
                className="flex items-center gap-2 px-4 py-2 border border-[#E3E8F0] bg-white rounded-xl shadow-sm text-[#7A7D9C] text-base font-medium w-fit hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 transition-all"
                onClick={() => setDropdownOpen((v) => !v)}
                type="button"
              >
                <span className="whitespace-nowrap">
                  {!pathname || !pathname.startsWith("/dashboard")
                    ? "Select an ads account"
                    : selectedAdsAccount
                      ? `${
                          selectedAdsAccount["Account Name Editable"] || selectedAdsAccount.name || "Account"
                        } – ${formatAccountNumber(selectedAdsAccount.Id || selectedAdsAccount.id || "")}`
                      : "Select an ads account"}
                </span>
                <ChevronDown className="w-5 h-5 text-blue-600 shrink-0" />
              </button>

              {dropdownOpen && (
                <ul className="absolute left-0 mt-2 min-w-max bg-white border border-[#E3E8F0] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in">
                  {userAdsAccounts.map((account) => (
                    <li
                      key={account.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-900 flex items-center gap-2 ${
                        selectedAdsAccount?.id === account.id ? "bg-blue-50 font-semibold" : ""
                      }`}
                      onClick={() => handleSelectAccount(account)}
                    >
                      <span className="whitespace-nowrap">{account["Account Name Editable"] || account.name}</span>
                      <span className="text-[#7A7D9C] ml-2">{formatAccountNumber(account.Id || account.id || "")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Desktop actions - Right side */}
        <div className="hidden md:flex items-center gap-4">
          {user && userDoc && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600"
                onClick={() => router.push("/add-ads-account")}
              >
                <Plus className="w-5 h-5" />
              </Button>
              {userAdsAccounts.length >= 2 && (
                <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => router.push("/summary")}>
                  <BarChart2 className="w-5 h-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => show()}>
                <HelpCircle className="w-5 h-5" />
              </Button>

              {/* Avatar */}
              <div
                className="flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-xl hover:bg-blue-50 transition-all relative"
                onClick={() => setMenuOpen((v) => !v)}
                ref={menuRef}
              >
                <Image
                  src={avatarUrl || "/placeholder.svg"}
                  alt={userName}
                  width={32}
                  height={32}
                  className="rounded-full object-cover border border-[#E3E8F0]"
                />
                <span className="hidden md:inline text-base font-medium text-gray-900">{userName}</span>
                <ChevronDown className="w-5 h-5 text-blue-600" />
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-50 min-w-[180px] bg-white rounded-xl shadow-lg border border-[#E3E8F0] py-2">
                    <button
                      className="w-full text-left px-4 py-2 text-[16px] text-[#232360] hover:bg-blue-50"
                      onClick={() => {
                        router.push("/settings/my-profile")
                        setMenuOpen(false)
                      }}
                    >
                      My Profile
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-[16px] text-[#232360] hover:bg-blue-50"
                      onClick={() => {
                        router.push("/settings")
                        setMenuOpen(false)
                      }}
                    >
                      Settings
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-[16px] text-[#232360] hover:bg-blue-50"
                      onClick={() => {
                        router.push("/summary")
                        setMenuOpen(false)
                      }}
                    >
                      Summary
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-[16px] text-[#232360] hover:bg-blue-50"
                      onClick={() => {
                        show()
                        setMenuOpen(false)
                      }}
                    >
                      Help
                    </button>
                    <div className="my-1 border-t border-gray-200" />
                    <button
                      className="w-full text-left px-4 py-2 text-[16px] text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        await logout()
                        router.push("/auth")
                        setMenuOpen(false)
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile actions - First row: Logo, Plus, Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {user && userDoc && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600"
                onClick={() => router.push("/add-ads-account")}
              >
                <Plus className="w-5 h-5" />
              </Button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-2 rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12M6 18h12"
                    />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {user && userDoc && userAdsAccounts.length > 0 && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 px-4 py-3 z-40">
          <div className="relative">
            <button
              className="flex items-center justify-between w-full px-4 py-3 border border-[#E3E8F0] bg-white rounded-xl shadow-sm text-[#7A7D9C] text-base font-medium hover:border-blue-400 transition-all"
              onClick={() => setDropdownOpen((v) => !v)}
              type="button"
            >
              <span className="truncate">
                {!pathname || !pathname.startsWith("/dashboard")
                  ? "Select an ads account"
                  : selectedAdsAccount
                    ? `${
                        selectedAdsAccount["Account Name Editable"] || selectedAdsAccount.name || "Account"
                      } – ${formatAccountNumber(selectedAdsAccount.Id || selectedAdsAccount.id || "")}`
                    : "Select an ads account"}
              </span>
              <ChevronDown className="w-5 h-5 text-blue-600 shrink-0 ml-2" />
            </button>

            {dropdownOpen && (
              <ul className="absolute left-0 mt-2 w-full bg-white border border-[#E3E8F0] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in">
                {userAdsAccounts.map((account) => (
                  <li
                    key={account.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-900 flex items-center justify-between ${
                      selectedAdsAccount?.id === account.id ? "bg-blue-50 font-semibold" : ""
                    }`}
                    onClick={() => handleSelectAccount(account)}
                  >
                    <span className="truncate">{account["Account Name Editable"] || account.name}</span>
                    <span className="text-[#7A7D9C] ml-2 shrink-0">
                      {formatAccountNumber(account.Id || account.id || "")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div
        className={`md:hidden bg-white border-t border-gray-200 shadow-lg absolute left-0 w-full z-50 transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          top: user && userDoc && userAdsAccounts.length > 0 ? "136px" : "64px",
        }}
      >
        <div className="flex flex-col p-4 gap-4">
          {user && (
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  router.push("/settings/my-profile")
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                My Profile
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  router.push("/settings")
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  router.push("/summary")
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                Summary
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  show()
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                Help
              </Button>
              <div className="my-1 border-t border-gray-200" />
              <Button
                variant="destructive"
                onClick={async () => {
                  await logout()
                  router.push("/auth")
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                Log out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
