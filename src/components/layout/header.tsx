'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth-store'
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store'
import { formatAccountNumber } from '@/lib/utils'
import {
  ChevronDown,
  Plus,
  BarChart2,
  HelpCircle,
  User,
  Settings,
  LogOut,
  Calendar1Icon,
  CreditCardIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useIntercomContext } from '@/components/intercom'
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_PERIODS } from '@/lib/constants'
import moment from 'moment'

// Utility to get initial from name or email
function getInitial (nameOrEmail: string) {
  if (!nameOrEmail) return ''
  const trimmed = nameOrEmail.trim()
  if (trimmed.length === 0) return ''
  return trimmed[0].toUpperCase()
}

export function Header () {
  const { user, userDoc, logout } = useAuthStore()
  const { userAdsAccounts, selectedAdsAccount, setSelectedAdsAccount } =
    useUserAdsAccountsStore()
  const { subscription } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { show } = useIntercomContext()

  // Subscription data is now automatically fetched by auth store
  // No need to manually fetch here

  // Check if subscription is expired/limited
  const isSubscriptionExpired = React.useMemo(() => {
    if (!subscription) return false
    const status = subscription['User Status']
    return (
      status === SUBSCRIPTION_STATUS.TRIAL_ENDED ||
      status === SUBSCRIPTION_STATUS.CANCELED ||
      status === SUBSCRIPTION_STATUS.PAYMENT_FAILED
    )
  }, [subscription])

  // Calculate trial days left
  const trialDaysLeft = React.useMemo(() => {
    if (!subscription) return 0
    const status = subscription['User Status']
    if (
      status !== SUBSCRIPTION_STATUS.TRIAL_NEW &&
      status !== SUBSCRIPTION_STATUS.TRIAL_ENDED
    )
      return 0

    const trialStartDate = subscription['Free Trial Start Date']?.toDate?.()
    if (!trialStartDate) return 0

    const trialEndDate = moment(trialStartDate).add(
      SUBSCRIPTION_PERIODS.TRIAL_DAYS,
      'days'
    )
    const now = moment()
    const daysLeft = Math.max(0, trialEndDate.diff(now, 'days'))

    return daysLeft
  }, [subscription])

  // Dropdown handler
  const handleSelectAccount = (account: any) => {
    if (!selectedAdsAccount || selectedAdsAccount.id !== account.id) {
      setSelectedAdsAccount(account)
      setDropdownOpen(false)
      router.push('/dashboard')
    } else {
      setDropdownOpen(false)
      if (!pathname || !pathname.startsWith('/dashboard')) {
        router.push('/dashboard')
      }
    }
    setMobileMenuOpen(false)
  }

  const getLogoHref = () => {
    if (!user || userAdsAccounts.length === 0) return '/'
    if (userAdsAccounts.length === 1) return '/dashboard'
    return '/summary'
  }

  // Avatar fallback
  const avatarUrl = userDoc?.Avatar || '/images/default-avatar.png'
  const userName = userDoc?.Name || userDoc?.Email || 'User'
  const userInitial = getInitial(userName)

  const handleSettingsClick = () => {
    if (isSubscriptionExpired) {
      router.push('/settings/account/billing')
    } else {
      router.push('/settings')
    }
    setMenuOpen(false)
    setMobileMenuOpen(false)
  }

  // Close menus when clicking outside
  React.useEffect(() => {
    function handleClick (e: MouseEvent) {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !(target as HTMLElement).closest('li') &&
        !(target as HTMLElement).closest('ul') // Don't close when clicking on the dropdown list
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
      {/* Trial Banner */}
      {subscription &&
        (subscription['User Status'] === SUBSCRIPTION_STATUS.TRIAL_NEW ||
          subscription['User Status'] === SUBSCRIPTION_STATUS.TRIAL_ENDED) && (
          <div className='w-full bg-[#FFEBEE] px-4 md:px-6 lg:px-20 py-2'>
            <div className='max-w-[1440px] mx-auto text-center'>
              <span className='text-gray-900 text-[13px]'>
                <Calendar1Icon className='inline w-4 h-4 mb-1 mr-1' />
                You're on a free trial with{' '}
              </span>
              <span className='text-gray-900 text-[13px] font-bold'>
                {trialDaysLeft} days left
              </span>
              <span className='text-gray-900 text-[13px]'>
                {' '}
                - Upgrade for 24/7 monitoring and peace of mind!
              </span>
              <button
                onClick={() => router.push('/settings/account/billing')}
                className='text-white rounded rounded-[5px] border px-3 py-1 bg-[#da486b] font-medium hover:bg-[#000] transition-colors text-[12px] ml-3 cursor-pointer'
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      {/* Payment Failed Banner */}
      {subscription &&
        subscription['User Status'] === SUBSCRIPTION_STATUS.PAYMENT_FAILED && (
          <div className='w-full bg-[#FFEBEE] px-4 md:px-6 lg:px-20 py-1'>
            <div className='max-w-[1440px] mx-auto text-center'>
              <span className='text-gray-900 text-sm'>
                <CreditCardIcon className='inline w-4 h-4 mb-1 mr-1' />
                Your subscription payment has failed. Please update your payment
                method to avoid any service interruptions.{' '}
              </span>
              <button
                onClick={() => router.push('/settings/account/billing')}
                className=' bg-[#da486b] rounded-[5px] text-blue-400 font-bold underline hover:text-blue-500 transition-colors text-sm'
              >
                Update
              </button>
              <span className='text-gray-900 text-sm'> now!</span>
            </div>
          </div>
        )}
      <header className='w-full bg-[#FAFBFF] h-16 flex items-center border-b border-[#F0F1F6] px-4 md:px-6 lg:px-20 relative'>
        <div className='flex w-full max-w-[1440px] mx-auto items-center justify-between'>
          {/* Left: Logo + Account Dropdown */}
          <div className='flex items-center gap-3 min-w-0'>
            <Link
              href={getLogoHref()}
              className='flex items-center gap-2 min-w-0'
            >
              <Image
                src='/images/adalert-logo.avif'
                alt='AdAlert Logo'
                width={32}
                height={32}
                priority
              />
              <span className='text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap'>
                adAlert.io
              </span>
            </Link>

            {user && userAdsAccounts.length > 0 && (
              <div
                className='relative ml-4 hidden md:inline-block z-[70]'
                ref={dropdownRef}
              >
                <button
                  className={`flex items-center gap-2 px-4 py-2 border border-[#E3E8F0] bg-white rounded-xl shadow-none text-[#5e5e5e] text-base font-normal w-fit transition-all ${
                    isSubscriptionExpired
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200'
                  }`}
                  onClick={() =>
                    !isSubscriptionExpired && setDropdownOpen(v => !v)
                  }
                  type='button'
                  disabled={isSubscriptionExpired}
                  title={
                    isSubscriptionExpired
                      ? 'Subscription expired. Please renew to switch ads accounts.'
                      : 'Select an ads account'
                  }
                >
                  <span className='whitespace-nowrap'>
                    {!pathname || !pathname.startsWith('/dashboard')
                      ? 'Select an ads account'
                      : selectedAdsAccount
                      ? `${
                          selectedAdsAccount['Account Name Editable'] ||
                          selectedAdsAccount.name ||
                          'Account'
                        } – ${formatAccountNumber(
                          selectedAdsAccount.Id || selectedAdsAccount.id || ''
                        )}`
                      : 'Select an ads account'}
                  </span>
                  <ChevronDown className='w-5 h-5 text-blue-600 shrink-0' />
                </button>

                {dropdownOpen && (
                  <ul className='absolute left-0 mt-2 min-w-max bg-white border border-[#E3E8F0] rounded-xl shadow-none z-[80] max-h-60 overflow-y-auto animate-in fade-in'>
                    {userAdsAccounts.map(account => (
                      <li
                        key={account.id}
                        className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm text-[#5e5e5e] flex items-center gap-1 ${
                          selectedAdsAccount?.id === account.id
                            ? 'bg-blue-50 font-semibold'
                            : ''
                        }`}
                        onClick={e => handleSelectAccount(account)}
                      >
                        <span className='whitespace-nowrap font-bold'>
                          {account['Account Name Editable'] || account.name}
                        </span>
                        -
                        <span>
                          {formatAccountNumber(account.Id || account.id || '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Desktop actions - Right side */}
          <div className='hidden md:flex items-center gap-4'>
            {user && userDoc && (
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  className={`text-blue-600 ${
                    isSubscriptionExpired ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() =>
                    !isSubscriptionExpired && router.push('/add-ads-account')
                  }
                  disabled={isSubscriptionExpired}
                  title={
                    isSubscriptionExpired
                      ? 'Subscription expired. Please renew to add ads accounts.'
                      : 'Add Ads Account'
                  }
                >
                  <Plus className='w-5 h-5' />
                </Button>
                {userAdsAccounts.length >= 2 && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className={`text-blue-600 ${
                      isSubscriptionExpired
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                    onClick={() =>
                      !isSubscriptionExpired && router.push('/summary')
                    }
                    disabled={isSubscriptionExpired}
                    title={
                      isSubscriptionExpired
                        ? 'Subscription expired. Please renew to view summary.'
                        : 'View Summary'
                    }
                  >
                    <BarChart2 className='w-5 h-5' />
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='icon'
                  className='text-blue-600'
                  onClick={() => show()}
                >
                  <HelpCircle className='w-5 h-5' />
                </Button>

                {/* Avatar */}
                <div
                  className='flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-xl hover:bg-blue-50 transition-all relative'
                  onClick={() => setMenuOpen(v => !v)}
                  ref={menuRef}
                >
                  <Image
                    src={avatarUrl || '/placeholder.svg'}
                    alt={userName}
                    width={32}
                    height={32}
                    className='rounded-full object-cover border border-[#E3E8F0]'
                  />
                  <span className='hidden md:inline text-base font-medium text-[#5e5e5e]'>
                    {userName}
                  </span>
                  <ChevronDown className='w-5 h-5 text-blue-600' />
                  {menuOpen && (
                    <div className='absolute right-0 top-12 z-[80] min-w-[180px] bg-white rounded-xl shadow-none border border-[#E3E8F0] py-2'>
                      <button
                        className='w-full text-left px-4 py-2 flex items-center gap-2 text-[16px] text-[#5e5e5e] hover:bg-blue-50'
                        onClick={() => {
                          router.push('/settings/my-profile')
                          setMenuOpen(false)
                        }}
                      >
                        <User className='w-4 h-4' /> My Profile
                      </button>
                      <button
                        className='w-full text-left px-4 py-2 flex items-center gap-2 text-[16px] text-[#5e5e5e] hover:bg-blue-50'
                        onClick={handleSettingsClick}
                      >
                        <Settings className='w-4 h-4' /> Settings
                      </button>
                      <button
                        className='w-full text-left px-4 py-2 flex items-center gap-2 text-[16px] text-[#5e5e5e] hover:bg-blue-50'
                        onClick={() => {
                          show()
                          setMenuOpen(false)
                        }}
                      >
                        <HelpCircle className='w-4 h-4' /> Help
                      </button>
                      <div className='my-1 border-t border-gray-200' />
                      <button
                        className='w-full text-left px-4 py-2 flex items-center gap-2 text-[16px] text-[#5e5e5e]  hover:bg-blue-50'
                        onClick={async () => {
                          await logout()
                          router.push('/auth')
                          setMenuOpen(false)
                        }}
                      >
                        <LogOut className='w-4 h-4' /> Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile actions - First row */}
          <div className='md:hidden flex items-center gap-2'>
            {user && userDoc && (
              <>
                <Button
                  variant='ghost'
                  size='icon'
                  className={`text-blue-600 ${
                    isSubscriptionExpired ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() =>
                    !isSubscriptionExpired && router.push('/add-ads-account')
                  }
                  disabled={isSubscriptionExpired}
                  title={
                    isSubscriptionExpired
                      ? 'Subscription expired. Please renew to add ads accounts.'
                      : 'Add Ads Account'
                  }
                >
                  <Plus className='w-5 h-5' />
                </Button>
                {userAdsAccounts.length >= 2 && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className={`text-blue-600 ${
                      isSubscriptionExpired
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                    onClick={() =>
                      !isSubscriptionExpired && router.push('/summary')
                    }
                    disabled={isSubscriptionExpired}
                    title={
                      isSubscriptionExpired
                        ? 'Subscription expired. Please renew to view summary.'
                        : 'View Summary'
                    }
                  >
                    <BarChart2 className='w-5 h-5' />
                  </Button>
                )}
                <button
                  type='button'
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className='p-2 rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none'
                >
                  {mobileMenuOpen ? (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  ) : (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 6h16M4 12h16M4 18h16'
                      />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden bg-white border-t border-gray-200 shadow-none absolute left-0 w-full z-40 transition-all duration-300 overflow-hidden ${
            mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
          style={{
            top:
              user && userDoc && userAdsAccounts.length > 0 ? '136px' : '64px'
          }}
        >
          <div className='flex flex-col p-4 gap-4'>
            {user && (
              <div className='flex flex-col gap-2'>
                <Button
                  variant='ghost'
                  onClick={() => {
                    router.push('/settings/my-profile')
                    setMobileMenuOpen(false)
                  }}
                  className='w-full justify-start text-[#5e5e5e] flex items-center gap-2'
                >
                  <User className='w-4 h-4' /> My Profile
                </Button>
                <Button
                  variant='ghost'
                  onClick={handleSettingsClick}
                  className='w-full justify-start text-[#5e5e5e] flex items-center gap-2'
                >
                  <Settings className='w-4 h-4' /> Settings
                </Button>
                <Button
                  variant='ghost'
                  onClick={() => {
                    show()
                    setMobileMenuOpen(false)
                  }}
                  className='w-full justify-start text-[#5e5e5e] flex items-center gap-2'
                >
                  <HelpCircle className='w-4 h-4' /> Help
                </Button>
                <div className='my-1 border-t border-gray-200' />
                <Button
                  variant='ghost'
                  onClick={async () => {
                    await logout()
                    router.push('/auth')
                    setMobileMenuOpen(false)
                  }}
                  className='w-full justify-start text-[#5e5e5e] flex items-center gap-2'
                >
                  <LogOut className='w-4 h-4' /> Log out
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile account dropdown */}
        {user && userDoc && userAdsAccounts.length > 0 && (
          <div className='md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 px-4 py-3 z-[70]'>
            <div className='relative' ref={dropdownRef}>
              <button
                className={`flex items-center justify-between w-full px-4 py-3 border border-[#E3E8F0] bg-white rounded-xl shadow-none text-[#5e5e5e] text-base font-medium transition-all ${
                  isSubscriptionExpired
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-blue-400'
                }`}
                onClick={() =>
                  !isSubscriptionExpired && setDropdownOpen(v => !v)
                }
                type='button'
                disabled={isSubscriptionExpired}
                title={
                  isSubscriptionExpired
                    ? 'Subscription expired. Please renew to switch ads accounts.'
                    : 'Select an ads account'
                }
              >
                <span className='truncate'>
                  {!pathname || !pathname.startsWith('/dashboard')
                    ? 'Select an ads account'
                    : selectedAdsAccount
                    ? `${
                        selectedAdsAccount['Account Name Editable'] ||
                        selectedAdsAccount.name ||
                        'Account'
                      } – ${formatAccountNumber(
                        selectedAdsAccount.Id || selectedAdsAccount.id || ''
                      )}`
                    : 'Select an ads account'}
                </span>
                <ChevronDown className='w-5 h-5 text-blue-600 shrink-0 ml-2' />
              </button>

              {dropdownOpen && (
                <ul className='absolute left-0 mt-2 w-full bg-white border border-[#E3E8F0] rounded-xl shadow-none z-[90] max-h-60 overflow-y-auto animate-in fade-in'>
                  {userAdsAccounts.map(account => (
                    <li
                      key={account.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-blue-50 text-sm text-[#5e5e5e] flex items-center justify-between ${
                        selectedAdsAccount?.id === account.id
                          ? 'bg-blue-50 font-semibold'
                          : ''
                      }`}
                      onClick={() => handleSelectAccount(account)}
                    >
                      <span className='truncate'>
                        {account['Account Name Editable'] || account.name}
                      </span>
                      <span className='ml-2 shrink-0'>
                        {formatAccountNumber(account.Id || account.id || '')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
