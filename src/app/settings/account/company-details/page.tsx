'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { countries } from 'countries-list';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  User,
  Building,
  MapPin,
  Globe,
  FileText,
  Phone,
  Clock,
  Mail,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import react-select to avoid SSR issues
const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className='h-10 bg-gray-100 rounded animate-pulse' />,
});

interface CompanyDetailsSubtabProps {
  consumerShell?: boolean;
}

export default function CompanyDetailsSubtab({
  consumerShell = false,
}: CompanyDetailsSubtabProps) {
  const billingHref = consumerShell
    ? '/consumer/settings/account/billing'
    : '/settings/account/billing';
  const inputIconAccent = consumerShell ? 'text-[#015AFD]' : 'text-[#155dfc]';

  const { stripeCompany, fetchStripeCompany, updateStripeCompany, loading } =
    useAlertSettingsStore();
  const { userDoc } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    vat: '',
    telephone: '',
    telephoneCountryCode: '',
    timezone: '',
    email: '',
  });

  // Transform countries data for react-select
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: country.name,
      dialCode: country.phone,
      flag: '🌍', // Using a default flag since emoji property might not exist
    }));
  }, []);

  // Get selected country option
  const selectedCountry = useMemo(() => {
    return (
      countryOptions.find((option) => option.label === formData.country) || null
    );
  }, [countryOptions, formData.country]);

  

  useEffect(() => {
    if (userDoc?.uid) {
      fetchStripeCompany(userDoc.uid);
    }
  }, [userDoc?.uid, fetchStripeCompany]);

  useEffect(() => {
    if (stripeCompany) {
      // Handle telephone country code - ensure it's a string
      const countryCode = stripeCompany['Telephone Country Code'];
      const countryCodeString = Array.isArray(countryCode)
        ? countryCode[0]
        : countryCode;

      setFormData({
        companyName: stripeCompany['Company Name'] || '',
        address: stripeCompany['Street Address'] || '',
        city: stripeCompany['City'] || '',
        state: stripeCompany['State'] || '',
        zipCode: stripeCompany['Zip'] || '',
        country: stripeCompany['Country'] || '',
        website: stripeCompany['Website'] || '',
        vat: stripeCompany['VAT']?.toString() || '',
        telephone: stripeCompany['Telephone'] || '',
        telephoneCountryCode: countryCodeString?.toString() || '',
        timezone: stripeCompany['Time Zone'] || '',
        email: stripeCompany['Email'] || '',
      });
    }
  }, [stripeCompany]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCountryChange = (selectedOption: any) => {
    setFormData((prev) => ({
      ...prev,
      country: selectedOption?.label || '',
    }));
  };

  

  const handlePhoneNumberChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      telephone: value,
    }));
  };

  const handleSave = async () => {
    if (!userDoc?.uid) return;
    setIsSaving(true);
    try {
      const updates = {
        'Company Name': formData.companyName,
        'Street Address': formData.address,
        City: formData.city,
        State: formData.state,
        Zip: formData.zipCode,
        Country: formData.country,
        Website: formData.website,
        VAT: formData.vat ? parseFloat(formData.vat) : null,
        Telephone: formData.telephone,
        'Telephone Country Code': formData.telephoneCountryCode,
        'Time Zone': formData.timezone,
        Email: formData.email,
      };

      await updateStripeCompany(userDoc.uid, updates);
    } catch (error) {
      console.error('Error saving company details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white p-4',
        consumerShell &&
          'mx-auto w-full min-w-0 max-w-[1480px] rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6',
      )}
    >
      <h2
        className={cn(
          'mb-2 text-xl font-bold',
          consumerShell && 'tracking-tight text-slate-900',
        )}
      >
        Company Details
      </h2>
      <p
        className={cn(
          'mb-6 text-gray-600',
          consumerShell && 'text-[15px] text-slate-500',
        )}
      >
        Update your company information to show in future invoices. You can
        review your invoices from{' '}
        <Link
          href={billingHref}
          className={cn(
            'text-blue-600 hover:underline',
            consumerShell &&
              'font-medium text-[#015AFD] hover:text-[#0146ca]',
          )}
        >
          billing
        </Link>
        .
      </p>

      {/* Company Name - Full Width */}
      <div className='mb-6'>
        <div className='relative'>
          <Input
            placeholder='Company Name'
            className='pl-10'
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
          />
          <User
            className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Left Column */}
        <div className='space-y-4'>
          {/* Address */}
          <div className='relative'>
            <Input
              placeholder='Address'
              className='pl-10'
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
            <Building
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* State */}
          <div className='relative'>
            <Input
              placeholder='State/Province'
              className='pl-10'
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
            />
            <MapPin
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* Country */}
          <div className='relative'>
            <div className='absolute left-3 top-2.5 z-10'>
              <Globe className={cn('h-5 w-5', inputIconAccent)} />
            </div>
            {isClient ? (
              <Select
                placeholder='Select Country'
                options={countryOptions}
                value={selectedCountry}
                onChange={handleCountryChange}
                isSearchable
                className='react-select-container'
                classNamePrefix='react-select'
                styles={{
                  control: (provided) => ({
                    ...provided,
                    paddingLeft: '2.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    minHeight: '2.5rem',
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

          {/* Website */}
          <div className='relative'>
            <Input
              placeholder='Website'
              className='pl-10'
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
            />
            <Globe
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* VAT */}
          <div className='relative'>
            <Input
              placeholder='VAT'
              className='pl-10'
              type='number'
              step='0.01'
              value={formData.vat}
              onChange={(e) => handleInputChange('vat', e.target.value)}
            />
            <FileText
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className='space-y-4'>
          {/* City */}
          <div className='relative'>
            <Input
              placeholder='City'
              className='pl-10'
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
            />
            <Building
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* Zip Code */}
          <div className='relative'>
            <Input
              placeholder='Zip/Postal Code'
              className='pl-10'
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
            />
            <MapPin
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* Telephone */}
          <div className='relative'>
            <Input
              placeholder='Phone Number'
              className='pl-10'
              type='number'
              step='1'
              min='0'
              value={formData.telephone}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
            />
            <Phone
              className={cn('absolute left-3 top-2.5 h-4 w-4', inputIconAccent)}
            />
          </div>

          {/* Timezone */}
          <div className='relative'>
            <Input
              placeholder='Timezone'
              className='pl-10'
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
            />
            <Clock
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>

          {/* Email */}
          <div className='relative'>
            <Input
              placeholder='Email'
              className='pl-10'
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
            <Mail
              className={cn('absolute left-3 top-2.5 h-5 w-5', inputIconAccent)}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className='mt-8 flex justify-center'>
        <Button
          className={cn(
            'min-w-[180px] rounded px-8 py-3 text-sm font-normal text-white shadow-md',
            consumerShell
              ? 'rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]'
              : 'bg-blue-600',
          )}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}
