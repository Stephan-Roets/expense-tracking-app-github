"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Home,
  Lightbulb,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type OrganizationMode = "SOLO" | "FLEET" | "BUSINESS_FLEET" | "COMPANY";
type UserRole = "ADMIN" | "MANAGER" | "DRIVER" | string;

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface AppUsageGuideDialogProps {
  organizationMode?: OrganizationMode;
  role?: UserRole;
  organizationName?: string;
  userEmail?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}

interface GuideStep {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

interface GuideSection {
  title: string;
  icon: LucideIcon;
  steps: GuideStep[];
}

type QuickStartAccent =
  | "vehicle"
  | "expense"
  | "logbook"
  | "team"
  | "compliance"
  | "export";

interface QuickStartCardItem {
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  icon: LucideIcon;
  href: string;
  accent: QuickStartAccent;
}

const QUICK_START_ACCENTS: Record<
  QuickStartAccent,
  {
    card: string;
    icon: string;
    subtitle: string;
    tip: string;
    cta: string;
  }
> = {
  vehicle: {
    card: "border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    subtitle: "text-sky-700 dark:text-sky-300",
    tip: "bg-sky-100/80 text-sky-950 dark:bg-sky-900/30 dark:text-sky-100",
    cta: "bg-sky-600 text-white",
  },
  expense: {
    card: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    subtitle: "text-emerald-700 dark:text-emerald-300",
    tip: "bg-emerald-100/80 text-emerald-950 dark:bg-emerald-900/30 dark:text-emerald-100",
    cta: "bg-emerald-600 text-white",
  },
  logbook: {
    card: "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    subtitle: "text-violet-700 dark:text-violet-300",
    tip: "bg-violet-100/80 text-violet-950 dark:bg-violet-900/30 dark:text-violet-100",
    cta: "bg-violet-600 text-white",
  },
  team: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    subtitle: "text-amber-700 dark:text-amber-300",
    tip: "bg-amber-100/80 text-amber-950 dark:bg-amber-900/30 dark:text-amber-100",
    cta: "bg-amber-600 text-white",
  },
  compliance: {
    card: "border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    subtitle: "text-rose-700 dark:text-rose-300",
    tip: "bg-rose-100/80 text-rose-950 dark:bg-rose-900/30 dark:text-rose-100",
    cta: "bg-rose-600 text-white",
  },
  export: {
    card: "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    subtitle: "text-indigo-700 dark:text-indigo-300",
    tip: "bg-indigo-100/80 text-indigo-950 dark:bg-indigo-900/30 dark:text-indigo-100",
    cta: "bg-indigo-600 text-white",
  },
};

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StepList({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </div>
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium leading-5">{step.title}</p>
            <p className="text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
            {step.link && step.linkLabel && (
              <DialogClose asChild>
                <Link
                  href={step.link}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1"
                >
                  {step.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </DialogClose>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SimpleTips({ tips }: { tips: string[] }) {
  return (
    <ul className="space-y-2">
      {tips.map((tip) => (
        <li
          key={tip}
          className="flex items-start gap-2 text-sm text-muted-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="leading-6">{tip}</span>
        </li>
      ))}
    </ul>
  );
}

export function getGuideSeenStorageKey({
  organizationMode,
  role,
  userEmail,
}: {
  organizationMode: OrganizationMode;
  role?: UserRole;
  userEmail?: string;
}): string {
  const emailPart = userEmail?.toLowerCase().trim() || "unknown-user";
  const rolePart = role || "unknown-role";
  return `vehicle-expense-info-guide-seen:${emailPart}:${organizationMode}:${rolePart}`;
}

function getBestResultsChecklist(
  organizationMode: OrganizationMode,
  role?: UserRole,
): string[] {
  const isFleet = organizationMode === "BUSINESS_FLEET" || organizationMode === "COMPANY";
  const isDriver = role === "DRIVER";

  const baseChecklist = [
    "Always record full-tank fuel fills when possible if you want the most reliable fuel average.",
    "Add trips on the same day so the route, purpose and distance are still fresh in your mind.",
    "Never guess odometer numbers, litres or amounts. If you are unsure, check the slip, dashboard or document first.",
    "Take clear photos of receipts and odometers so the numbers can be read easily later.",
    "Keep business and private trips correctly separated so your totals and reports stay trustworthy.",
    "Save expenses as soon as they happen instead of waiting until the end of the week or month.",
  ];

  if (!isFleet) {
    return [
      ...baseChecklist,
      "Use the same vehicle record every time so all of your expenses and trips stay together in one place.",
    ];
  }

  if (isDriver) {
    return [
      ...baseChecklist,
      "Only record trips and expenses against the vehicle that is actually assigned to you.",
      "Tell your manager quickly if a vehicle, trip or document problem cannot be fixed by you inside the app.",
    ];
  }

  return [
    ...baseChecklist,
    "Make sure drivers save trips daily and encourage them to use full-tank fuel entries for better reporting.",
    "Keep user roles and vehicle assignments accurate so the right records stay linked to the right people.",
  ];
}

function QuickStartCards({
  title,
  cards,
}: {
  title: string;
  cards: QuickStartCardItem[];
}) {
  return (
    <SectionCard title={title} icon={CircleHelp}>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const accent = QUICK_START_ACCENTS[card.accent];

          return (
            <DialogClose asChild key={card.title}>
              <Link
                href={card.href}
                className={cn(
                  "group block rounded-xl border p-4 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  accent.card,
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className={cn("rounded-lg p-2", accent.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm">
                      Step {index + 1}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {card.title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                    accent.subtitle,
                  )}
                >
                  {card.subtitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
                <div
                  className={cn(
                    "mt-3 rounded-lg p-3 text-xs leading-5",
                    accent.tip,
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5 font-semibold">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Helpful hint
                  </div>
                  <p>{card.tip}</p>
                </div>
                <div
                  className={cn(
                    "mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm",
                    accent.cta,
                  )}
                >
                  <span>Tap to open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </DialogClose>
          );
        })}
      </div>
    </SectionCard>
  );
}

function getNavLabels(role?: UserRole) {
  const isDriver = role === "DRIVER";

  return {
    home: "Home",
    expenses: isDriver ? "My Expenses" : "Expenses",
    vehicles: isDriver ? "My Vehicle" : "Vehicles",
    logbook: isDriver ? "My Logbook" : "Logbook",
    organization: "Organization",
    settings: "Settings",
  };
}

function getQuickStartCards(
  organizationMode: OrganizationMode,
  role?: UserRole,
): { title: string; cards: QuickStartCardItem[] } {
  const nav = getNavLabels(role);
  const isFleet = organizationMode === "BUSINESS_FLEET" || organizationMode === "COMPANY";
  const isDriver = role === "DRIVER";

  const individualCards: QuickStartCardItem[] = [
    {
      title: `Add your vehicle in ${nav.vehicles}`,
      subtitle: "Vehicle first",
      description:
        "Start by saving the car details so the app has something to work with.",
      tip: "Use the registration number exactly as it appears on the vehicle papers, and take a clear odometer photo when the app asks for one.",
      icon: Car,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Edit vehicle details in ${nav.vehicles}`,
      subtitle: "Add optional fields",
      description:
        "After adding your vehicle, you can edit it anytime to add optional details like VIN, insurance policy, license expiry, or tracker serial.",
      tip: "Click the pencil icon next to your vehicle to add missing details. These optional fields help with tracking but are not required to use the app.",
      icon: Car,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Save your costs in ${nav.expenses}`,
      subtitle: "Save costs early",
      description:
        "Every time you buy fuel or pay for a vehicle cost, add it here with a clear photo if you have one.",
      tip: "For the best fuel average, record full-tank fill-ups whenever possible and enter the odometer reading each time.",
      icon: FileText,
      href: "/dashboard/expenses",
      accent: "expense",
    },
    {
      title: `Record your journeys in ${nav.logbook}`,
      subtitle: "Trips matter",
      description:
        "Save each trip and mark it as business or private so your records stay accurate.",
      tip: "Add trips on the same day, while the route and reason are still fresh in your mind.",
      icon: ClipboardList,
      href: "/dashboard/logbook",
      accent: "logbook",
    },
  ];

  const driverCards: QuickStartCardItem[] = [
    {
      title: `Check ${nav.vehicles}`,
      subtitle: "Check assignment",
      description:
        "Confirm which vehicle is assigned to you before you start recording anything.",
      tip: "Make sure you are using the correct assigned vehicle before adding trips, odometer readings or fuel.",
      icon: Car,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Edit vehicle details in ${nav.vehicles}`,
      subtitle: "Add optional fields",
      description:
        "After adding your vehicle, you can edit it anytime to add optional details like VIN, insurance policy, license expiry, or tracker serial.",
      tip: "Click the pencil icon next to your vehicle to add missing details. These optional fields help with tracking but are not required to use the app.",
      icon: Car,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Add costs in ${nav.expenses}`,
      subtitle: "Save what you paid",
      description:
        "If you are responsible for fuel or another vehicle cost, save it as soon as it happens.",
      tip: "For the best fuel average, enter full-tank fills whenever possible and never guess the litres or odometer reading.",
      icon: FileText,
      href: "/dashboard/expenses",
      accent: "expense",
    },
    {
      title: `Save trips in ${nav.logbook}`,
      subtitle: "Record every trip",
      description:
        "Record each journey clearly so the business has the correct travel history.",
      tip: "Mark business and private trips correctly so your company reports stay trustworthy and useful.",
      icon: ClipboardList,
      href: "/dashboard/logbook",
      accent: "logbook",
    },
  ];

  const businessCards: QuickStartCardItem[] = [
    {
      title: `Set up staff in ${nav.organization}`,
      subtitle: "Right roles first",
      description:
        "Add your team members first and make sure each person has the correct role.",
      tip: "Keep roles accurate so admins manage setup, managers supervise work, and drivers only record what belongs to them.",
      icon: Users,
      href: "/dashboard/organization",
      accent: "team",
    },
    {
      title: `Add vehicles in ${nav.vehicles}`,
      subtitle: "One vehicle, one record",
      description:
        "Create each business vehicle so trips and expenses can be linked to the right one.",
      tip: "Use the exact registration number and keep drivers assigned to the correct vehicle for cleaner reporting.",
      icon: Building2,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Edit vehicle details in ${nav.vehicles}`,
      subtitle: "Add optional fields",
      description:
        "After adding your vehicle, you can edit it anytime to add optional details like VIN, insurance policy, license expiry, or tracker serial.",
      tip: "Click the pencil icon next to your vehicle to add missing details. These optional fields help with tracking but are not required to use the app.",
      icon: Car,
      href: "/dashboard/vehicles",
      accent: "vehicle",
    },
    {
      title: `Review trips in ${nav.logbook}`,
      subtitle: "Same-day records",
      description:
        "Open the logbook to check the travel records your team is saving for business vehicles.",
      tip: "Ask drivers to save trips daily and encourage full-tank fuel entries for more reliable consumption reporting.",
      icon: ClipboardList,
      href: "/dashboard/logbook",
      accent: "logbook",
    },
  ];

  if (!isFleet) {
    return {
      title: "Quick start for your own vehicle",
      cards: individualCards,
    };
  }

  if (isDriver) {
    return {
      title: "Quick start for a fleet driver",
      cards: driverCards,
    };
  }

  return {
    title: "Quick start for your fleet or business",
    cards: businessCards,
  };
}

function getTaxAndExportCards(
  organizationMode: OrganizationMode,
  role?: UserRole,
): { title: string; cards: QuickStartCardItem[] } {
  const nav = getNavLabels(role);
  const shouldShowTaxReadiness = !(
    (organizationMode === "BUSINESS_FLEET" || organizationMode === "COMPANY") && role === "DRIVER"
  );

  const cards: QuickStartCardItem[] = [];

  if (shouldShowTaxReadiness) {
    cards.push({
      title: `Open Tax Readiness in ${nav.settings}`,
      subtitle: "Confirm SARS readings",
      description:
        "Open Settings and switch to Tax Readiness to review the odometer records for the tax year.",
      tip: "Check that the OPENING Reading has the correct odometer image and exact odometer number. When it is right, confirm it. At the end of the tax year, add the CLOSING Reading image and number too.",
      icon: Shield,
      href: "/dashboard/settings?tab=tax-readiness",
      accent: "compliance",
    });
  }

  cards.push(
    {
      title: "Use Export on Home for the full vehicle export",
      subtitle: "Complete export",
      description:
        "On Home, choose a vehicle and use Export when you want the full record for that vehicle and tax year.",
      tip: "This export includes trips, expenses, fuel logs, summaries and compliance records. PDF and HTML can also include captured invoices.",
      icon: Download,
      href: "/dashboard",
      accent: "export",
    },
    {
      title: `Use Export in ${nav.logbook} for trip records only`,
      subtitle: "Trip log export",
      description:
        "Open the Logbook export when you only need the trip history for the selected tax year.",
      tip: "This export is for trip records only. It does not include expenses, fuel logs or the full dashboard export.",
      icon: ClipboardList,
      href: "/dashboard/logbook",
      accent: "logbook",
    },
  );

  return {
    title: "Tax and export shortcuts",
    cards,
  };
}

function getGuideSections(
  organizationMode: OrganizationMode,
  role?: UserRole,
  organizationName?: string,
): GuideSection[] {
  const nav = getNavLabels(role);
  const isFleet = organizationMode === "BUSINESS_FLEET" || organizationMode === "COMPANY";
  const isDriver = role === "DRIVER";
  const orgLabel = organizationName?.trim() || "your business";

  const gettingAround: GuideSection = {
    title: "What each main button does",
    icon: Home,
    steps: [
      {
        title: `${nav.home} gives you the big picture`,
        description:
          "Start here when you open the app. This page gives you a quick summary of your vehicle or vehicles, such as spending, trips and important things that need attention.",
      },
      {
        title: `${nav.vehicles} is where vehicle details live`,
        description: isFleet
          ? "Use this section to view the vehicles in the business. This is where vehicle information is kept and where new vehicles can be added."
          : "Use this section to view and manage your own vehicle details. If you are new, this is usually the first place to go.",
      },
      {
        title: `${nav.expenses} is where you save money records`,
        description:
          "Whenever you spend money on fuel, repairs, tyres, insurance, washing, licensing or other vehicle costs, save it here. Think of it like keeping all your slips and invoices in one place.",
      },
      {
        title: `${nav.logbook} is where you save your trips`,
        description:
          "Each journey should be added here so the app can work out your distance totals and business-use history. If a trip was for work, mark it as business. If it was personal, mark it as private.",
      },
      {
        title: `${nav.settings} is where you change your account and app settings`,
        description:
          "Use this section for account details, personal settings and extra tools such as your profile, Tax Readiness checks and exports.",
      },
    ],
  };

  const individualSetup: GuideSection = {
    title: "How to use the app for your own vehicle",
    icon: Car,
    steps: [
      {
        title: `Open ${nav.vehicles} and add your vehicle if it is not there yet`,
        description:
          "Enter the car details one step at a time. If you only have one vehicle, this will be the main vehicle the app uses for your records.",
      },
      {
        title: "Add your opening odometer reading when the app asks for it",
        description:
          "This is the starting kilometre reading for the tax year. If you can, take a clear photo of the odometer so the numbers are easy to read later.",
      },
      {
        title: `Use ${nav.expenses} every time you spend money on the vehicle`,
        description:
          "Do not wait until the end of the month if you can help it. Add fuel, services, tyres, insurance and other costs as soon as they happen. If you have a receipt or invoice, add the photo while you still have it.",
      },
      {
        title: `Use ${nav.logbook} to record each trip`,
        description:
          "Add where you started, where you ended, the distance and whether it was a business trip or a private trip. The more regularly you do this, the easier everything becomes later.",
      },
      {
        title: "Check Home to see how things are going",
        description:
          "Your dashboard helps you quickly see totals, trends and whether your records are up to date. It is your easy check-in screen.",
      },
      {
        title: "Use exports when you need a report or tax record",
        description:
          "When you need to share information or prepare for tax time, open the logbook or settings area and use the export options. This gives you a neat record from the information you already saved.",
      },
    ],
  };

  const fleetManagerSetup: GuideSection = {
    title: "How to use the app for your business vehicles",
    icon: Building2,
    steps: [
      {
        title: "IMPORTANT: Change your password now",
        description:
          "If you were invited to join this team, you must change your password immediately. This is a critical security requirement to protect your business data. Do this before anything else.",
        link: "/dashboard/profile",
        linkLabel: "Change Password Now",
      },
      {
        title: `Start in ${nav.organization}`,
        description: `This is the main setup area for ${orgLabel}. Add your team members here and make sure each person has the correct role. Admins and managers usually handle this part.`,
      },
      {
        title: `Add the business vehicles in ${nav.vehicles}`,
        description:
          "Create a record for each vehicle you want the business to track. Add them carefully so the right trips and expenses are linked to the right vehicle.",
      },
      {
        title: "Link the right drivers to the right vehicles",
        description:
          "Once your team and vehicles are in place, make sure the correct person is linked to the correct vehicle where needed. This helps everyone record the right information in the right place.",
      },
      {
        title: "Save the opening odometer reading for each vehicle",
        description:
          "At the start of the tax period, save the odometer reading for every vehicle and add a clear photo if you can. This gives each vehicle a proper starting point.",
      },
      {
        title: `Ask drivers or staff to use ${nav.expenses} and ${nav.logbook} every day`,
        description:
          "The business records stay accurate when each trip and each vehicle-related cost is added as soon as it happens. The app works best when it is updated regularly, not in large batches much later.",
      },
      {
        title: "Use Home and the bell to keep an eye on the business",
        description:
          "Managers can use the summary screens and reminders to spot missing records, upcoming renewals and other items that need attention before they turn into bigger problems.",
      },
      {
        title: "Use exports when you need something to share or save",
        description:
          "When the business needs a record for finance, compliance or tax work, export the information from the app instead of rebuilding it by hand.",
      },
    ],
  };

  const fleetDriverSetup: GuideSection = {
    title: "How to use the app as a fleet driver",
    icon: Users,
    steps: [
      {
        title: "IMPORTANT: Change your password now",
        description:
          "If you were invited to join this team, you must change your password immediately. This is a critical security requirement to protect your business data. Do this before anything else.",
        link: "/dashboard/profile",
        linkLabel: "Change Password Now",
      },
      {
        title: `Check ${nav.vehicles} to see the vehicle you must work with`,
        description:
          "Use the vehicle that has been assigned to you. If nothing is assigned or the details look wrong, ask your manager or admin to fix that first.",
      },
      {
        title: "Add the odometer reading when the app asks you",
        description:
          "If the app asks for a starting or closing odometer reading, enter the number carefully and take a clear photo when possible.",
      },
      {
        title: `Use ${nav.expenses} for every vehicle cost you are responsible for`,
        description:
          "If you buy fuel, pay for a wash, or record another allowed cost, save it straight away. Add the photo of the slip or invoice while it is still in your hand.",
      },
      {
        title: `Use ${nav.logbook} for every trip`,
        description:
          "Record each journey so the business has a correct history of travel. Mark the trip as business or private according to what it was actually used for.",
      },
      {
        title:
          "Watch the reminders and tell your manager when something needs action",
        description:
          "If you see a warning about tyres, documents or expiry dates, do not ignore it. Record what you can in the app and tell the responsible person if business approval is needed.",
      },
      {
        title: `Leave team changes and company setup to ${nav.organization}`,
        description:
          "Most fleet drivers do not need to manage staff accounts or business setup. If those details must change, ask an admin or manager to handle it.",
      },
    ],
  };

  const alertsSection: GuideSection = {
    title: "How to use alerts and reminders",
    icon: Bell,
    steps: [
      {
        title: "Tap the bell to open your alerts and reminders",
        description:
          "This is the fastest place to see what needs attention now. It may include things like expired documents, upcoming renewals or tyre rotation reminders.",
      },
      {
        title: "Look at the urgent items first",
        description:
          "If something shows as expired or urgent, deal with that before the less important items. In simple terms: red or urgent items should be handled first.",
      },
      {
        title: "Open the right section and sort it out",
        description:
          "For example, if the reminder is about a document or expense record, go to the related vehicle, expense or logbook entry and update it properly.",
      },
      {
        title: "Dismiss a reminder only after it has really been handled",
        description:
          "Use dismiss for items you have already dealt with or do not need to see again right now. Do not use it just to hide a problem.",
      },
    ],
  };

  const shouldShowTaxReadiness = !(isFleet && isDriver);

  const taxReadinessSection: GuideSection = {
    title: "Tax Readiness for SARS",
    icon: Shield,
    steps: [
      {
        title: `Open ${nav.settings} and switch to Tax Readiness`,
        description:
          "Use this section when you need to review the odometer records for the tax year.",
      },
      {
        title: "Check the OPENING Reading carefully",
        description:
          "Make sure the odometer image and the actual odometer number both match what was on the vehicle at the start of the tax year.",
      },
      {
        title: "Confirm the OPENING Reading when you are sure it is correct",
        description:
          "Once it is correct, confirm it so it becomes the confirmed opening record instead of a reading that still needs confirmation.",
      },
      {
        title: "Add the CLOSING Reading at the end of the tax year",
        description:
          "Before you finish the tax year, add the closing odometer number and image so your SARS records are complete.",
      },
    ],
  };

  const exportsSection: GuideSection = {
    title: "How exports work",
    icon: Download,
    steps: [
      {
        title: "Use Export on Home for the complete vehicle export",
        description:
          "On Home, choose the vehicle and use Export when you want the full record for that vehicle and tax year. This includes trips, expenses, fuel logs, summaries and compliance records.",
      },
      {
        title: `Use Export in ${nav.logbook} when you only need trip records`,
        description:
          "The logbook export is for trip history only for the selected tax year. Use this when you want just the travel records without the rest of the vehicle data.",
      },
      {
        title: "Choose the format that suits what you need",
        description:
          "PDF and HTML are easier to read and share. Excel or CSV are better if you want to sort, filter or work with the data in a spreadsheet.",
      },
    ],
  };

  const taxAndRecords: GuideSection = {
    title: "A simple routine that works well",
    icon: ClipboardList,
    steps: [
      {
        title: "When money is spent, save the expense the same day",
        description:
          "This keeps your records complete and saves you from trying to remember everything later.",
      },
      {
        title:
          "When a trip is finished, save the trip while it is still fresh in your mind",
        description:
          "It is much easier to remember where you went and why if you do it immediately.",
      },
      {
        title:
          "When the app asks for a reading or photo, do it clearly and carefully",
        description:
          "Make sure the odometer numbers and receipt details can be read before you save the photo.",
      },
      {
        title: "Check the dashboard and the bell regularly",
        description:
          "A quick check every day or two helps you catch missing records before they pile up.",
      },
    ],
  };

  if (!isFleet) {
    return [
      gettingAround,
      individualSetup,
      ...(shouldShowTaxReadiness ? [taxReadinessSection] : []),
      exportsSection,
      alertsSection,
      taxAndRecords,
    ];
  }

  return [
    gettingAround,
    isDriver ? fleetDriverSetup : fleetManagerSetup,
    ...(shouldShowTaxReadiness ? [taxReadinessSection] : []),
    exportsSection,
    alertsSection,
    taxAndRecords,
  ];
}

export function AppUsageGuideDialog({
  organizationMode = "SOLO",
  role,
  organizationName,
  userEmail,
  triggerLabel = "Info",
  triggerVariant = "ghost",
  triggerSize = "sm",
  triggerClassName = "touch-target gap-2 px-2 sm:px-3",
}: AppUsageGuideDialogProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isFleet = organizationMode === "BUSINESS_FLEET" || organizationMode === "COMPANY";
  const isDriver = role === "DRIVER";
  const sections = getGuideSections(organizationMode, role, organizationName);
  const quickStart = getQuickStartCards(organizationMode, role);
  const taxAndExportQuickLinks = getTaxAndExportCards(organizationMode, role);

  const modeLabel = isFleet ? "Fleet / Business" : "Individual";
  const bestResultsChecklist = getBestResultsChecklist(organizationMode, role);
  const hasIdentity = Boolean(userEmail || role);
  const guideSeenKey = useMemo(
    () =>
      getGuideSeenStorageKey({
        organizationMode,
        role,
        userEmail,
      }),
    [organizationMode, role, userEmail],
  );

  useEffect(() => {
    if (pathname !== "/dashboard" || !hasIdentity) return;

    try {
      const alreadySeen = localStorage.getItem(guideSeenKey) === "true";
      if (!alreadySeen) {
        localStorage.setItem(guideSeenKey, "true");
        setOpen(true);
      }
    } catch {
      // ignore localStorage issues
    }
  }, [guideSeenKey, hasIdentity, pathname]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) return;

    try {
      localStorage.setItem(guideSeenKey, "true");
    } catch {
      // ignore localStorage issues
    }
  };

  const handleCopyChecklist = async () => {
    const header = role
      ? `How to get the best results — ${modeLabel} (${role})`
      : `How to get the best results — ${modeLabel}`;

    const checklistText = [
      header,
      "",
      ...bestResultsChecklist.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(checklistText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = checklistText;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      toast.success("Tips copied");
    } catch {
      toast.error("Could not copy tips");
    }
  };

  const modeDescription = isFleet
    ? isDriver
      ? "This guide is for a fleet driver. It shows you how to record trips, fuel and vehicle information in a simple way."
      : "This guide is for a fleet or business account. It shows you how to manage vehicles, team members and records in a simple way."
    : "This guide is for someone using the app for their own vehicle. It shows you how to track trips, expenses and records in a simple way.";

  const tips = isFleet
    ? [
        "Think of the app as one shared record book for the business vehicles.",
        "The person driving or paying should usually save the record as soon as it happens.",
        "If you are not sure who must change a team or vehicle setup item, ask an admin or manager.",
      ]
    : [
        "Think of the app as a digital glovebox for your vehicle records.",
        "If you add information little by little, tax time becomes much easier.",
        "A clear photo of the odometer or receipt is always better than trying to remember later.",
      ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label={`${triggerLabel}: how to use this app`}
          title={`${triggerLabel}: how to use this app`}
        >
          <CircleHelp className="h-4 w-4" />
          <span className="text-sm">{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:max-h-[85vh]">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <CircleHelp className="h-3.5 w-3.5" />
                Help Guide
              </Badge>
              <Badge
                variant="outline"
                className={
                  isFleet
                    ? "border-primary/40 text-primary"
                    : "border-accent/40 text-accent"
                }
              >
                {modeLabel}
              </Badge>
              {role && <Badge variant="secondary">{role}</Badge>}
            </div>
            <DialogTitle className="text-xl sm:text-2xl">
              How to use this app
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {modeDescription} Everything here is written in simple everyday
              language so it is easy to follow step by step.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              <SectionCard title="Start here" icon={Shield}>
                <p className="text-sm leading-6 text-muted-foreground">
                  The easiest way to get good results from this app is to treat
                  it like a diary for your vehicle records. When something
                  happens, save it while it is still fresh in your mind: add the
                  trip, add the expense, add the reading, and keep your photos
                  clear.
                </p>
              </SectionCard>

              {isFleet && (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-base font-semibold text-amber-900 dark:text-amber-100">
                        Change Your Password
                      </h4>
                      <p className="text-sm leading-6 text-amber-800 dark:text-amber-300">
                        If you were invited to join this team with a temporary password, you must change it immediately. This is a critical security requirement to protect your business data.
                      </p>
                      <DialogClose asChild>
                        <Link
                          href="/dashboard/profile"
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                        >
                          Change Password Now
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </DialogClose>
                    </div>
                  </div>
                </div>
              )}

              <QuickStartCards
                title={quickStart.title}
                cards={quickStart.cards}
              />

              {taxAndExportQuickLinks.cards.length > 0 && (
                <QuickStartCards
                  title={taxAndExportQuickLinks.title}
                  cards={taxAndExportQuickLinks.cards}
                />
              )}

              {sections.map((section, index) => (
                <div key={section.title} className="space-y-6">
                  <SectionCard title={section.title} icon={section.icon}>
                    <StepList steps={section.steps} />
                  </SectionCard>
                  {index < sections.length - 1 && <Separator />}
                </div>
              ))}

              <SectionCard title="A few extra tips" icon={FileText}>
                <SimpleTips tips={tips} />
              </SectionCard>

              <SectionCard
                title="If you are not sure where something belongs"
                icon={Settings}
              >
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    If you are not sure where something belongs, start with the
                    simplest question:
                    <strong className="text-foreground">
                      {" "}
                      Was this a trip, an expense, a vehicle detail, or a
                      business/team change?
                    </strong>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="font-medium text-foreground">Trip</p>
                      <p>Go to the logbook section.</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="font-medium text-foreground">Money spent</p>
                      <p>Go to the expenses section.</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="font-medium text-foreground">
                        Vehicle details
                      </p>
                      <p>Go to the vehicles section.</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="font-medium text-foreground">
                        Team or business setup
                      </p>
                      <p>
                        {isFleet
                          ? "Go to the organization section."
                          : "This does not usually apply to an individual account."}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="How to get the best results" icon={Lightbulb}>
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm leading-6 text-muted-foreground sm:max-w-2xl">
                      If you want the app to give you the most useful totals,
                      reminders and reports, try to follow this checklist every
                      time you use it.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 self-start"
                      onClick={handleCopyChecklist}
                    >
                      <Copy className="h-4 w-4" />
                      Copy these tips
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {bestResultsChecklist.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3"
                      >
                        <div className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
