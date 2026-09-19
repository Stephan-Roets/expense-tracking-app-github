import { Sun, Clock, WalletMinimal, CheckCircle2 } from "lucide-react"

const painPoints = [
  {
    icon: Sun,
    title: "Reclaim your holidays",
    description:
      "December is for the beach and the braai, not digging through a year of fuel slips. Keep records as you drive and there's nothing left to catch up on.",
  },
  {
    icon: WalletMinimal,
    title: "Stop paying someone else",
    description:
      "A tidy, SARS-ready logbook means you don't need to pay an accountant to reconstruct your travel. Export it and claim what's yours.",
  },
  {
    icon: Clock,
    title: "Two minutes, anywhere",
    description:
      "Log a trip or snap an odometer photo from your phone in seconds — waiting for the kettle, between meetings, or wherever you happen to be. That's genuinely all it takes.",
  },
]

export function December() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Do it concurrently, all year round
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t let your December become more work
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            The South African tax year closes on 28 February. Capture every kilometre and
            every rand as you go, and there&apos;s nothing left to catch up on over the
            holidays — your logbook is ready long before the deadline.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {painPoints.map((point) => {
            const Icon = point.icon
            return (
              <div
                key={point.title}
                className="rounded-xl border border-border bg-background p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4 text-center">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-sm font-medium text-pretty">
            Log as you go through the year — arrive at tax season with nothing left to do.
          </p>
        </div>
      </div>
    </section>
  )
}
