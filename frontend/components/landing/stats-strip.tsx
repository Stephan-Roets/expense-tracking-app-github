const stats = [
  { value: "SARS-ready", label: "Logbook exports formatted for tax season" },
  { value: "10+", label: "Expense categories tracked automatically" },
  { value: "Photo-verified", label: "Time-stamped odometer audit trail" },
  { value: "Unlimited", label: "Vehicles and drivers on every plan" },
]

export function StatsStrip() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-8 text-center sm:px-6">
            <div className="text-xl font-semibold text-foreground sm:text-2xl">{stat.value}</div>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
