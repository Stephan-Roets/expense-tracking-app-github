"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Eye, EyeOff, AlertCircle, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/components/auth/auth-service";
import { persistAuthSession } from "@/lib/auth/normalize-auth-response";

export const dynamic = 'force-dynamic';

type AccountType = "individual" | "business";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    organizationType: "SOLE_PROPRIETOR",
  });
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      setStep(2);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        organizationName:
          accountType === "business"
            ? formData.organizationName
            : `${formData.firstName} ${formData.lastName}`,
        organizationMode: accountType === "business" ? "FLEET" : "SOLO",
      });

      // Do NOT persist auth session - user must verify email first
      // persistAuthSession(data);

      // Show verification message instead of redirecting
      setShowVerificationMessage(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vehicle Expense</h1>
          <p className="text-xs text-muted-foreground">SA Fleet Management</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {showVerificationMessage ? "Check Your Email" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {showVerificationMessage
              ? "We've sent you a confirmation email"
              : step === 1
              ? "Choose your account type"
              : "Enter your details to get started"}
          </CardDescription>
          {step === 2 && accountType === "individual" && !showVerificationMessage && (
            <p className="text-xs text-muted-foreground mt-2">
              After adding your vehicle, you can edit it anytime at <span className="font-mono">/dashboard/vehicles</span> to add optional details like VIN, insurance policy, or license expiry.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {showVerificationMessage ? (
            <div className="space-y-4 text-center">
              <div className="bg-primary/10 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  We've sent a confirmation email to <strong>{formData.email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to verify your account and get started.
                </p>
                <Alert className="mt-4 bg-orange-500/10 border-orange-500/30 dark:bg-orange-500/10 dark:border-orange-500/30">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-300">
                    <strong>Check your spam folder!</strong> If the confirmation button in the email doesn't work, please mark the email as "not spam" and try again. If it still doesn't work, copy and paste the verification URL from the email directly into your browser.
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground mt-4">
                  Please check your inbox and spam folder, then click the confirmation link to access your dashboard.
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {step === 1 ? (
            <div className="space-y-4">
              {/* Account Type Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("individual")}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                    "min-h-35",
                    accountType === "individual"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <span suppressHydrationWarning>
                    <User
                      className={cn(
                        "h-10 w-10 mb-3",
                        accountType === "individual"
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </span>
                  <span className="font-semibold">Individual</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Freelancer / Doctor
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                    "min-h-35",
                    accountType === "business"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <span suppressHydrationWarning>
                    <Building2
                      className={cn(
                        "h-10 w-10 mb-3",
                        accountType === "business"
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </span>
                  <span className="font-semibold">Business</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Fleet / Company
                  </span>
                </button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {accountType === "individual"
                  ? "Perfect for managing personal vehicle expenses and SARS logbook"
                  : "Full fleet management with team members and multiple vehicles"}
              </p>

              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-12 text-base font-semibold"
              >
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.co.za"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className="h-12"
                    required
                  />
                </div>

                {accountType === "business" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Business Name</Label>
                      <Input
                        id="organizationName"
                        name="organizationName"
                        autoComplete="organization"
                        placeholder="e.g., ABC Transport"
                        value={formData.organizationName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            organizationName: e.target.value,
                          })
                        }
                        className="h-12"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationType">Business Type</Label>
                      <Select
                        name="organizationType"
                        value={formData.organizationType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, organizationType: value })
                        }
                      >
                        <SelectTrigger id="organizationType" className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOLE_PROPRIETOR">
                            Sole Proprietor
                          </SelectItem>
                          <SelectItem value="PTY_LTD">
                            (Pty) Ltd Company
                          </SelectItem>
                          <SelectItem value="CC">Close Corporation</SelectItem>
                          <SelectItem value="PARTNERSHIP">
                            Partnership
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="h-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="h-12"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
            </form>
          )}
            </>
          )}

          {!showVerificationMessage && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground text-center">
        By creating an account, you agree to our Terms of Service
      </p>
    </div>
  );
}
