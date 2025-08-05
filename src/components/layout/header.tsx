import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { formatAccountNumber } from "@/lib/utils";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { ChevronDown, Plus, BarChart2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useIntercomContext } from "@/components/intercom";

// Utility to get initial from name or email
function getInitial(nameOrEmail: string) {
  if (!nameOrEmail) return "";
  const trimmed = nameOrEmail.trim();
  if (trimmed.length === 0) return "";
  return trimmed[0].toUpperCase();
}

export function Header() {
  const { user, userDoc, logout } = useAuthStore();
  const { userAdsAccounts, selectedAdsAccount, setSelectedAdsAccount } =
    useUserAdsAccountsStore();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { show } = useIntercomContext();

  // Dropdown handler
  const handleSelectAccount = (account: any) => {
    if (!selectedAdsAccount || selectedAdsAccount.id !== account.id) {
      setSelectedAdsAccount(account);
      setDropdownOpen(false);
      router.push("/dashboard");
    } else {
      setDropdownOpen(false);
      if (!pathname || !pathname.startsWith("/dashboard")) {
        router.push("/dashboard");
      }
    }
  };

  // Avatar fallback
  const avatarUrl = userDoc?.Avatar || "/images/default-avatar.png";
  const userName = userDoc?.Name || userDoc?.Email || "User";
  const userInitial = getInitial(userName);

  // Handle menu open/close and outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Menu options
  const menuOptionsMd = [
    { label: "My Profile", onClick: () => router.push("/profile") },
    { label: "Settings", onClick: () => router.push("/settings") },
    { divider: true },
    { label: "Help", onClick: () => show() },
    { divider: true },
    {
      label: "Log out",
      onClick: async () => {
        await logout();
        router.push("/auth");
      },
    },
  ];
  const menuOptionsSm = [
    { label: "Add Accounts", onClick: () => router.push("/add-ads-account") },
    ...(userAdsAccounts.length >= 2
      ? [{ label: "Accounts Summary", onClick: () => router.push("/summary") }]
      : []),
    { divider: true },
    { label: "My Profile", onClick: () => router.push("/profile") },
    { label: "Settings", onClick: () => router.push("/settings") },
    { label: "Help", onClick: () => show() },
    { divider: true },
    {
      label: "Log out",
      onClick: async () => {
        await logout();
        router.push("/auth");
      },
    },
  ];

  return (
    <header className="w-full bg-[#FAFBFF] h-16 flex items-center border-b border-[#F0F1F6] px-6 md:px-6 lg:px-20">
      <div className="flex w-full max-w-[1440px] mx-auto items-center justify-between">
        {/* Left: Logo + Dropdown */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image
              src="/images/adalert-logo.avif"
              alt="AdAlert Logo"
              width={32}
              height={32}
              priority
            />
            <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              adAlert.io
            </span>
          </Link>
          {/* Dropdown: Only if logged in */}
          {user && userAdsAccounts.length > 0 && (
            <div className="relative ml-4">
              <button
                className="flex items-center gap-2 px-4 py-2 border border-[#E3E8F0] bg-white rounded-xl shadow-sm text-[#7A7D9C] text-base font-medium min-w-[240px] hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 transition-all"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                type="button"
              >
                <span className="truncate">
                  {!pathname || !pathname.startsWith("/dashboard")
                    ? "Select an ads account"
                    : selectedAdsAccount
                    ? `${
                        selectedAdsAccount["Account Name Editable"] ||
                        selectedAdsAccount.name ||
                        "Account"
                      } \u2013 ${formatAccountNumber(
                        selectedAdsAccount.Id || selectedAdsAccount.id || ""
                      )}`
                    : "Select an ads account"}
                </span>
                <ChevronDown className="w-5 h-5 text-blue-600" />
              </button>
              {dropdownOpen && (
                <ul
                  className="absolute left-0 mt-2 w-full bg-white border border-[#E3E8F0] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in"
                  tabIndex={-1}
                  role="listbox"
                >
                  {userAdsAccounts.map((account) => (
                    <li
                      key={account.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-900 flex items-center gap-2 ${
                        selectedAdsAccount?.id === account.id
                          ? "bg-blue-50 font-semibold"
                          : ""
                      }`}
                      onClick={() => handleSelectAccount(account)}
                      role="option"
                      aria-selected={selectedAdsAccount?.id === account.id}
                    >
                      <span className="truncate">
                        {account["Account Name Editable"] ||
                          account.name ||
                          "Account"}
                        <span className="text-[#7A7D9C] ml-2">
                          {formatAccountNumber(account.Id || account.id || "")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {/* Right: Icons + User (if logged in) */}
        {user && userDoc && (
          <div className="flex items-center gap-1 min-w-0">
            {/* Icons: hidden on small screens */}
            <div className="hidden sm:flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600"
                aria-label="Add"
                onClick={() => router.push("/add-ads-account")}
              >
                <Plus className="w-5 h-5" />
              </Button>
              {userAdsAccounts.length >= 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-600"
                  aria-label="Stats"
                  onClick={() => router.push("/summary")}
                >
                  <BarChart2 className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-600"
                aria-label="Help"
                onClick={() => show()}
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            {/* Avatar + Name: always visible, show initial on small screens, full name on md+ */}
            <div
              className="flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-xl hover:bg-blue-50 transition-all max-w-full relative"
              onClick={() => setMenuOpen((v) => !v)}
              ref={menuRef}
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="rounded-full object-cover border border-[#E3E8F0]"
              />
              <span className="text-base font-medium text-gray-900 md:inline hidden whitespace-normal break-words max-w-xs md:max-w-none">
                {userName}
              </span>
              <span className="text-base font-medium text-gray-900 md:hidden inline">
                {userInitial}
              </span>
              <ChevronDown className="w-5 h-5 text-blue-600 group-hover:text-blue-800 flex-shrink-0 min-w-[20px]" />
              {/* Dropdown menu */}
              {menuOpen && (
                <div
                  className="absolute right-0 top-12 z-50 min-w-[180px] bg-white rounded-xl shadow-lg border border-[#E3E8F0] py-2 animate-in fade-in"
                  style={{ minWidth: 180 }}
                >
                  {/* md+ menu */}
                  <div className="hidden md:block">
                    {menuOptionsMd.map((item, idx) =>
                      item.divider ? (
                        <div
                          key={idx}
                          className="my-1 border-t border-gray-200"
                        />
                      ) : (
                        <button
                          key={item.label}
                          className="w-full text-left px-4 py-2 text-[16px] text-[#232360] hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            if (item.onClick) item.onClick();
                          }}
                          tabIndex={0}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                  {/* sm menu */}
                  <div className="block md:hidden">
                    {menuOptionsSm.map((item, idx) =>
                      item.divider ? (
                        <div
                          key={idx}
                          className="my-1 border-t border-gray-200"
                        />
                      ) : (
                        <button
                          key={item.label}
                          className="w-full text-left px-4 py-2 text-[14px] text-[#232360] hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            if (item.onClick) item.onClick();
                          }}
                          tabIndex={0}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
