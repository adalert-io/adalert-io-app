"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({
	email: z.string().email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
	const router = useRouter();
	const { sendPasswordReset, loading, setRouter } = useAuthStore();

	useEffect(() => {
		setRouter(router);
	}, [router, setRouter]);

	const form = useForm<ForgotValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: "" },
		mode: "onChange",
	});

	async function onSubmit(values: ForgotValues) {
		try {
			await sendPasswordReset(values.email);
			toast.success("Password reset email sent. Please check your inbox.");
			router.push("/auth?mode=login");
		} catch (error: any) {
			toast.error(error?.message ?? "Failed to send reset email");
		}
	}

	const isFormValid = form.formState.isValid;

	return (
		<div className="w-full h-screen grid grid-cols-1 lg:grid-cols-2">
			{/* Left: form */}
			<div className="flex items-center justify-center p-5">
				<div className="w-full max-w-md p-5 mx-auto flex flex-col items-center justify-center flex-1">
					<Card className="w-full bg-white shadow-none border-none rounded-none p-0">
						<CardContent className="p-8 text-center">
							<h1 className="text-3xl font-bold mb-4">
								<span className="text-blue-600">adAlert.io</span>
							</h1>
							<h2 className="text-3xl font-bold mb-2">Forgot Password</h2>
							<p className="text-gray-500 mb-6 text-sm">
								Enter your email and we'll send you a link to reset your password.
							</p>

							<Form {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input type="email" placeholder="Enter your email" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<Button
										type="submit"
										className={`w-full mt-2 py-6 text-base font-semibold transition-colors duration-200 ${
											isFormValid ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-400 text-white cursor-not-allowed"
										}`}
										disabled={!isFormValid || loading}
									>
										{loading ? "Sending..." : "Send reset link"}
									</Button>
								</form>
							</Form>

							<div className="mt-6 text-center">
								<Button
									variant="link"
									className="px-0 font-normal text-blue-600 cursor-pointer hover:no-underline focus:no-underline"
									onClick={() => router.push("/auth?mode=login")}
								>
									Back to login
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Right: shares the same visuals as login and is hidden < lg */}
			<div className="hidden lg:flex relative items-center justify-center bg-white overflow-hidden shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)]">
				<div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] gap-0 overflow-hidden">
					{Array.from({ length: 200 }, (_, i) => (
						<div
							key={i}
							className="border border-blue-200/30 hover:border-blue-400/60 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer min-h-[120px] min-w-[120px]"
						/>
					))}
				</div>

				<div className="relative flex flex-col gap-12 max-w-5xl mx-auto px-4 z-10">
					<div className="self-end bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200">
						<p className="text-gray-700 text-sm mb-4">
							"Reset your password securely. We will email you a link to set a new one."
						</p>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
								RS
							</div>
							<div>
								<p className="font-semibold text-gray-800 text-sm">Reset Support</p>
								<p className="text-xs text-gray-500">adAlert.io</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


