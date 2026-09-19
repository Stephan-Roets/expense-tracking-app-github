"use client"

import { useState } from "react"
import { User, Users, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

type TabKey = "individuals" | "fleet"

const tabs = {
  individuals: {
    icon: User,
    label: "For individuals",
    heading: "Claim every deductible kilometre with confidence",
    description:
      "Freelancers, sole proprietors and anyone with a travel allowance. Log business trips in seconds and hand SARS a clean, defensible logbook.",
    points: [
      "Digital logbook that separates business and private travel",
      "Snap fuel and maintenance slips — no more shoebox of receipts",
      "Opening and closing odometer photos captured for each tax year",
      "One-tap export of a SARS-formatted logbook and expense report",
      "See exactly what you can claim before you file",
    ],
    cta: "Start my logbook",
  },
  fleet: {
    icon: Users,
    label: "For fleet businesses",
    heading: "Give every driver a logbook, keep every record in one place",
    description:
      "Invite your team, assign roles and watch expenses roll up across the whole fleet. Admins and managers get oversight; drivers get a simple app.",
    points: [
      "Invite drivers and managers with role-based access",
      "Every vehicle and driver tracked under one organization",
      "Fleet-wide expense breakdowns, fuel consumption and cost trends",
      "Odometer verification and audit trail for the entire fleet",
      "Company-wide, SARS-ready exports at year end",
    ],
    cta: "Set up my fleet",
  },
} satisfies Record<TabKey, unknown> as Record<
  TabKey,
  {
    icon: typeof User
    label: string
    heading: string
    description: string
    points: string[]
    cta: string
  }
>

export function Audiences() {
  const [active, setActive] = useState<TabKey>("individuals")
  const data = tabs[active]

  return (
    <section id="audiences" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">Built for both</p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          One app, whether it&apos;s just you or a whole fleet
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          The way you track a vehicle is different from the way you run ten. Pick your
          mode to see what Vehicle Expense does for you.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(Object.keys(tabs) as TabKey[]).map((key) => {
            const Icon = tabs[key].icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  active === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={active === key}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tabs[key].label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-10 grid items-center gap-10 rounded-2xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h3 className="text-balance text-2xl font-semibold tracking-tight">{data.heading}</h3>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            {data.description}
          </p>
          <Button asChild className="mt-6 h-11 px-5">
            <Link href="/register">
              {data.cta}
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <ul className="grid gap-3">
          {data.points.map((point) => (
            <li key={point} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm leading-relaxed text-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
