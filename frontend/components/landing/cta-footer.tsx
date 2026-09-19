import { ArrowRight, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CtaFooter() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-primary/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Give yourself a proper December off
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Whether you drive one car or run a fleet, start capturing your travel and
              expenses today so your SARS record is ready before the holidays. Free to get
              started, no credit card needed.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild className="h-12 w-full px-6 text-base sm:w-auto">
                <Link href="/register">
                  Create your free account
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 w-full px-6 text-base sm:w-auto">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">Vehicle Expense</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            SARS-compliant vehicle expense &amp; logbook management for South Africa.
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Vehicle Expense
          </p>
        </div>
      </footer>
    </>
  )
}
