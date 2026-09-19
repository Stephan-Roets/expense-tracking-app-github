import Image from "next/image"
import { ArrowRight, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* subtle top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-primary/10 blur-3xl"
      />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Proudly South African · SARS-compliant logbook &amp; audit trail
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Don&apos;t spend your December holidays doing your tax
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Capture your trips and vehicle expenses for SARS as you go, all year round — so
            when the tax year closes on 28 February, your logbook is already sorted. No
            shoebox of fuel slips, no paying someone to piece it together. It&apos;s quick
            enough to knock out from the couch, in your own time.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="h-12 w-full px-6 text-base sm:w-auto">
              <Link href="/register">
                Start tracking free
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full px-6 text-base sm:w-auto">
              <Link href="#audiences">See how it fits you</Link>
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex text-warning" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
            No credit card required · Free to get started
          </div>
        </div>

        {/* dashboard preview */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/10">
            <Image
              src="/hero-dashboard.png"
              alt="Vehicle Expense dashboard showing monthly expense charts, fuel consumption, expense categories and trip records in South African Rand"
              width={1600}
              height={1000}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
