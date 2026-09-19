"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/landing/site-header"
import { Hero } from "@/components/landing/hero"
import { StatsStrip } from "@/components/landing/stats-strip"
import { December } from "@/components/landing/december"
import { Audiences } from "@/components/landing/audiences"
import { Features } from "@/components/landing/features"
import { Compliance } from "@/components/landing/compliance"
import { HowItWorks } from "@/components/landing/how-it-works"
import { CtaFooter } from "@/components/landing/cta-footer"

/**
 * Root page — landing page for unauthenticated users, redirect for authenticated users.
 */
export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");

    if (token) {
      // Token exists → redirect to dashboard
      setIsAuthenticated(true);
      router.replace("/dashboard");
    } else {
      // No token → show landing page
      setIsLoading(false);
    }
  }, [router]);

  // Show loading state while checking auth
  if (isLoading) {
    return null;
  }

  // If authenticated, don't render landing page (redirect is happening)
  if (isAuthenticated) {
    return null;
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <StatsStrip />
        <December />
        <Audiences />
        <Features />
        <Compliance />
        <HowItWorks />
        <CtaFooter />
      </main>
    </div>
  );
}
