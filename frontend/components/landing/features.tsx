import { BookOpen, Camera, Receipt, BarChart3, ShieldCheck, Car } from "lucide-react"

const features = [
  {
    icon: BookOpen,
    title: "SARS-compliant digital logbook",
    description:
      "Record trips with dates, distances and purpose. Business and private travel stay separated and export-ready for your tax return.",
  },
  {
    icon: Camera,
    title: "Odometer verification",
    description:
      "Capture time-stamped opening and closing odometer photos each tax year, creating a verifiable audit trail SARS can trust.",
  },
  {
    icon: Receipt,
    title: "Expense & fuel tracking",
    description:
      "Log fuel, maintenance, tyres, tolls, services and more across 10+ categories. Snap the slip and it's captured against the right vehicle.",
  },
  {
    icon: BarChart3,
    title: "Insightful dashboards",
    description:
      "Monthly expense trends, fuel consumption and cost-per-category charts show exactly where your money goes — per vehicle or fleet-wide.",
  },
  {
    icon: Car,
    title: "Vehicle management",
    description:
      "Keep every vehicle's details, readings and history in one place, whether you drive one car or manage a full fleet.",
  },
  {
    icon: ShieldCheck,
    title: "Tax readiness audit",
    description:
      "A live checklist flags missing readings or gaps before filing season, so you reach year end already compliant.",
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Everything in one place</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            The full picture of your vehicle costs
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            From the first fuel slip to your year-end export, Vehicle Expense keeps your
            records tidy, accurate and ready for SARS.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
