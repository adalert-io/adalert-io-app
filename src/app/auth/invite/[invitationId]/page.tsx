"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { createUserDocuments, useAuthStore } from "@/lib/store/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  EnvelopeClosedIcon,
  LockClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Reviews from "@/components/reviews/Reviews";

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
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = use(params);
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
          doc(db, "invitations", invitationId),
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
          // If the invitation is already accepted, avoid showing a scary error.
          // Instead, redirect based on whether the user is logged in.
          const currentUser = auth.currentUser;
          const authStore = useAuthStore.getState();

          if (currentUser) {
            // Ensure auth store is hydrated so post-auth navigation works
            authStore.setUser(currentUser);
            authStore.setRouter(router);

            try {
              await authStore.checkSubscriptionStatus(currentUser.uid);
              await authStore.handlePostAuthNavigation();
            } catch (error) {
              console.error("Error during post-auth navigation from invite:", error);
              // Fallback: send them to dashboard
              router.replace("/dashboard");
            }
          } else {
            // Not logged in – just take them to the login page without an error toast
            router.replace("/auth");
          }

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
  }, [invitationId, router]);

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
        formData.password,
      );
      // 2. Create user documents (without contacts for now)
      await createUserDocuments(userCredential.user, false, false);

      // 3. Create contacts in external platforms using the new API
      let contactResult = { success: false, contactIds: {}, errors: [] };

      try {
        const response = await fetch("/api/contacts/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: userCredential.user,
            userName: formData.name,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          contactResult = result.result;
        }
      } catch (error) {
        console.warn("Failed to create contacts:", error);
      }

      // 4. Update user document to set Company Admin and contact IDs
      const updateData: any = {
        "Company Admin": invitation.companyAdmin,
        Name: formData.name,
        // Set role and access from invitation
        "User Type": invitation.userType || "User",
        "User Access":
          invitation.userType === "Admin"
            ? "All ad accounts"
            : "Selected ad accounts",
        // Track inviter for post-auth navigation logic
        Inviter: invitation.invitedBy || null,
      };

      // Add contact IDs if they were created successfully
      if (contactResult.success) {
        Object.assign(updateData, contactResult.contactIds);
      }

      // Log any contact creation errors
      if (contactResult.errors.length > 0) {
        console.warn("Contact creation errors:", contactResult.errors);
      }

      await updateDoc(doc(db, "users", userCredential.user.uid), updateData);
      // 4. Update invitation status
      await updateDoc(doc(db, "invitations", invitationId), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
        acceptedBy: userCredential.user.uid,
      });
      // 5. Set up ads accounts access
      if (invitation.selectedAds && invitation.selectedAds.length > 0) {
        const userRef = doc(db, "users", userCredential.user.uid);

        // Loop through selected ads accounts and add user to their Selected Users
        for (const adsAccountId of invitation.selectedAds) {
          try {
            const adsAccountRef = doc(db, "adsAccounts", adsAccountId);
            const adsAccountDoc = await getDoc(adsAccountRef);

            if (adsAccountDoc.exists()) {
              const currentSelectedUsers =
                adsAccountDoc.data()["Selected Users"] || [];
              const userAlreadySelected = currentSelectedUsers.some(
                (user: any) =>
                  user.id === userCredential.user.uid ||
                  user.path?.includes(userCredential.user.uid),
              );

              if (!userAlreadySelected) {
                await updateDoc(adsAccountRef, {
                  "Selected Users": [...currentSelectedUsers, userRef],
                });
              }
            }
          } catch (error) {
            console.error(`Error updating ads account ${adsAccountId}:`, error);
            // Continue with other ads accounts even if one fails
          }
        }
      }
      // 6. Log the user in
      await signInWithEmailAndPassword(
        auth,
        invitation.email,
        formData.password,
      );

      // 7. Set up auth store
      const authStore = useAuthStore.getState();
      authStore.setUser(userCredential.user);
      authStore.setRouter(router);

      // Kick off subscription status check in the background (no need to block navigation)
      authStore
        .checkSubscriptionStatus(userCredential.user.uid)
        .catch((err: any) =>
          console.error("Error checking subscription status after invite:", err),
        );

      // Decide initial destination based on invited ad accounts:
      // - 0 or 1 account -> dashboard
      // - >1 accounts   -> summary
      const adsCount =
        Array.isArray(invitation.selectedAds) && invitation.selectedAds.length
          ? invitation.selectedAds.length
          : 0;
      const targetPath = adsCount > 1 ? "/summary" : "/dashboard";

      toast.success("Account activated! Welcome to the team!");
      router.replace(targetPath);
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
      <div className="w-full h-screen flex items-center justify-center">
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
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-2 mobile-uses">
      {/* Left Panel - Invite Form */}
      <div className="flex items-center justify-center p-5">
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center flex-1">
          <Card className="w-full bg-white shadow-none border-none rounded-none p-0">
            <CardHeader>
              <Link href="https://adalert.io/" className="flex items-center justify-center gap-2 min-w-0 py-2">
                <h1 className="flex items-center justify-center gap-2 text-[25px] font-bold mb-4">
                  <Image
                    src="/images/adalert-logo.avif"
                    alt="logo"
                    width={40}
                    height={40}
                  />
                  <span className="text-[#223b53]">adAlert.io</span>
                </h1>
              </Link>
              <CardTitle className="font-bold text-center text-[24px]">
                Accept Invitation
              </CardTitle>
              <CardDescription className="text-center">
                Complete your account setup to join the team
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col justify-center">
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleActivate();
                }}
              >
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <PersonIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      className={`pl-10 ${errors?.name ? "border-red-500" : ""}`}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  {errors?.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email Field (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <EnvelopeClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type="email"
                      value={invitation.email}
                      className="pl-10 bg-gray-50 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This email was used for your invitation
                  </p>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type="password"
                      placeholder="Create a password"
                      className={`pl-10 ${errors?.password ? "border-red-500" : ""}`}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      autoComplete="off"
                    />
                  </div>
                  {errors?.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}

                  {/* Password requirements and strength bar */}
                  {formData.password.length > 0 && (
                    <>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          {formData.password.length >= 8 ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          8 characters minimum
                        </div>
                        <div className="flex items-center gap-2">
                          {/[A-Z]/.test(formData.password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One uppercase letter
                        </div>
                        <div className="flex items-center gap-2">
                          {/[0-9]/.test(formData.password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One number
                        </div>
                        <div className="flex items-center gap-2">
                          {/[^A-Za-z0-9]/.test(formData.password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One Special Character{" "}
                          <span className="ml-1 text-xs text-gray-500">
                            @ $ ! % * ? &
                          </span>
                        </div>
                      </div>
                      {/* Password strength bar */}
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-gray-600">
                          Strength
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-2 w-8 rounded-full ${
                                strength >= i ? "bg-blue-600" : "bg-gray-200"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-xs text-gray-500">
                            {strengthLabels[strength]}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <CardDescription>
                  By accepting this invitation, you agree to the{" "}
                  <a
                    href="https://www.adalert.io/terms-conditions#terms-and-conditions"
                    className="text-blue-600 hover:underline"
                  >
                    Terms and Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.adalert.io/terms-conditions#privacy-policy"
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </CardDescription>

                <Button
                  type="submit"
                  disabled={accepting || !formData.name.trim() || !formData.password}
                  className={`w-full mt-2 py-6 text-base font-semibold transition-colors duration-200 ${
                    formData.name.trim() && formData.password
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    "Activate Account"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Reviews */}
      <Reviews />
    </div>
  );
}
