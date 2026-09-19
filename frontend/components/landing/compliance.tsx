import Image from "next/image"
import { Camera, Clock, FileCheck, Lock } from "lucide-react"

const points = [
  {
    icon: Camera,
    title: "Photo-verified readings",
    description: "Opening and closing odometer photos are captured, not typed — so the numbers hold up.",
  },
  {
    icon: Clock,
    title: "Time-stamped audit trail",
    description: "Every reading is logged against the correct SARS tax year with a date and time it can't fake.",
  },
  {
    icon: Lock,
    title: "Locked at year end",
    description: "Once a tax year closes, its records lock to preserve a clean, tamper-evident history.",
  },
  {
    icon: FileCheck,
    title: "Export when you file",
    description: "Generate a SARS-formatted logbook and expense summary the moment your accountant asks.",
  },
]

export function Compliance() {
  return (
    <section id="compliance" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative order-last lg:order-first">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <Image
                src="/odometer-audit.png"
                alt="A smartphone capturing a time-stamped photo of a car odometer reading for a verified audit record"
                width={1200}
                height={1200}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-primary">Compliance you can defend</p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              A logbook SARS can trust — and you can prove
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              The difference between a claim that sticks and one that gets rejected is
              evidence. Vehicle Expense builds that evidence automatically as you drive.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {points.map((point) => {
                const Icon = point.icon
                return (
                  <div key={point.title}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold">{point.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {point.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
