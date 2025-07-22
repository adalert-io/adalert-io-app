"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import dynamic from "next/dynamic";
import { countries } from "countries-list";
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
  X
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import moment from "moment";
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_PERIODS, SUBSCRIPTION_PRICES } from "@/lib/constants";

// Dynamically import react-select to avoid SSR issues
const Select = dynamic(() => import("react-select"), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" />
});

export default function BillingSubtab() {
  const { user, userDoc, fetchUserDocument } = useAuthStore();
  const { subscription, fetchSubscription, paymentMethods, fetchPaymentMethods, adsAccounts, fetchAdsAccounts } = useAlertSettingsStore();
  const [isClient, setIsClient] = useState(false);
  // Refetch userDoc on mount to ensure latest user type
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (user?.uid) {
      fetchUserDocument(user.uid);
    }
  }, [user?.uid, fetchUserDocument]);
  useEffect(() => {
    if (userDoc?.["Company Admin"]) {
      fetchSubscription(userDoc["Company Admin"]);
      fetchPaymentMethods(userDoc["Company Admin"]);
      fetchAdsAccounts(userDoc["Company Admin"]);
    }
  }, [userDoc?.["Company Admin"], fetchSubscription, fetchPaymentMethods, fetchAdsAccounts]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    nameOnCard: "",
    streetAddress: "",
    city: "",
    state: "",
    country: "United States",
    zip: ""
  });

  // Transform countries data for react-select
  const countryOptions = useMemo(() => {
    return Object.entries(countries).map(([code, country]) => ({
      value: code,
      label: country.name,
      flag: "🌍" // Using a default flag since emoji property might not exist
    }));
  }, []);

  // Get selected country option
  const selectedCountry = useMemo(() => {
    return countryOptions.find(option => option.label === formData.country) || null;
  }, [countryOptions, formData.country]);

  // Mock data - replace with real data from Stripe
  const paymentMethod = {
    type: "visa",
    brand: "VISA",
    last4: "4242",
    expMonth: "08",
    expYear: "2025",
    isTest: true
  };

  interface Invoice {
    dateIssued: string;
    invoiceNo: string;
    paymentMethod: string;
    status: 'Paid' | 'Pending' | 'Failed';
  }

  const invoices: Invoice[] = []; // Empty for now - will be populated from Stripe

  const totalPages = Math.ceil(invoices.length / pageSize);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    // TODO: Implement Stripe payment method update
    console.log("Updating payment method:", formData);
    setShowPaymentModal(false);
  };

  // Subscription status badge logic
  let statusText = "";
  let statusColor = "";
  let statusBg = "";
  if (subscription) {
    const status = subscription["User Status"];
    const trialStart = subscription["Free Trial Start Date"]?.toDate ? subscription["Free Trial Start Date"].toDate() : null;
    const trialEnd = trialStart ? moment(trialStart).add(SUBSCRIPTION_PERIODS.TRIAL_DAYS, "days") : null;
    const now = moment();
    if (status === SUBSCRIPTION_STATUS.PAYING) {
      statusText = "Paid Plan Active";
      statusColor = "#24B04D";
      statusBg = "#e9ffef";
    } else if (status === SUBSCRIPTION_STATUS.TRIAL_NEW && trialEnd && now.isBefore(trialEnd)) {
      statusText = "Free Trial";
      statusColor = "#24B04D";
      statusBg = "#e9ffef";
    } else if (
      status === SUBSCRIPTION_STATUS.CANCELLED ||
      status === SUBSCRIPTION_STATUS.PAYMENT_FAILED
    ) {
      statusText = "Subscription Canceled";
      statusColor = "#ee1b23";
      statusBg = "#ffebee";
    } else if (
      (status === SUBSCRIPTION_STATUS.TRIAL_NEW || status === SUBSCRIPTION_STATUS.TRIAL_ENDED) &&
      trialEnd && now.isAfter(trialEnd)
    ) {
      statusText = "Free Trial Ended";
      statusColor = "#ee1b23";
      statusBg = "#ffebee";
    }
  }

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

  if (userDoc && userDoc["User Type"] !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-lg text-gray-600 font-semibold">Contact your admin</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing Section */}
      <div className="bg-white rounded-2xl shadow-md p-8">
        <h2 className="text-xl font-bold mb-2">Billing</h2>
        <p className="text-gray-600 mb-6">
          Update payment method and view your invoices. You can review your subscription details{" "}
          <Link href="/settings/account/subscriptions" className="text-blue-600 hover:underline">
            here
          </Link>
          .
        </p>

        {/* Payment Method Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
          <div className="flex items-start gap-6">
            {/* Payment Method Card */}
            {paymentMethods ? (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 min-w-[320px]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm opacity-80 mb-1">visa</div>
                    <div className="text-lg font-bold">VISA</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-80 mb-1">Test</div>
                    <div className="text-sm">{paymentMethod.expMonth} / {paymentMethod.expYear}</div>
                  </div>
                </div>
                <div className="text-lg font-mono">
                  XXXX - XXXX - XXXX - {paymentMethod.last4}
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 text-gray-600 rounded-lg p-6 min-w-[320px] flex items-center justify-center">
                <div className="text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No payment method</p>
                </div>
              </div>
            )}

            {/* Status and Actions */}
            <div className="flex flex-col gap-4">
              {statusText && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{ color: statusColor, background: statusBg }}
                >
                  {statusText}
                </div>
              )}
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowPaymentModal(true)}
              >
                {paymentMethods ? "Update payment method" : "Add payment method"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice History Section */}
      <div className="bg-white rounded-2xl shadow-md p-8">
        <h2 className="text-xl font-bold mb-6">Invoice History</h2>
        
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No invoices</p>
          </div>
        ) : (
          <>
            {/* Invoice Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date Issued</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Method</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{invoice.dateIssued}</td>
                      <td className="py-3 px-4">{invoice.invoiceNo}</td>
                      <td className="py-3 px-4">{invoice.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Go to page:</span>
                <select 
                  className="border rounded px-2 py-1"
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>{page}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Method Update Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPaymentModal(false);
                    }}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Billing</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Subscription Summary */}
              <div className="flex items-center justify-between mb-8">
                <div className="text-3xl font-bold text-blue-600">${subscriptionPrice}/Monthly</div>
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {connectedAccountsCount} Connected ads account(s)
                </div>
              </div>

              {/* Payment Method Form */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Method</h3>
                <p className="text-gray-600 mb-6">Enter your payment information below</p>

                {/* Accepted Cards */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-sm text-gray-600">Accepted cards:</div>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">MC</div>
                    <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">AMEX</div>
                    <div className="w-8 h-5 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
                    <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <Label htmlFor="cardNumber" className="text-sm font-medium text-gray-700">
                      Card number
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" className="bg-green-100 text-green-700 hover:bg-green-200">
                        Autofill link
                      </Button>
                    </div>
                  </div>

                  {/* Name on Card */}
                  <div>
                    <Label htmlFor="nameOnCard" className="text-sm font-medium text-gray-700">
                      Name on card
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="nameOnCard"
                        type="text"
                        placeholder="John Doe"
                        value={formData.nameOnCard}
                        onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <Label htmlFor="streetAddress" className="text-sm font-medium text-gray-700">
                      Street address
                    </Label>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="streetAddress"
                        type="text"
                        placeholder="123 Main St"
                        value={formData.streetAddress}
                        onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* City and State Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                        City
                      </Label>
                      <div className="relative mt-1">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="city"
                          type="text"
                          placeholder="New York"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                        State
                      </Label>
                      <div className="relative mt-1">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="state"
                          type="text"
                          placeholder="NY"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Country and Zip Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                        Country
                      </Label>
                      <div className="relative mt-1">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                        {isClient ? (
                          <Select
                            placeholder="Select Country"
                            options={countryOptions}
                            value={selectedCountry}
                            onChange={(selectedOption: any) => {
                              setFormData(prev => ({
                                ...prev,
                                country: selectedOption?.label || "United States"
                              }));
                            }}
                            isSearchable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                              control: (provided) => ({
                                ...provided,
                                paddingLeft: '2.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                minHeight: '2.5rem',
                                '&:hover': {
                                  borderColor: '#3b82f6'
                                }
                              }),
                              placeholder: (provided) => ({
                                ...provided,
                                color: '#9ca3af'
                              })
                            }}
                          />
                        ) : (
                          <div className="h-10 bg-gray-100 rounded animate-pulse pl-10" />
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zip" className="text-sm font-medium text-gray-700">
                        Zip
                      </Label>
                      <div className="relative mt-1">
                        <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="zip"
                          type="text"
                          placeholder="10001"
                          value={formData.zip}
                          onChange={(e) => handleInputChange('zip', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8">
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-gray-800 text-white hover:bg-gray-900 py-3 text-lg font-medium"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 