'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { countries } from 'countries-list'
import { useAlertSettingsStore } from '@/lib/store/settings-store'
import { useAuthStore } from '@/lib/store/auth-store'
import {
  User,
  Building,
  MapPin,
  Globe,
  FileText,
  Phone,
  Clock,
  Mail,
  Loader2
} from 'lucide-react'

// Dynamically import react-select to avoid SSR issues
const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className='h-10 bg-gray-100 rounded animate-pulse' />
})

export default function CompanyDetailsSubtab () {
  const { stripeCompany, fetchStripeCompany, updateStripeCompany, loading } =
    useAlertSettingsStore()
  const { userDoc } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])
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
    email: ''
  })

  // Transform countries data for react-select
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: country.name,
      dialCode: country.phone,
      flag: '🌍' // Using a default flag since emoji property might not exist
    }))
  }, [])

  // Get selected country option
  const selectedCountry = useMemo(() => {
    return (
      countryOptions.find(option => option.label === formData.country) || null
    )
  }, [countryOptions, formData.country])

  // Get dial code options for telephone
  const dialCodeOptions = useMemo(() => {
    return countryOptions.map(option => ({
      value: option.dialCode,
      label: `+${option.dialCode} ${option.label}`,
      displayLabel: `+${option.dialCode}`,
      flag: option.flag
    }))
  }, [countryOptions])

  // Get selected dial code option
  const selectedDialCode = useMemo(() => {
    if (!formData.telephoneCountryCode) return null
    // Handle both string and array values for backward compatibility
    const currentCode = Array.isArray(formData.telephoneCountryCode)
      ? formData.telephoneCountryCode[0]
      : formData.telephoneCountryCode
    const found =
      dialCodeOptions.find(
        option => option.value.toString() === currentCode.toString()
      ) || null
    console.log('Selected dial code:', found, 'for value:', currentCode)
    return found
  }, [dialCodeOptions, formData.telephoneCountryCode])

  useEffect(() => {
    if (userDoc?.uid) {
      fetchStripeCompany(userDoc.uid)
    }
  }, [userDoc?.uid, fetchStripeCompany])

  useEffect(() => {
    if (stripeCompany) {
      // Handle telephone country code - ensure it's a string
      const countryCode = stripeCompany['Telephone Country Code']
      const countryCodeString = Array.isArray(countryCode)
        ? countryCode[0]
        : countryCode

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
        email: stripeCompany['Email'] || ''
      })
    }
  }, [stripeCompany])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCountryChange = (selectedOption: any) => {
    setFormData(prev => ({
      ...prev,
      country: selectedOption?.label || ''
    }))
  }

  const handleDialCodeChange = (selectedOption: any) => {
    console.log('Dial code selected:', selectedOption)
    // Ensure we store just the dial code as a string, not an array
    const dialCode = selectedOption?.value
    const dialCodeString = Array.isArray(dialCode) ? dialCode[0] : dialCode
    setFormData(prev => ({
      ...prev,
      telephoneCountryCode: dialCodeString?.toString() || ''
    }))
  }

  const handlePhoneNumberChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      telephone: value
    }))
  }

  const handleSave = async () => {
    if (!userDoc?.uid) return
    setIsSaving(true)
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
        Email: formData.email
      }

      await updateStripeCompany(userDoc.uid, updates)
    } catch (error) {
      console.error('Error saving company details:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='bg-white  p-4'>
      <h2 className='text-xl font-bold mb-2'>Company Details</h2>
      <p className='text-gray-600 mb-6'>
        Update your company information to show in future invoices. You can
        review your invoices from{' '}
        <Link
          href='/settings/account/billing'
          className='text-blue-600 hover:underline'
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
            onChange={e => handleInputChange('companyName', e.target.value)}
          />
          <User className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
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
              onChange={e => handleInputChange('address', e.target.value)}
            />
            <Building className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* State */}
          <div className='relative'>
            <Input
              placeholder='State/Province'
              className='pl-10'
              value={formData.state}
              onChange={e => handleInputChange('state', e.target.value)}
            />
            <MapPin className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* Country */}
          <div className='relative'>
            <div className='absolute left-3 top-2.5 z-10'>
              <Globe className='w-5 h-5 text-[#155dfc]' />
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
                  control: provided => ({
                    ...provided,
                    paddingLeft: '2.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    minHeight: '2.5rem',
                    '&:hover': {
                      borderColor: '#3b82f6'
                    }
                  }),
                  placeholder: provided => ({
                    ...provided,
                    color: '#9ca3af'
                  })
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
              onChange={e => handleInputChange('website', e.target.value)}
            />
            <Globe className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* VAT */}
          <div className='relative'>
            <Input
              placeholder='VAT'
              className='pl-10'
              type='number'
              step='0.01'
              value={formData.vat}
              onChange={e => handleInputChange('vat', e.target.value)}
            />
            <FileText className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
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
              onChange={e => handleInputChange('city', e.target.value)}
            />
            <Building className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* Zip Code */}
          <div className='relative'>
            <Input
              placeholder='Zip/Postal Code'
              className='pl-10'
              value={formData.zipCode}
              onChange={e => handleInputChange('zipCode', e.target.value)}
            />
            <MapPin className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* Telephone */}
          <div className='flex gap-2'>
            {/* Dial Code Dropdown */}
            <div className='w-32'>
              {isClient ? (
                <Select
                  key={`dial-code-${formData.telephoneCountryCode}`}
                  placeholder='+1'
                  options={dialCodeOptions}
                  value={
                    selectedDialCode
                      ? {
                          ...selectedDialCode,
                          label: selectedDialCode.displayLabel
                        }
                      : null
                  }
                  onChange={handleDialCodeChange}
                  isSearchable
                  className='react-select-container'
                  classNamePrefix='react-select'
                  styles={{
                    control: provided => ({
                      ...provided,
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      minHeight: '2.5rem',
                      '&:hover': {
                        borderColor: '#3b82f6'
                      }
                    }),
                    placeholder: provided => ({
                      ...provided,
                      color: '#9ca3af'
                    })
                  }}
                />
              ) : (
                <div className='h-10 bg-gray-100 rounded animate-pulse' />
              )}
            </div>
            {/* Phone Number Input */}
            <div className='flex-1 relative'>
              <Input
                placeholder='Phone Number'
                type='number'
                step='1'
                min='0'
                value={formData.telephone}
                onChange={e => handlePhoneNumberChange(e.target.value)}
              />
              <Phone className='absolute right-3 top-2.5 w-4 h-4 text-[#155dfc]' />
            </div>
          </div>

          {/* Timezone */}
          <div className='relative'>
            <Input
              placeholder='Timezone'
              className='pl-10'
              value={formData.timezone}
              onChange={e => handleInputChange('timezone', e.target.value)}
            />
            <Clock className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>

          {/* Email */}
          <div className='relative'>
            <Input
              placeholder='Email'
              className='pl-10'
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
            />
            <Mail className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className='mt-8 flex justify-center'>
        <Button
          className='bg-blue-600 text-white hover:bg-blue-700'
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
  )
}
