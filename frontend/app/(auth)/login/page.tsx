"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Truck, Eye, EyeOff, AlertCircle } from "lucide-react";
import { authService } from "@/components/auth/auth-service";
import { persistAuthSession } from "@/lib/auth/normalize-auth-response";

// ─── Routing logic ─────────────────────────────────────────────────────────────
// ADMIN or any FLEET org → fleet/admin dashboard
// MANAGER or DRIVER in SOLO org → personal dashboard
function resolveRedirect(
  role: string,
  mode: string,
): string {
  if (role === "ADMIN" || mode === "FLEET") {
    return "/dashboard"; // @TODO: replace with "/fleet-dashboard" once that route exists
  }
  return "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Clear any stale auth data on mount and check for session expired error
  useEffect(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('role');
    localStorage.removeItem('org_mode');
    localStorage.removeItem('user_profile');

    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  // ─── The only thing that matters ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Step 1: Use authService to call backend
      const auth = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      persistAuthSession(auth);

      // Route based on role / org mode from the API
      router.push(resolveRedirect(auth.user.role, auth.user.organizationMode));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to manage your vehicle expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <span suppressHydrationWarning>
                  <AlertCircle className="h-4 w-4" />
                </span>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.co.za"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-12"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-12 pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span suppressHydrationWarning>
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground text-center">
        SARS Compliant Logbook &bull; ZAR Currency &bull; SA Tax Year
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
