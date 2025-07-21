"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { useAuthStore } from "@/lib/store/auth-store";
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
} from "lucide-react";

export default function CompanyDetailsSubtab() {
  const { stripeCompany, fetchStripeCompany, updateStripeCompany, loading } = useAlertSettingsStore();
  const { userDoc } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    website: "",
    vat: "",
    telephone: "",
    timezone: "",
    email: ""
  });

  useEffect(() => {
    if (userDoc?.uid) {
      fetchStripeCompany(userDoc.uid);
    }
  }, [userDoc?.uid, fetchStripeCompany]);

  useEffect(() => {
    if (stripeCompany) {
      setFormData({
        companyName: stripeCompany["Company Name"] || "",
        address: stripeCompany["Street Address"] || "",
        city: stripeCompany["City"] || "",
        state: stripeCompany["State"] || "",
        zipCode: stripeCompany["Zip"] || "",
        country: stripeCompany["Country"] || "",
        website: stripeCompany["Website"] || "",
        vat: stripeCompany["VAT"]?.toString() || "",
        telephone: stripeCompany["Telephone"] || "",
        timezone: stripeCompany["Time Zone"] || "",
        email: stripeCompany["Email"] || ""
      });
    }
  }, [stripeCompany]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userDoc?.uid) return;
    setIsSaving(true);
    try {
      const updates = {
        "Company Name": formData.companyName,
        "Street Address": formData.address,
        "City": formData.city,
        "State": formData.state,
        "Zip": formData.zipCode,
        "Country": formData.country,
        "Website": formData.website,
        "VAT": formData.vat ? parseFloat(formData.vat) : null,
        "Telephone": formData.telephone,
        "Time Zone": formData.timezone,
        "Email": formData.email
      };
      
      await updateStripeCompany(userDoc.uid, updates);
    } catch (error) {
      console.error("Error saving company details:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      <h2 className="text-xl font-bold mb-2">Company Details</h2>
      <p className="text-gray-600 mb-6">
        Update your company information to show in future invoices. You can review your invoices from{" "}
        <Link href="/settings/account/billing" className="text-blue-600 hover:underline">
          billing
        </Link>
        .
      </p>

      {/* Company Name - Full Width */}
      <div className="mb-6">
        <div className="relative">
          <Input
            placeholder="Company Name"
            className="pl-10"
            value={formData.companyName}
            onChange={(e) => handleInputChange("companyName", e.target.value)}
          />
          <User className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">

          {/* Address */}
          <div className="relative">
            <Input
              placeholder="Address"
              className="pl-10"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
            />
            <Building className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* State */}
          <div className="relative">
            <Input
              placeholder="State/Province"
              className="pl-10"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
            />
            <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* Country */}
          <div className="relative">
            <Input
              placeholder="Country"
              className="pl-10 pr-10"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
            />
            <Globe className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
            <Globe className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>

          {/* Website */}
          <div className="relative">
            <Input
              placeholder="Website"
              className="pl-10"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
            />
            <Globe className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* VAT */}
          <div className="relative">
            <Input
              placeholder="VAT"
              className="pl-10"
              type="number"
              step="0.01"
              value={formData.vat}
              onChange={(e) => handleInputChange("vat", e.target.value)}
            />
            <FileText className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* City */}
          <div className="relative">
            <Input
              placeholder="City"
              className="pl-10"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
            />
            <Building className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* Zip Code */}
          <div className="relative">
            <Input
              placeholder="Zip/Postal Code"
              className="pl-10"
              value={formData.zipCode}
              onChange={(e) => handleInputChange("zipCode", e.target.value)}
            />
            <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* Telephone */}
          <div className="relative">
            <Input
              placeholder="Telephone"
              className="pl-10"
              value={formData.telephone}
              onChange={(e) => handleInputChange("telephone", e.target.value)}
            />
            <div className="absolute left-3 top-2.5 flex items-center gap-1">
              <span className="text-xs font-bold text-blue-600">US</span>
              <Phone className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          {/* Timezone */}
          <div className="relative">
            <Input
              placeholder="Timezone"
              className="pl-10"
              value={formData.timezone}
              onChange={(e) => handleInputChange("timezone", e.target.value)}
            />
            <Clock className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>

          {/* Email */}
          <div className="relative">
            <Input
              placeholder="Email"
              className="pl-10"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            <Mail className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8">
        <Button
          className="bg-blue-600 text-white text-lg font-bold px-12 py-3 rounded shadow-md hover:bg-blue-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
} 