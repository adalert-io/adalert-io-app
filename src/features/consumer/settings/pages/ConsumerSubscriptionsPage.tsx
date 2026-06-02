'use client';

import { Check, AlertTriangle, XIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useEffect, useState } from 'react';
import { SUBSCRIPTION_PRICES } from '@/lib/constants';
import moment from 'moment';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_PERIODS } from '@/lib/constants';
import {
  consumerSettingsPageWidth,
  consumerSettingsSurface,
} from '@/features/consumer/settings/consumer-settings-styles';
import { cn } from '@/lib/utils';

export interface SubscriptionsSubtabProps {
  consumerShell?: boolean;
}

export default function SubscriptionsSubtab({
  consumerShell = false,
}: SubscriptionsSubtabProps) {
  const {
    adsAccounts,
    fetchAdsAccounts,
    deleteCompanyAccount,
    subscription,
    fetchSubscription,
  } = useAlertSettingsStore();
  const { userDoc, logout } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userDoc?.['Company Admin'] && !adsAccounts.length) {
      fetchAdsAccounts(userDoc['Company Admin']);
    }
  }, [userDoc, adsAccounts.length, fetchAdsAccounts]);

  // Fetch subscription when component loads and subscription is empty
  useEffect(() => {
    if (userDoc?.['Company Admin'] && !subscription) {
      fetchSubscription(userDoc['Company Admin']);
    }
  }, [userDoc, subscription, fetchSubscription]);

  const connectedAccountsCount = adsAccounts.length;

  // Calculate subscription price based on number of ads accounts
  const calculateSubscriptionPrice = () => {
    if (connectedAccountsCount === 0) {
      return 0;
    } else if (connectedAccountsCount === 1) {
      return SUBSCRIPTION_PRICES.FIRST_ADS_ACCOUNT;
    } else {
      return (
        SUBSCRIPTION_PRICES.FIRST_ADS_ACCOUNT +
        SUBSCRIPTION_PRICES.ADDITIONAL_ADS_ACCOUNT *
          (connectedAccountsCount - 1)
      );
    }
  };

  const subscriptionPrice = calculateSubscriptionPrice();

  let statusText = '';
  let statusColor = '';
  let statusBg = '';

  if (subscription) {
    const status = subscription['User Status'];
    const trialStart = subscription['Free Trial Start Date']?.toDate
      ? subscription['Free Trial Start Date'].toDate()
      : null;

    const trialEnd = trialStart
      ? moment(trialStart).add(SUBSCRIPTION_PERIODS.TRIAL_DAYS, 'days')
      : null;

    const now = moment();

    if (status === SUBSCRIPTION_STATUS.PAYING) {
      statusText = 'Paid Plan Active';
      statusColor = '#24B04D';
      statusBg = '#e9ffef';
    } else if (
      status === SUBSCRIPTION_STATUS.TRIAL_NEW &&
      trialEnd &&
      now.isBefore(trialEnd, 'day')
    ) {
      // Active trial (still days left)
      statusText = 'Free Trial';
      statusColor = '#24B04D';
      statusBg = '#e9ffef';
    } else if (
      (status === SUBSCRIPTION_STATUS.TRIAL_NEW ||
        status === SUBSCRIPTION_STATUS.TRIAL_ENDED) &&
      trialEnd &&
      now.isSameOrAfter(trialEnd, 'day')
    ) {
      // Trial has ended (0 days left or later)
      statusText = 'Free Trial Ended';
      statusColor = '#ee1b23';
      statusBg = '#ffebee';
    } else if (status === SUBSCRIPTION_STATUS.CANCELED) {
      statusText = 'Subscription Canceled';
      statusColor = '#ee1b23';
      statusBg = '#ffebee';
    } else if (status === SUBSCRIPTION_STATUS.PAYMENT_FAILED) {
      statusText = 'Payment Failed';
      statusColor = '#ee1b23';  
      statusBg = '#ffebee';
    }
  }

  // TODO: need to test
  const handleDeleteCompanyAccount = async () => {
    if (!userDoc?.['Company Admin']) return;
    setIsDeleting(true);
    try {
      await deleteCompanyAccount(userDoc['Company Admin'], logout);
    } catch (error) {
      console.error('Error deleting company account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const billingHref = consumerShell
    ? '/consumer/settings/account/billing'
    : '/settings/account/billing';

  return (
    <div
      className={cn(
        'space-y-6',
        consumerShell && consumerSettingsPageWidth,
      )}
    >
      {/* Main Subscription Card */}
      <div
        className={cn(
          'bg-white p-4',
          consumerShell && consumerSettingsSurface,
        )}
      >
        {!consumerShell && (
          <h2 className='mb-6 text-xl font-bold'>Subscriptions</h2>
        )}

        {/* Current Status */}
        <div className='mb-6'>
          <div className='flex items-start  gap-4 mb-4 justify-between sm:flex-row flex-col items-center '>
            <div className='text-3xl font-bold'>
              <span
                className={cn(
                  'text-blue-600',
                  consumerShell && 'text-[#015AFD]',
                )}
              >
                ${subscriptionPrice}
              </span>
              <span
                className={cn(
                  'text-gray-600 font-normal text-xl',
                  consumerShell && 'text-slate-500',
                )}
              >
                /Monthly
              </span>
            </div>
            <div>
              {statusText && (
                <div
                  className='inline-flex items-center gap-2 px-8 py-1 rounded-full text-sm font-medium mb-2'
                  style={{ color: statusColor, background: statusBg }}
                >
                  {statusText}
                </div>
              )}

              <div
                className={cn(
                  'rounded-full bg-gray-100 px-3 py-1',
                  consumerShell && 'bg-slate-100',
                )}
              >
                <span
                  className={cn(
                    'text-[18px] font-semibold text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                >
                  {connectedAccountsCount}
                </span>
                <span
                  className={cn(
                    'text-[16px] text-gray-600',
                    consumerShell && 'text-slate-600',
                  )}
                >
                  {' '}
                  Connected ads account(s)
                </span>
              </div>
            </div>
          </div>
          <div className={cn('text-gray-700', consumerShell && 'text-slate-600')}>
            $59/mo for the first ads account and $19 for each additional one.{' '}
            Update or add your payment method{' '}
            <Link
              href={billingHref}
              className={cn(
                'text-blue-600 hover:underline',
                consumerShell && 'font-medium text-[#015AFD] hover:text-[#0146ca]',
              )}
            >
              here
            </Link>
            .
          </div>
        </div>

        {/* Included Features */}
        <div className='mb-6'>
          <h3
            className={cn(
              'mb-4 text-lg font-semibold',
              consumerShell && 'text-slate-900',
            )}
          >
            Included Features
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-3'>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Unlimited ad alerts
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Negative trends detection
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Budget pacing monitoring
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Policy Monitoring
                </span>
              </div>
            </div>
            <div className='space-y-3'>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Over 250 daily KPI audits
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Sudden drop detection
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Spend forecasting
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <Check
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-blue-600',
                    consumerShell && 'text-[#015AFD]',
                  )}
                />
                <span
                  className={cn(
                    'text-gray-700',
                    consumerShell && 'text-slate-700',
                  )}
                >
                  Landing page uptime monitoring
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Cancellation */}
      <div
        className={cn(
          'ml-4 flex items-center gap-3 text-[14px] text-gray-700',
          consumerShell && 'ml-0 text-slate-900',
        )}
      >
        <AlertTriangle className='h-4 w-4 text-[#df5967] flex-shrink-0' />
        <span>
          I would like to{' '}
          <button
            className='text-[#df5967] hover:underline font-medium cursor-pointer'
            onClick={() => setShowDeleteModal(true)}
          >
            cancel
          </button>{' '}
          my adAlert.io account. All data will be deleted and all user will lose
          access!
        </span>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
          <div
            className={cn(
              'mx-4 w-full max-w-md rounded-lg bg-white p-6',
              consumerShell && 'rounded-2xl border border-slate-200 shadow-lg',
            )}
          >
            {/* Header */}
            <div className='flex items-center justify-end'>
              <button
                onClick={() => setShowDeleteModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <XIcon className='w-5 h-5' />
              </button>
            </div>

            {/* Content */}
            <div className='mb-6'>
              <h3 className='text-lg font-bold mb-2'>
                Are you sure you want to{' '}
                <span className='text-red-600'>DELETE</span> your adAlert.io
                account?
              </h3>
              <p className='text-gray-700'>
                All users will lose their data and access instantly!
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3'>
              <Button
                variant='outline'
                className='flex-1 border-gray-300 text-gray-700 hover:bg-gray-50'
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                className={cn('flex-1', consumerShell && 'rounded-xl')}
                onClick={async () => {
                  try {
                    await handleDeleteCompanyAccount();
                  } catch (error: any) {
                    console.error('Error deleting account:', error);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Deleting...
                  </>
                ) : (
                  'DELETE'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
