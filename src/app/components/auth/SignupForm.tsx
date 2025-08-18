"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  EnvelopeClosedIcon,
  LockClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Header } from "@/components/layout/header";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Password strength helper
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const signupFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const {
    signUp,
    signInWithGoogle,
    loading,
    sendVerificationEmail,
    setRouter,
  } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [password, setPassword] = useState("");

  // Set router instance in auth store
  useEffect(() => {
    setRouter(router);
  }, [router, setRouter]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
    mode: "onChange", // ensure validation updates on change
  });

  const isFormValid = form.formState.isValid;

  async function onSubmit(data: SignupFormValues) {
    try {
      setIsLoading(true);
      await signUp(data.email, data.password, data.fullName);
      setShowVerificationMessage(true);
      toast.success(
        "Account created! Please check your email to verify your account."
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      toast.success("Signed in with Google successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    try {
      setIsLoading(true);
      await sendVerificationEmail();
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification email");
    } finally {
      setIsLoading(false);
    }
  }

  if (showVerificationMessage) {
    return (
      <div className="w-full h-screen grid grid-cols-1 md:grid-cols-2 mobile-uses">
        <div className="flex items-center justify-center">
   
          <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center flex-1">
            {/* Logo before verification message */}

           <Card className="w-full bg-white shadow-none border-none rounded-none p-5">
              <CardHeader className="px-0">
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
                <CardTitle className="text-[24px] text-center mb-6 font-bold">
                  Verify your email
                </CardTitle>
                <CardDescription>
                  We've sent a verification email to your inbox. Please check
                  your email and click the verification link to continue.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex-1 flex flex-col justify-center space-y-4">
                <p className="text-gray-600">
                  Didn't receive the email? Check your spam folder or click the
                  button below to resend.
                </p>
                <Button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 transition=colors duration-200"
                >
                  {isLoading ? "Sending..." : "Resend verification email"}
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already verified?{" "}
                    <Button
                      variant="link"
                      onClick={onSwitchToLogin}
                      className="px-0 font-normal text-blue-600"
                      disabled={isLoading}
                    >
                      Sign in
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Keep the right panel with feature boxes */}
         <div className="hidden lg:flex relative items-center justify-center bg-white overflow-hidden shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)]">
                       {/* Background Grid with Hover Effects */}
       <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] gap-0 overflow-hidden">
         {Array.from({ length: 200 }, (_, i) => (
           <div
             key={i}
             className="border border-blue-200/30 hover:border-blue-400/60 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer min-h-[120px] min-w-[120px]"
           />
         ))}
       </div>

  {/* Zig-Zag Cards */}
  <div className="relative flex flex-col gap-12 max-w-5xl mx-auto px-4 z-10">
    
    {/* Card 1 - Right */}
    <div className="self-end bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "adAlert.io has transformed how we monitor our ad campaigns. The real-time alerts and insights have saved us countless hours and improved our ROI significantly."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          SM
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Sarah Mitchell</p>
          <p className="text-xs text-gray-500">Marketing Director, TechFlow</p>
        </div>
      </div>
    </div>

    {/* Card 2 - Left */}
    <div className="self-start bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "The automated monitoring and instant notifications have been a game-changer. We catch issues before they become problems, and our team can focus on strategy instead of manual monitoring."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
          MJ
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Michael Johnson</p>
          <p className="text-xs text-gray-500">CEO, GrowthLabs</p>
        </div>
      </div>
    </div>

    {/* Card 3 - Right */}
    <div className="self-end bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "As a small business, we needed an affordable solution that could compete with enterprise tools. adAlert.io delivers exactly that - powerful features without the complexity."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold text-sm">
          AL
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Alex Rodriguez</p>
          <p className="text-xs text-gray-500">Founder, StartupXYZ</p>
        </div>
      </div>
    </div>

    {/* Card 4 - Left */}
    <div className="self-start bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "The dashboard is incredibly intuitive and the customer support is outstanding. We've been using adAlert.io for 6 months and it's become an essential part of our marketing stack."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
          EL
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Emma Lee</p>
          <p className="text-xs text-gray-500">Digital Marketing Manager, InnovateCorp</p>
        </div>
      </div>
    </div>

  </div>
</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-2 mobile-uses">
      {/* Left Panel - Signup Forms */}
      <div className="flex items-center justify-center p-5">
      
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center flex-1">
          {/* Logo before signup form */}
         
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
                Start your{" "}
                <span className="text-blue-600">FREE 7 day trial</span>
              </CardTitle>

              <CardDescription className="text-center">No credit card required</CardDescription>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col justify-center">
              <Button
                type="button"
                variant="secondary"
                className="w-full flex items-center justify-center bg-white gap-2 text-[15px] font-normal text-black  border border-gray-200 shadow-none"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <span className="mr-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M23.52 12.2728C23.52 11.4219 23.4436 10.6037 23.3018 9.81824H12V14.4601H18.4582C18.18 15.9601 17.3345 17.231 16.0636 18.0819V21.0928H19.9418C22.2109 19.0037 23.52 15.9273 23.52 12.2728Z"
                      fill="#4285F4"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 24C15.24 24 17.9564 22.9255 19.9418 21.0928L16.0636 18.0818C14.9891 18.8018 13.6145 19.2273 12 19.2273C8.87455 19.2273 6.22909 17.1164 5.28546 14.28H1.27637V17.3891C3.25091 21.3109 7.30909 24 12 24Z"
                      fill="#34A853"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.28545 14.2801C5.04545 13.5601 4.90909 12.791 4.90909 12.0001C4.90909 11.2091 5.04545 10.4401 5.28545 9.72005V6.61096H1.27636C0.463636 8.23096 0 10.0637 0 12.0001C0 13.9364 0.463636 15.7691 1.27636 17.3891L5.28545 14.2801Z"
                      fill="#FBBC05"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 4.77273C13.7618 4.77273 15.3436 5.37818 16.5873 6.56727L20.0291 3.12545C17.9509 1.18909 15.2345 0 12 0C7.30909 0 3.25091 2.68909 1.27637 6.61091L5.28546 9.72C6.22909 6.88364 8.87455 4.77273 12 4.77273Z"
                      fill="#EA4335"
                    />
                  </svg>
                </span>
                Sign up with Google
              </Button>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-4 text-gray-400 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <PersonIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                            <Input
                              type="text"
                              placeholder="Enter your full name"
                              className="pl-10"
                                autoComplete="off" // 🚀 This disables autofill
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <EnvelopeClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10"
                                autoComplete="off" // 🚀 This disables autofill

                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                            <Input
                              type="password"
                              placeholder="Create a password"
                              className="pl-10"
                                autoComplete="off" // 🚀 This disables autofill

                              {...field}
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                setPassword(e.target.value);
                              }}
                            />
                          </div>
                        </FormControl>
                        {/* Password requirements and strength bar only show if password is not empty */}
                        {password.length > 0 && (
                          <>
                            <div className="mt-2 space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                {password.length >= 8 ? (
                                  <CheckCircle className="text-blue-600 w-4 h-4" />
                                ) : (
                                  <XCircle className="text-gray-400 w-4 h-4" />
                                )}
                                8 characters minimum
                              </div>
                              <div className="flex items-center gap-2">
                                {/[A-Z]/.test(password) ? (
                                  <CheckCircle className="text-blue-600 w-4 h-4" />
                                ) : (
                                  <XCircle className="text-gray-400 w-4 h-4" />
                                )}
                                One uppercase letter
                              </div>
                              <div className="flex items-center gap-2">
                                {/[0-9]/.test(password) ? (
                                  <CheckCircle className="text-blue-600 w-4 h-4" />
                                ) : (
                                  <XCircle className="text-gray-400 w-4 h-4" />
                                )}
                                One number
                              </div>
                              <div className="flex items-center gap-2">
                                {/[^A-Za-z0-9]/.test(password) ? (
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
                                      getPasswordStrength(password) >= i
                                        ? "bg-blue-600"
                                        : "bg-gray-200"
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-xs text-gray-500">
                                  {["", "Weak", "Fair", "Good", "Strong"][
                                    getPasswordStrength(password)
                                  ]}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CardDescription>
                    By signing up, you agree to the{" "}
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
                    disabled={!isFormValid || isLoading}
                    className={`w-full mt-2 py-6 text-base font-semibold transition-colors duration-200 ${
                      isFormValid
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-400 text-white cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    onClick={onSwitchToLogin}
                    className="px-0 font-normal text-blue-600 hover:underline"
                    disabled={isLoading}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Background Image with Feature Boxes */}
        <div className="hidden lg:flex relative items-center justify-center bg-white overflow-hidden shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)]">
                       {/* Background Grid with Hover Effects */}
       <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] gap-0 overflow-hidden">
         {Array.from({ length: 200 }, (_, i) => (
           <div
             key={i}
             className="border border-blue-200/30 hover:border-blue-400/60 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer min-h-[120px] min-w-[120px]"
           />
         ))}
       </div>

  {/* Zig-Zag Cards */}
  <div className="relative flex flex-col gap-12 max-w-5xl mx-auto px-4 z-10">
    
    {/* Card 1 - Right */}
    <div className="self-end bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "adAlert.io has transformed how we monitor our ad campaigns. The real-time alerts and insights have saved us countless hours and improved our ROI significantly."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          SM
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Sarah Mitchell</p>
          <p className="text-xs text-gray-500">Marketing Director, TechFlow</p>
        </div>
      </div>
    </div>

    {/* Card 2 - Left */}
    <div className="self-start bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "The automated monitoring and instant notifications have been a game-changer. We catch issues before they become problems, and our team can focus on strategy instead of manual monitoring."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
          MJ
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Michael Johnson</p>
          <p className="text-xs text-gray-500">CEO, GrowthLabs</p>
        </div>
      </div>
    </div>

    {/* Card 3 - Right */}
    <div className="self-end bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "As a small business, we needed an affordable solution that could compete with enterprise tools. adAlert.io delivers exactly that - powerful features without the complexity."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold text-sm">
          AL
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Alex Rodriguez</p>
          <p className="text-xs text-gray-500">Founder, StartupXYZ</p>
        </div>
      </div>
    </div>

    {/* Card 4 - Left */}
    <div className="self-start bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
      <p className="text-gray-700 text-sm mb-4">
        "The dashboard is incredibly intuitive and the customer support is outstanding. We've been using adAlert.io for 6 months and it's become an essential part of our marketing stack."
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
          EL
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Emma Lee</p>
          <p className="text-xs text-gray-500">Digital Marketing Manager, InnovateCorp</p>
        </div>
      </div>
    </div>

  </div>
</div>
    </div>
  );
}
