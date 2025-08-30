'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { countries } from 'countries-list';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { stripePromise, stripeConfig } from '@/lib/stripe/config';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  ArrowLeft,
  User,
  MapPin,
  Building,
  Target,
  X,
  Loader2,
  Download,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import moment from 'moment';
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_PRICES,
} from '@/lib/constants';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Dynamically import react-select to avoid SSR issues
const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className='h-10 bg-gray-100 rounded animate-pulse' />,
});

// Payment Form Component
function PaymentForm({ onBack }: { onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { userDoc } = useAuthStore();
  const { adsAccounts, paymentMethods, subscription } = useAlertSettingsStore();
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [formData, setFormData] = useState({
    nameOnCard: '',
    streetAddress: '',
    city: '',
    state: '',
    country: 'US',
    zip: '',
  });

  // Prefill form fields if paymentMethods is available
  useEffect(() => {
    if (paymentMethods) {
      setFormData({
        nameOnCard: paymentMethods['Stripe Name'] || '',
        streetAddress: paymentMethods['Stripe Address'] || '',
        city: paymentMethods['Stripe City'] || '',
        state: paymentMethods['Stripe State'] || '',
        country: paymentMethods['Stripe Country'] || 'US',
        zip: paymentMethods['Zip'] || '',
      });
    }
  }, [paymentMethods]);
  const cards = [
    { name: 'Visa', src: '/cards/Visa.png' },
    { name: 'Mastercard', src: '/cards/Mastercard.png' },
    { name: 'Amex', src: '/cards/Amex.png' },
    { name: 'Discover', src: '/cards/Discover.png' },
  ];
  // Transform countries data for react-select
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: `${code} - ${country.name}`,
      flag: '🌍',
    }));
  }, []);

  // Get selected country option
  const selectedCountry = useMemo(() => {
    return (
      countryOptions.find((option) => option.value === formData.country) || null
    );
  }, [countryOptions, formData.country]);

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      isCardComplete &&
      formData.nameOnCard.trim() !== '' &&
      formData.streetAddress.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.state.trim() !== '' &&
      formData.zip.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    if (!stripe || !elements || !userDoc?.['Company Admin']) {
      toast.error(
        'Stripe is not initialized. Please check your configuration.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await useAlertSettingsStore.getState().handleSubscriptionPayment({
        formData,
        stripe,
        elements,
        toast,
        onBack,
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(
        error.message || 'An error occurred while saving payment method',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show fallback if Stripe is not available
  if (!stripe) {
    return (
      <div className='bg-white rounded-2xl shadow-md p-8'>
        {/* Back Button */}
        <button
          className='flex items-center gap-2 text-blue-600 mb-6'
          onClick={onBack}
        >
          <ArrowLeft className='w-5 h-5' />
          <span className='font-medium'>Back to Billing</span>
        </button>

        <div className='text-center py-12'>
          <CreditCard className='w-16 h-16 text-gray-400 mx-auto mb-4' />
          <h3 className='text-xl font-bold text-gray-900 mb-2'>
            Payment Processing Unavailable
          </h3>
          <p className='text-gray-600 mb-4'>
            Stripe payment processing is not configured. Please contact your
            administrator to set up payment processing.
          </p>
          <p className='text-sm text-gray-500'>
            Error: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set
          </p>
        </div>
      </div>
    );
  }
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
  } else if (
    status === SUBSCRIPTION_STATUS.CANCELED ||
    status === SUBSCRIPTION_STATUS.PAYMENT_FAILED
  ) {
    statusText = 'Subscription Canceled';
    statusColor = '#ee1b23';
    statusBg = '#ffebee';
  }
}

  return (
    <div className='bg-white p-8'>
      {/* Back Button */}
      <button
        className='flex items-center gap-2 text-blue-600 mb-6'
        onClick={onBack}
      >
        <ArrowLeft className='w-5 h-5' />
        <span className='font-medium'>Back to Billing</span>
      </button>

      {/* Subscription Summary */}
      <div className='flex items-start justify-between gap-4 mb-4 sm:flex-row flex-col items-center'>
        <div className='text-3xl font-bold'>
          <span className='text-blue-600'>${subscriptionPrice}</span>
          <span className='text-gray-600 font-normal text-xl'>/Monthly</span>
        </div>
        <div className='flex flex-col items-start'>
          {statusText && (
            <div
              className='flex justify-center gap-2 px-8 py-1 rounded-full text-sm font-medium mb-2'
              style={{ color: statusColor, background: statusBg }}
            >
              {statusText}
            </div>
          )}

          <div className='bg-gray-100 px-3 py-1 rounded-full'>
            <span className='text-blue-600 font-semibold'>
              {connectedAccountsCount}
            </span>
            <span className='text-gray-600'> Connected ads account(s)</span>
          </div>
        </div>
      </div>

      {/* Payment Method Form */}
      <div>
        <h3 className='text-xl font-bold text-gray-900 mb-2'>Payment Method</h3>
        <p className='text-gray-600 mb-6'>
          Enter your payment information below
        </p>

        {/* Accepted Cards */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='text-sm hidden text-gray-600 sm:block'>
            Accepted cards:{' '}
          </div>
          <div className='flex gap-2'>
            <div className='flex gap-[2px] items-center'>
              {cards.map((card) => (
                <img
                  key={card.name}
                  src={card.src}
                  alt={card.name}
                  className='w-[50px] h-auto object-contain'
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className='space-y-4'>
          {/* Card Details */}
          <div>
            <div className='mt-1 border border-gray-300 rounded-md p-3'>
              <CardElement
                options={stripeConfig.cardElementOptions}
                onChange={(event) => {
                  setIsCardComplete(event.complete);
                }}
              />
            </div>
          </div>

          {/* Name on Card */}
          <div>
            <div className='relative mt-1'>
              <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4' />
              <Input
                id='nameOnCard'
                type='text'
                placeholder='Name on card'
                value={formData.nameOnCard}
                onChange={(e) =>
                  handleInputChange('nameOnCard', e.target.value)
                }
                className='pl-10'
              />
            </div>
          </div>

          {/* Street Address */}
          <div>
            <div className='relative mt-1'>
              <MapPin className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4' />
              <Input
                id='streetAddress'
                type='text'
                placeholder='Street address'
                value={formData.streetAddress}
                onChange={(e) =>
                  handleInputChange('streetAddress', e.target.value)
                }
                className='pl-10'
              />
            </div>
          </div>

          {/* City and State Row */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <div className='relative mt-1'>
                <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4' />
                <Input
                  id='city'
                  type='text'
                  placeholder='City'
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            <div>
              <div className='relative mt-1'>
                <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4' />
                <Input
                  id='state'
                  type='text'
                  placeholder='State'
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
          </div>

          {/* Country and Zip Row */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <div className='relative mt-1'>
                <MapPin className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4 z-10' />
                {isClient ? (
                  <Select
                    placeholder='Select Country'
                    options={countryOptions}
                    value={selectedCountry}
                    onChange={(selectedOption: any) => {
                      setFormData((prev) => ({
                        ...prev,
                        country: selectedOption?.value || 'US',
                      }));
                    }}
                    isSearchable
                    className='react-select-container'
                    classNamePrefix='react-select'
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        paddingLeft: '2.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        '&:hover': {
                          borderColor: '#3b82f6',
                        },
                      }),
                      placeholder: (provided) => ({
                        ...provided,
                        color: '#9ca3af',
                      }),
                    }}
                  />
                ) : (
                  <div className='h-10 bg-gray-100 rounded animate-pulse pl-10' />
                )}
              </div>
            </div>
            <div>
              <div className='relative mt-1'>
                <Target className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#155dfc] w-4 h-4' />
                <Input
                  id='zip'
                  type='text'
                  placeholder='10001'
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className='mt-8 flex justify-center'>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !stripe || !isFormValid()}
            className='px-8 py-3 bg-blue-600 text-white text-sm font-normal rounded shadow-md min-w-[180px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Saving...
              </>
            ) : (
              'Save Payment Method'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Billing Component
export default function BillingSubtab() {
  const { user, userDoc, fetchUserDocument } = useAuthStore();
  const {
    subscription,
    fetchSubscription,
    paymentMethods,
    fetchPaymentMethod,
    fetchPaymentMethodByUser,
    adsAccounts,
    fetchAdsAccounts,
  } = useAlertSettingsStore();
  const [screen, setScreen] = useState<'list' | 'payment-form'>('list');

  // Read search params on client side after mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const showPaymentForm = searchParams.get('show') === 'payment-form';
    if (showPaymentForm) {
      setScreen('payment-form');
    }
  }, []);
  // Refetch userDoc on mount to ensure latest user type
  useEffect(() => {
    if (user?.uid) {
      fetchUserDocument(user.uid);
    }
  }, [user?.uid, fetchUserDocument]);
  useEffect(() => {
    if (userDoc?.['Company Admin']) {
      fetchSubscription(userDoc['Company Admin']);
      fetchPaymentMethod(userDoc['Company Admin']);
      fetchAdsAccounts(userDoc['Company Admin']);
      // Fetch payment method by user reference
      let userId = '';
      if (
        userDoc['Company Admin'] &&
        typeof userDoc['Company Admin'] === 'object' &&
        userDoc['Company Admin'].id
      ) {
        userId = userDoc['Company Admin'].id;
      } else if (typeof userDoc['Company Admin'] === 'string') {
        const match = userDoc['Company Admin'].match(/\/users\/(.+)/);
        userId = match && match[1] ? match[1] : userDoc['Company Admin'];
      }
      const userRef = doc(db, 'users', userId);
      fetchPaymentMethodByUser(userRef);
    }
  }, [
    userDoc?.['Company Admin'],
    fetchSubscription,
    fetchPaymentMethod,
    fetchAdsAccounts,
    fetchPaymentMethodByUser,
  ]);

  // --- Invoice fetching logic ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  useEffect(() => {
    const fetchInvoices = async () => {
      if (
        subscription &&
        subscription['Stripe Customer Id'] &&
        typeof subscription['Stripe Customer Id'] === 'string' &&
        subscription['Stripe Customer Id'].trim() !== ''
      ) {
        setInvoicesLoading(true);
        try {
          const res = await fetch(
            `/api/stripe-invoices?customerId=${subscription['Stripe Customer Id']}`,
          );
          const data = await res.json();
          if (res.ok && data.invoices) {
            setInvoices(data.invoices);
          } else {
            setInvoices([]);
          }
        } catch (err) {
          setInvoices([]);
        } finally {
          setInvoicesLoading(false);
        }
      } else {
        setInvoices([]);
      }
    };
    fetchInvoices();
  }, [subscription]);
  // --- End invoice fetching logic ---

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(invoices.length / pageSize);

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

  // Subscription status badge logic
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
  } else if (
    status === SUBSCRIPTION_STATUS.CANCELED ||
    status === SUBSCRIPTION_STATUS.PAYMENT_FAILED
  ) {
    statusText = 'Subscription Canceled';
    statusColor = '#ee1b23';
    statusBg = '#ffebee';
  }
}


  if (userDoc && userDoc['User Type'] !== 'Admin') {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <span className='text-lg text-gray-600 font-semibold'>
          Contact your admin
        </span>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className='space-y-8'>
        {screen === 'list' && (
          <>
            {/* Billing Section */}
            <div className='bg-white p-4'>
              <h2 className='text-xl font-bold mb-2'>Billing</h2>
              <p className='text-gray-600 mb-6'>
                Update payment method and view your invoices. You can review
                your subscription details{' '}
                <Link
                  href='/settings/account/subscriptions'
                  className='text-blue-600 hover:underline'
                >
                  here
                </Link>
                .
              </p>

              {/* Payment Method Section */}
              <div className='mb-8'>
                <h3 className='text-lg font-semibold mb-4'>Payment Method</h3>
                <div className='flex flex-col items-start gap-6 sm:flex-row '>
                  {/* Payment Method Card */}
                  {paymentMethods ? (
                    <div className='bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 min-w-[320px]'>
                      <div className='flex justify-between items-start mb-4'>
                        <div>
                          <div className='text-sm opacity-80 mb-1'>
                            {paymentMethods['Stripe Card Brand'] || 'Card'}
                          </div>
                          <div className='text-lg font-bold'>
                            {paymentMethods[
                              'Stripe Card Brand'
                            ]?.toUpperCase() || 'CARD'}
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-sm opacity-80 mb-1'>
                            {paymentMethods['Stripe Expired Month'] &&
                            paymentMethods['Stripe Expired Year']
                              ? ''
                              : 'Test'}
                          </div>
                          <div className='text-sm'>
                            {String(
                              paymentMethods['Stripe Expired Month'],
                            ).padStart(2, '0')}{' '}
                            / {paymentMethods['Stripe Expired Year']}
                          </div>
                        </div>
                      </div>
                      <div className='text-lg font-mono'>
                        XXXX - XXXX - XXXX -{' '}
                        {paymentMethods['Stripe Last 4 Digits']}
                      </div>
                      <div className='mt-4 text-sm'>
                        <div>Name: {paymentMethods['Stripe Name']}</div>
                        <div>
                          Address: {paymentMethods['Stripe Address']},{' '}
                          {paymentMethods['Stripe City']},{' '}
                          {paymentMethods['Stripe State']}{' '}
                          {paymentMethods['Zip']},{' '}
                          {paymentMethods['Stripe Country']}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='bg-gray-100 text-gray-600 rounded-lg p-6 w-full   flex items-center justify-center sm:w-[320px]'>
                      <div className='text-center'>
                        <CreditCard className='w-8 h-8 mx-auto mb-2 text-gray-400' />
                        <p className='text-sm'>No payment method</p>
                      </div>
                    </div>
                  )}

                  {/* Status and Actions */}
                  <div className='flex flex-col items-start'>
                    {statusText && (
                      <div
                        className='flex justify-center gap-2 px-8 py-1 rounded-full text-sm font-medium'
                        style={{ color: statusColor, background: statusBg }}
                      >
                        {statusText}
                      </div>
                    )}
                    <Button
                      className='px-8 py-3 bg-blue-600 text-white text-sm font-normal rounded shadow-md min-w-[180px] mt-6'
                      onClick={() => setScreen('payment-form')}
                    >
                      {paymentMethods
                        ? 'Update payment method'
                        : 'Add payment method'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice History Section */}
            <div className='bg-white rounded-2xl  p-4'>
              <h2 className='text-xl font-bold mb-6'>Invoice History</h2>

              {invoicesLoading ? (
                <div className='text-center py-12'>
                  <Loader2 className='w-6 h-6 mx-auto animate-spin mb-2' />
                  <p className='text-gray-500 text-lg'>Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className='text-center py-12'>
                  <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-500 text-lg'>No invoices</p>
                </div>
              ) : (
                <>
                  {/* Invoice Table */}
                  <div className='overflow-x-auto'>
                    <table className='min-w-full'>
                      <thead>
                        <tr className='border-b border-gray-200'>
                          <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                            Date Issued
                          </th>
                          <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                            Invoice No.
                          </th>
                          <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                            Payment Method
                          </th>
                          <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                            Status
                          </th>
                          <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                            Download
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice, index) => (
                          <tr
                            key={index}
                            className='border-b border-gray-100 hover:bg-gray-50'
                          >
                            <td className='py-3 px-4'>
                              {invoice.created
                                ? new Date(
                                    invoice.created * 1000,
                                  ).toLocaleDateString()
                                : ''}
                            </td>
                            <td className='py-3 px-4'>
                              {invoice.number || invoice.id}
                            </td>
                            <td className='py-3 px-4'>{'Card'}</td>
                            <td className='py-3 px-4'>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  invoice.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : invoice.status === 'open' ||
                                      invoice.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {invoice.status
                                  ? invoice.status.charAt(0).toUpperCase() +
                                    invoice.status.slice(1)
                                  : 'Unknown'}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              {invoice.invoice_pdf ||
                              invoice.hosted_invoice_url ? (
                                <a
                                  href={
                                    invoice.invoice_pdf ||
                                    invoice.hosted_invoice_url
                                  }
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  download
                                  aria-label='Download Invoice'
                                  className='inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 transition-colors'
                                >
                                  <Download className='w-5 h-5 text-blue-600' />
                                </a>
                              ) : (
                                <span
                                  className='text-gray-400'
                                  title='No invoice file available'
                                >
                                  <Download className='w-5 h-5' />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className='flex items-center justify-between mt-6'>
                    <div className='flex items-center gap-2 text-sm text-gray-600'>
                      <span>Go to page:</span>
                      <select
                        className='border rounded px-2 py-1'
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                      >
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <option key={page} value={page}>
                            {page}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-sm text-gray-600'>
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className='flex gap-1'>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronsLeft className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronsRight className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {screen === 'payment-form' && (
          <PaymentForm onBack={() => setScreen('list')} />
        )}
      </div>
    </Elements>
  );
}
