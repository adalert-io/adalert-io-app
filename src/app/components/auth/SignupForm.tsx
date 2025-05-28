"use client";

import { useState } from "react";
import Image from "next/image";
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
import { CheckCircle } from "lucide-react";

const signupFormSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: SignupFormValues) {
    // Handle signup logic here
    console.log(data);
  }

  return (
    <div className="flex min-h-[600px] h-full">
      {/* Left Panel - Signup Form */}
      <div className="w-1/2 flex flex-col h-full justify-center">
        <Header />
        <div className="flex-1 p-8 flex flex-col justify-center h-full">
          <Card className="w-full h-full flex flex-col justify-center">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                Create your account
              </CardTitle>
              <CardDescription>
                Join AdAlert to start monitoring your ads and get real-time
                alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
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
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <PersonIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Enter your full name"
                              className="pl-10"
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
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <EnvelopeClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10"
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <Input
                              type="password"
                              placeholder="Create a password"
                              className="pl-10"
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
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    onClick={onSwitchToLogin}
                    className="px-0 font-normal"
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
      <div className="w-1/2 h-full hidden lg:block relative">
        <div className="absolute inset-0 w-full h-full bg-[url('/images/adAlert-sign-up-right.jpeg')] bg-cover bg-center" />
        <div className="absolute inset-0 flex flex-col gap-8 justify-center items-center px-8">
          {/* Feature Box 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-start gap-4 w-[340px]">
            <CheckCircle className="text-yellow-400 w-8 h-8 flex-shrink-0 mt-1" />
            <div className="text-gray-800 font-medium">
              Negative trends detection with dozens of daily audit points
            </div>
          </div>
          {/* Feature Box 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-start gap-4 w-[340px]">
            <CheckCircle className="text-yellow-400 w-8 h-8 flex-shrink-0 mt-1" />
            <div className="text-gray-800 font-medium">
              Policy violation monitoring and budget pacing alerts
            </div>
          </div>
          {/* Feature Box 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-start gap-4 w-[340px]">
            <CheckCircle className="text-yellow-400 w-8 h-8 flex-shrink-0 mt-1" />
            <div className="text-gray-800 font-medium">
              Sudden KPI drops detection, landing page uptime and ad serving
              alerts
            </div>
          </div>
          {/* Feature Box 4 */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-start gap-4 w-[340px]">
            <CheckCircle className="text-yellow-400 w-8 h-8 flex-shrink-0 mt-1" />
            <div className="text-gray-800 font-medium">
              Tap into industry leading PPC ad review strategies
            </div>
          </div>
          {/* Feature Box 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-start gap-4 w-[340px]">
            <CheckCircle className="text-yellow-400 w-8 h-8 flex-shrink-0 mt-1" />
            <div className="text-gray-800 font-medium">
              Zero management time with only 30 seconds sign up process
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
