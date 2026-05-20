'use client';

import * as React from 'react';
import { Calendar1Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import moment from 'moment';

import { useAuthStore } from '@/lib/store/auth-store';
import { SUBSCRIPTION_PERIODS, SUBSCRIPTION_STATUS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface FreeTrialBannerProps {
  upgradeHref: string;
  className?: string;
}

export function FreeTrialBanner({ upgradeHref, className }: FreeTrialBannerProps) {
  const router = useRouter();
  const { subscription } = useAuthStore();

  const trialDaysLeft = React.useMemo(() => {
    if (!subscription) return 0;
    const status = subscription['User Status'];
    if (
      status !== SUBSCRIPTION_STATUS.TRIAL_NEW &&
      status !== SUBSCRIPTION_STATUS.TRIAL_ENDED
    ) {
      return 0;
    }

    const trialStartDate = subscription['Free Trial Start Date']?.toDate?.();
    if (!trialStartDate) return 0;

    const trialEndDate = moment(trialStartDate).add(
      SUBSCRIPTION_PERIODS.TRIAL_DAYS,
      'days',
    );
    const now = moment();
    return Math.max(0, Math.ceil(trialEndDate.diff(now, 'days', true)));
  }, [subscription]);

  const isTrialUser =
    subscription &&
    (subscription['User Status'] === SUBSCRIPTION_STATUS.TRIAL_NEW ||
      subscription['User Status'] === SUBSCRIPTION_STATUS.TRIAL_ENDED);

  if (!isTrialUser) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full shrink-0 bg-[#FFEBEE] px-4 py-2 md:px-6 lg:px-8',
        className,
      )}
      role='status'
      aria-live='polite'
    >
      <div className='mx-auto flex max-w-[1480px] flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center'>
        <span className='text-[13px] text-gray-900'>
          <Calendar1Icon className='mb-1 mr-1 inline size-4' aria-hidden />
          {trialDaysLeft > 0 ? (
            <>You&apos;re on a free trial with </>
          ) : (
            <>Your free trial has ended. </>
          )}
        </span>
        {trialDaysLeft > 0 ? (
          <span className='text-[13px] font-bold text-gray-900'>
            {trialDaysLeft} days left.
          </span>
        ) : null}
        <span className='text-[13px] text-gray-900'>
          {' '}
          Upgrade for 24/7 monitoring and peace of mind!
        </span>
        <button
          type='button'
          onClick={() => router.push(upgradeHref)}
          className='ml-0 cursor-pointer rounded-[5px] border bg-[#da486b] px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-black sm:ml-3'
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
}
