"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  Car,
  BookOpen,
  Settings,
  ChevronRight,
  Building2,
  ShieldCheck,
  User,
  Crown,
  Calculator,
} from "lucide-react";
import { cn, getSarsTaxYear } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { UserRole } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  roles?: UserRole[];
}

function getNavItems(role: UserRole): NavItem[] {
  const isDriver = role === UserRole.DRIVER;
  const isAssistant = role === UserRole.ASSISTANT;
  const isRentalCustomer = role === UserRole.RENTAL_CUSTOMER;

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: Home, description: "Overview & stats" },
    { href: "/dashboard/expenses", label: isDriver || isAssistant || isRentalCustomer ? "My Expenses" : "Expenses", icon: Receipt, description: isDriver || isAssistant || isRentalCustomer ? "Your spending" : "Track spending" },
    { href: "/dashboard/vehicles", label: isDriver || isAssistant || isRentalCustomer ? "My Vehicle" : "Vehicles", icon: Car, description: isDriver || isAssistant || isRentalCustomer ? "Assigned vehicle" : "Fleet management" },
  ];

  // RENTAL_CUSTOMER doesn't see Logbook
  if (!isRentalCustomer) {
    items.push({ href: "/dashboard/logbook", label: isDriver || isAssistant ? "My Logbook" : "Logbook", icon: BookOpen, description: isDriver || isAssistant ? "Your trips" : "Trip records" });
  }

  // Tax Summary - visible to all roles
  items.push({ href: "/dashboard/tax-summary", label: "Tax Summary", icon: Calculator, description: "Tax year summaries" });

  items.push({ href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Preferences" });

  if (!isDriver && !isAssistant && !isRentalCustomer) {
    items.splice(4, 0, {
      href: "/dashboard/organization",
      label: "Organization",
      icon: Building2,
      description: "Team & users",
      roles: [UserRole.ADMIN, UserRole.MANAGER],
    });
  }

  return items;
}

function roleBadge(role: UserRole, assistantRole?: string) {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return { label: "Owner", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Crown };
    case UserRole.ADMIN:
      return { label: "Admin", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: ShieldCheck };
    case UserRole.MANAGER:
      return { label: "Manager", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: User };
    case UserRole.DRIVER:
      return { label: "Driver", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: User };
    case UserRole.ASSISTANT:
      return { 
        label: assistantRole === "ASSISTANT_HIGH" ? "Assistant (Edit)" : "Assistant (View)", 
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", 
        icon: User 
      };
    case UserRole.RENTAL_CUSTOMER:
      return { label: "Customer", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: User };
    default:
      return { label: "User", color: "bg-muted text-muted-foreground", icon: User };
  }
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { dateRange } = getSarsTaxYear();
  const role = user?.role ?? UserRole.DRIVER;
  const navItems = getNavItems(role);
  const badge = roleBadge(role, user?.assistantRole);

  return (
    <nav className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-border/50 md:bg-gradient-to-b md:from-card md:to-muted/30 md:h-[calc(100vh-3.5rem)] md:sticky md:top-14">
      {/* Logo/Brand area */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Car className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Vehicle Logbook</p>
            <p className="text-xs text-muted-foreground">Fleet Management</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-1"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-primary-foreground/20"
                  : "bg-muted group-hover:bg-primary/10"
              )}>
                <item.icon className={cn(
                  "h-4.5 w-4.5 transition-transform",
                  isActive ? "" : "group-hover:scale-110"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.description && (
                  <span className={cn(
                    "text-xs truncate block",
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </span>
                )}
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 shrink-0 transition-all",
                isActive 
                  ? "opacity-100" 
                  : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"
              )} />
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-3">
        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", badge.color)}>
          <badge.icon className="h-3 w-3" />
          {badge.label}
        </div>
        <div className="rounded-xl bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">SARS Tax Year</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dateRange}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 progress-animate"
              style={{ width: `${Math.min(100, Math.round(((new Date().getMonth() + 10) % 12) / 12 * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
