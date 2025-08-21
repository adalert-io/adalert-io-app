"use client";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, Phone, Camera, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";
import { CHECKBOX_CLASS } from "@/lib/constants";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import Link from "next/link";

export default function MyProfileTab() {
  const { userDoc } = useAuthStore();
  const isGoogleSignUp = userDoc?.["Is Google Sign Up"] === true;
  const [name, setName] = useState(userDoc?.Name || "");
  const [email, setEmail] = useState(userDoc?.Email || "");
  const [phone, setPhone] = useState(userDoc?.Telephone || "");
  const [telephoneDialCode, setTelephoneDialCode] = useState("+1");
  const [optInForTextMessage, setOptInForTextMessage] = useState(userDoc?.["Opt In For Text Message"] ?? true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userDoc?.Avatar || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateMyProfile } = useAlertSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Clean up object URL when component unmounts or avatarPreview changes
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview !== userDoc?.Avatar) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreview]);

  // Update state if userDoc changes
  useEffect(() => {
    setName(userDoc?.Name || "");
    setEmail(userDoc?.Email || "");
    setPhone(userDoc?.Telephone || "");
    setOptInForTextMessage(userDoc?.["Opt In For Text Message"] ?? true);
    setAvatarPreview(userDoc?.Avatar || null);
  }, [userDoc]);

  // Handler to trigger file input
  const handleAvatarClick = () => {
    if (!isGoogleSignUp && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handler for file change (implement upload logic as needed)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview && avatarPreview !== userDoc?.Avatar) {
        URL.revokeObjectURL(avatarPreview);
      }
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarFile(file);
    }
  };

  // Save handler (stub)
  const handleSave = async () => {
    if (!userDoc?.uid) {
      toast.error("User not found");
      return;
    }
    setIsSaving(true);
    try {
      await updateMyProfile(userDoc.uid, {
        Name: name,
        Email: email,
        optInForTextMessage: optInForTextMessage,
        Telephone: phone,
        TelephoneDialCode: telephoneDialCode,
        avatarFile: avatarFile,
        currentAvatarUrl: userDoc?.Avatar || null,
      });
      setAvatarFile(null);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const avatarUrl = avatarPreview || userDoc?.Avatar || "/images/default-avatar.png";
  const isSaveEnabled = (
    name.trim() !== "" &&
    email.trim() !== "" &&
    ((phone.trim() !== "" && optInForTextMessage) || (phone.trim() === "" && !optInForTextMessage))
  );

  return (
    <div className="flex flex-col items-center w-full min-h-[80vh]">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-1">My Profile</h2>
          <p className="text-gray-500 mb-6">
            View or edit your profile. You can include or exclude yourself from email alerts or control the frequency from {" "}
            <Link href="/settings/settings/alerts" className="text-blue-600 underline">alert settings</Link>
          </p>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center flex-1 bg-white rounded-xl border border-gray-100 p-8">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <div className="w-full h-full border rounded-full overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={avatarUrl}
                    alt={name || "User avatar"}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.png";
                    }}
                  />
                </div>
                {/* Camera icon button */}
                <button
                  type="button"
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 bg-gray-200 hover:bg-gray-300 border-4 border-white rounded-full w-12 h-12 flex items-center justify-center shadow-md z-50"
                  aria-label="Change avatar"
                  style={{ zIndex: 50 }}
                  onClick={handleAvatarClick}
                  disabled={isGoogleSignUp}
                >
                  <Camera className="w-6 h-6 text-[#155dfc]" />
                </button>
                {/* Hidden file input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isGoogleSignUp}
                />
              </div>
              <div className="text-xl font-bold text-center">{name}</div>
            </div>
            {/* Personal Info Form */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 p-8">
              <div className="text-lg font-semibold mb-6">Personal information</div>
              <form className="flex flex-col gap-4">
                <div className="relative">
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Name"
                    className="pl-10"
                    disabled={isGoogleSignUp}
                  />
                  <User className="absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]" />
                </div>
                <div className="relative">
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email"
                    className="pl-10"
                    type="email"
                    disabled={isGoogleSignUp}
                  />
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]" />
                </div>
                <div className="relative flex items-center">
                  {/* Country selector (static for now) */}
                  <select
                    value={telephoneDialCode}
                    onChange={e => setTelephoneDialCode(e.target.value)}
                    className="h-10 rounded-l-md border border-gray-200 bg-gray-50 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    disabled
                  >
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-l-none"
                    type="tel"
                  />
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <Checkbox
                    id="sms-consent"
                    checked={optInForTextMessage}
                    onCheckedChange={checked => setOptInForTextMessage(checked === true)}
                    className={CHECKBOX_CLASS}
                  />
                  <label htmlFor="sms-consent" className="text-xs text-gray-600 select-none">
                    I consent to opting in for text messages. Message and data rate changes may apply. Change in your alert settings to opt out. This feature is only available in the US.
                  </label>
                </div>
              </form>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            <Button className="w-full max-w-[150px] flex justify-center bg-blue-600 text-white text-lg font-bold py-3 rounded shadow-md " onClick={handleSave} disabled={!isSaveEnabled || isSaving}>
              {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 