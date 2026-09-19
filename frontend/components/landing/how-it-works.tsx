const steps = [
  {
    step: "01",
    title: "Add your vehicles",
    description:
      "Set up each vehicle and snap its opening odometer photo. Fleets invite drivers and assign roles in a few taps.",
  },
  {
    step: "02",
    title: "Log trips & expenses",
    description:
      "Record business trips and capture fuel, maintenance and other slips as you go. It all files against the right vehicle automatically.",
  },
  {
    step: "03",
    title: "Export at tax time",
    description:
      "Review your tax-readiness audit, then export a SARS-ready logbook and expense report for yourself or the whole fleet.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Compliant in three simple steps
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="rounded-xl border border-border bg-card p-6">
              <span className="font-mono text-sm font-semibold text-primary">{step.step}</span>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
