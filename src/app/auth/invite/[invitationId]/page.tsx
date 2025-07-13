"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { createUserDocuments } from "@/lib/store/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export default function AcceptInvitation({
  params,
}: {
  params: { invitationId: string };
}) {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
  });
  const [errors, setErrors] = useState<{
    name?: string;
    password?: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const invitationDoc = await getDoc(
          doc(db, "invitations", params.invitationId)
        );
        if (!invitationDoc.exists()) {
          toast.error("Invalid invitation link");
          router.push("/auth");
          return;
        }
        const data = invitationDoc.data();
        if (new Date() > data.expiresAt.toDate()) {
          toast.error("Invitation has expired");
          router.push("/auth");
          return;
        }
        if (data.status === "accepted") {
          toast.error("Invitation has already been accepted");
          router.push("/auth");
          return;
        }
        setInvitation(data);
        setFormData((f) => ({ ...f, name: data.name || "" }));
      } catch (error) {
        toast.error("Failed to load invitation");
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [params.invitationId, router]);

  const validateForm = () => {
    const errs: { name?: string; password?: string } = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (formData.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!formData.password) errs.password = "Password is required";
    if (formData.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleActivate = async () => {
    if (!validateForm() || !invitation) return;
    try {
      setAccepting(true);
      // 1. Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invitation.email,
        formData.password
      );
      // 2. Create user documents
      await createUserDocuments(userCredential.user, false, false);
      // 3. Update invitation status
      await updateDoc(doc(db, "invitations", params.invitationId), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
        acceptedBy: userCredential.user.uid,
      });
      // 4. Set up ads accounts access
      if (invitation.selectedAds && invitation.selectedAds.length > 0) {
        const { useAlertSettingsStore } = await import(
          "@/lib/store/settings-store"
        );
        await useAlertSettingsStore
          .getState()
          .updateAdsAccountsSelectedUsers(
            userCredential.user.uid,
            invitation.userType,
            invitation.selectedAds
          );
      }
      // 5. Log the user in
      await signInWithEmailAndPassword(
        auth,
        invitation.email,
        formData.password
      );
      toast.success("Account activated! Welcome to the team!");
      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists");
      } else {
        toast.error("Failed to activate account. Please try again.");
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }
  if (!invitation) return null;

  // Password strength UI
  const strength = getPasswordStrength(formData.password);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md flex flex-col items-center">
        <img
          src="/images/adalert-logo.avif"
          alt="adAlert.io"
          className="h-8 mb-6"
        />
        <h1 className="text-2xl font-bold mb-2">Activate Account</h1>
        <form
          className="w-full flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleActivate();
          }}
        >
          <div>
            <label className="block text-sm mb-1">Name</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="#A0AEC0"
                    strokeWidth="2"
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"
                  />
                </svg>
              </span>
              <Input
                className={`pl-10 ${errors?.name ? "border-red-500" : ""}`}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Your name"
                autoFocus
              />
            </div>
            {errors?.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="#A0AEC0"
                    strokeWidth="2"
                    d="M12 17a5 5 0 0 0 5-5V7a5 5 0 0 0-10 0v5a5 5 0 0 0 5 5Zm0 0v2m-6 2h12"
                  />
                </svg>
              </span>
              <Input
                className={`pl-10 pr-10 ${
                  errors?.password ? "border-red-500" : ""
                }`}
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Create a password"
              />
              {/* Optionally add show/hide password toggle here */}
            </div>
            {errors?.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Strength</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full ${
                      strength >= i ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-2">
                {strengthLabels[strength]}
              </span>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full mt-4 bg-[#7B7B93] text-white text-lg font-bold py-3 rounded shadow-md"
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...
              </>
            ) : (
              "Activate"
            )}
          </Button>
        </form>
      </div>
      <div className="fixed bottom-2 w-full text-center text-xs text-gray-400">
        The page is higher than your real design as the debugger is visible and
        displays a white area.
        <br />
        It will be back to normal when the debugger is off.
      </div>
    </div>
  );
}
