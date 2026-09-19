"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Fuel,
  Wrench,
  Droplets,
  CircleDot,
  FileText,
  ChevronRight,
  Car,
  Sparkles,
  Lock,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExpenseCategory,
  formatZAR,
  formatConsumption,
  formatConsumptionWithPreference,
  EXPENSE_CATEGORY_LABELS,
  FUEL_TYPE_LABELS,
  FuelType,
} from "@/lib/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vehicle, EntryImage } from "@/lib/types/database";
import { api, getExpenseCategories } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { EntryActions } from "@/components/entries";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";

const categoryIcons: Record<ExpenseCategory, LucideIcon> = {
  [ExpenseCategory.FUEL_LOG]: Fuel,
  [ExpenseCategory.MECHANIC_SERVICE]: Wrench,
  [ExpenseCategory.MAINTENANCE_TOPUP]: Droplets,
  [ExpenseCategory.TIRES]: CircleDot,
  [ExpenseCategory.CAR_WASH]: Sparkles,
  [ExpenseCategory.INSURANCE_PREMIUM]: FileText,
  [ExpenseCategory.VEHICLE_TRACKING]: FileText,
  [ExpenseCategory.ETOLL_SANRAL]: FileText,
  [ExpenseCategory.LICENSE_RENEWAL]: FileText,
  [ExpenseCategory.PERSONAL_LICENSE]: FileText,
  [ExpenseCategory.ROADWORTHY]: Car,
  [ExpenseCategory.OTHER_FIXED]: FileText,
};

// Helper to format vehicle label same as dashboard
function vehicleLabel(v: Vehicle): string {
  return v.nickname
    ? `${v.nickname} (${v.registrationNumber})`
    : `${v.year} ${v.make} ${v.model} — ${v.registrationNumber}`;
}

const categoryColors: Record<ExpenseCategory, { bg: string; text: string }> = {
  [ExpenseCategory.FUEL_LOG]: { bg: "bg-chart-1/10", text: "text-chart-1" },
  [ExpenseCategory.MECHANIC_SERVICE]: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
  },
  [ExpenseCategory.MAINTENANCE_TOPUP]: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
  },
  [ExpenseCategory.TIRES]: { bg: "bg-chart-5/10", text: "text-chart-5" },
  [ExpenseCategory.CAR_WASH]: { bg: "bg-sky-500/10", text: "text-sky-500" },
  [ExpenseCategory.INSURANCE_PREMIUM]: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
  },
  [ExpenseCategory.VEHICLE_TRACKING]: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
  },
  [ExpenseCategory.ETOLL_SANRAL]: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
  },
  [ExpenseCategory.LICENSE_RENEWAL]: {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
  },
  [ExpenseCategory.PERSONAL_LICENSE]: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
  },
  [ExpenseCategory.ROADWORTHY]: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
  },
  [ExpenseCategory.OTHER_FIXED]: { bg: "bg-chart-4/10", text: "text-chart-4" },
};

interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vehicleReg: string;
  vehicleId?: string;
  date: Date;
  createdAt: Date;
  supplierName?: string;
  isLocked?: boolean;
  lockedAt?: Date;
  lockedByName?: string;
  lockedReason?: string;
  imageCount?: number;
  fuelConsumptionLPer100km?: number;
  odometerReading?: number;
  fuelType?: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | "ALL" | "UNCATEGORIZED">(
    "ALL",
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("ALL");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseImages, setExpenseImages] = useState<
    Record<string, EntryImage[]>
  >({});
  const [availableCategories, setAvailableCategories] = useState<
    ExpenseCategory[]
  >([]);

  // Fetch expenses from backend API on mount
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await api.get("/expenses");
        console.log("Expenses - Backend response:", response);
        const expenseData = (response as any).data || response;
        if (Array.isArray(expenseData)) {
          const loadedExpenses: ExpenseItem[] = expenseData.map(
            (expense: any) => ({
              id: expense.id,
              category: expense.category,
              description: expense.description || "Expense",
              amount: expense.amountZar || 0,
              vehicleReg: expense.vehicle?.registrationNumber || "Unknown",
              vehicleId: expense.vehicleId,
              date: expense.expenseDate
                ? new Date(expense.expenseDate)
                : expense.createdAt
                  ? new Date(expense.createdAt)
                  : new Date(),
              createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
              supplierName: expense.supplierName,
              isLocked: expense.isLocked || false,
              lockedAt: expense.lockedAt
                ? new Date(expense.lockedAt)
                : undefined,
              lockedByName: expense.lockedByName,
              lockedReason: expense.lockedReason,
              imageCount: expense.imageCount || 0,
              fuelConsumptionLPer100km:
                expense.fuelLog?.consumptionLPer100km != null
                  ? Number(expense.fuelLog.consumptionLPer100km)
                  : undefined,
              odometerReading: expense.odometerReading,
              fuelType: expense.fuelLog?.fuelType,
            }),
          );
          // Sort by createdAt descending (newest added first)
          loadedExpenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          setExpenses(loadedExpenses);
          console.log("Loaded expenses from backend:", loadedExpenses.length);
        } else {
          console.warn("Expenses - Invalid backend data:", expenseData);
          setExpenses([]);
        }
      } catch (err) {
        console.error("Expenses - Failed to fetch from backend:", err);
        setExpenses([]);
      }
    };
    fetchExpenses();
  }, []);

  // Fetch vehicles for filter
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await api.get("/vehicles");
        console.log("Expenses - Vehicles response:", response);
        const vehicleData = (response as any).data || response;
        if (Array.isArray(vehicleData)) {
          setVehicles(vehicleData);
          console.log("Expenses - Loaded vehicles:", vehicleData.length);
        } else {
          console.warn("Expenses - Invalid vehicles data:", vehicleData);
        }
      } catch (err) {
        console.error("Expenses - Failed to fetch vehicles:", err);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch available expense categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getExpenseCategories();
        const categories = (response as any).data || response;
        if (Array.isArray(categories)) {
          setAvailableCategories(categories as ExpenseCategory[]);
          console.log("Expenses - Loaded categories:", categories.length);
        } else {
          console.warn("Expenses - Invalid categories data:", categories);
        }
      } catch (err) {
        console.error("Expenses - Failed to fetch categories:", err);
        // Fallback to all categories if API fails
        setAvailableCategories(
          Object.values(ExpenseCategory) as ExpenseCategory[],
        );
      }
    };
    fetchCategories();
  }, []);

  // Filter expenses based on search, category, and vehicle
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vehicleReg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    if (activeCategory === "ALL") {
      matchesCategory = true;
    } else if (activeCategory === "UNCATEGORIZED") {
      // Filter by tax expense classification - this would need to be fetched from backend
      // For now, we'll show all expenses since we don't have the classification data
      matchesCategory = true;
    } else {
      matchesCategory = expense.category === activeCategory;
    }

    const matchesVehicle =
      selectedVehicle === "ALL" || expense.vehicleId === selectedVehicle;

    return matchesSearch && matchesCategory && matchesVehicle;
  });

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const selectedVehicleOption = vehicles.find(
    (vehicle) => vehicle.id === selectedVehicle,
  );

  const selectedVehicleLabel =
    selectedVehicle === "ALL"
      ? "All vehicles"
      : selectedVehicleOption
        ? vehicleLabel(selectedVehicleOption)
        : "Selected vehicle";

  const selectedCategoryLabel =
    activeCategory === "ALL"
      ? "All categories"
      : activeCategory === "UNCATEGORIZED"
        ? "Needs Review"
        : (EXPENSE_CATEGORY_LABELS[activeCategory] ?? activeCategory);

  const expenseFiltersSummaryItems = [
    {
      label: `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"}`,
      tone: "activity" as const,
    },
    {
      label: formatZAR(totalAmount),
      tone: "info" as const,
    },
    {
      label: selectedVehicleLabel,
    },
    {
      label: selectedCategoryLabel,
      tone: activeCategory === "ALL" ? ("neutral" as const) : ("info" as const),
    },
    ...(searchQuery.trim()
      ? [
          {
            label: `Search: ${searchQuery.trim()}`,
          },
        ]
      : []),
  ];

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.delete(`/expenses/${expenseId}`);
      setExpenses(expenses.filter((e) => e.id !== expenseId));
    } catch (err) {
      console.error("Failed to delete expense:", err);
      throw err;
    }
  };

  const handleLockExpense = async (expenseId: string, reason?: string) => {
    try {
      await api.patch(
        `/expenses/${expenseId}/lock?reason=${encodeURIComponent(reason || "")}`,
        {},
      );
      setExpenses(
        expenses.map((e) =>
          e.id === expenseId
            ? {
                ...e,
                isLocked: true,
                lockedAt: new Date(),
                lockedReason: reason,
              }
            : e,
        ),
      );
    } catch (err) {
      console.error("Failed to lock expense:", err);
    }
  };

  const handleUnlockExpense = async (expenseId: string) => {
    try {
      await api.patch(`/expenses/${expenseId}/unlock`, {});
      setExpenses(
        expenses.map((e) =>
          e.id === expenseId
            ? {
                ...e,
                isLocked: false,
                lockedAt: undefined,
                lockedReason: undefined,
              }
            : e,
        ),
      );
    } catch (err) {
      console.error("Failed to unlock expense:", err);
    }
  };

  const fetchExpenseImages = async (expenseId: string) => {
    try {
      const response = await api.get(`/expenses/${expenseId}/images`);
      const images = (response as any).data || response || [];
      setExpenseImages((prev) => ({ ...prev, [expenseId]: images }));
    } catch (err) {
      console.error("Failed to fetch expense images:", err);
      setExpenseImages((prev) => ({ ...prev, [expenseId]: [] }));
    }
  };

  const handleUploadExpenseImage = async (
    expenseId: string,
    file: File,
    description?: string,
  ) => {
    console.log("[v0] Uploading image for expense:", expenseId, file.name);
    await fetchExpenseImages(expenseId);
  };

  const handleDeleteExpenseImage = async (
    expenseId: string,
    imageId: string,
  ) => {
    try {
      await api.delete(`/expenses/${expenseId}/images/${imageId}`);
      setExpenseImages((prev) => ({
        ...prev,
        [expenseId]: (prev[expenseId] || []).filter(
          (img) => img.id !== imageId,
        ),
      }));
    } catch (err) {
      console.error("Failed to delete image:", err);
      throw err;
    }
  };

  const handleReuploadExpenseImage = async (
    expenseId: string,
    imageId: string,
    file: File,
  ) => {
    console.log("[v0] Reuploading expense image:", imageId, file.name);
    await fetchExpenseImages(expenseId);
  };

  const handleLockExpenseImage = async (
    expenseId: string,
    imageId: string,
    reason?: string,
  ) => {
    try {
      await api.patch(
        `/expenses/${expenseId}/images/${imageId}/lock?reason=${encodeURIComponent(reason || "")}`,
        {},
      );
      await fetchExpenseImages(expenseId);
    } catch (err) {
      console.error("Failed to lock image:", err);
      throw err;
    }
  };

  return (
    <div className="container mx-auto max-w-full space-y-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all your vehicle expenses
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/expenses/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>
      </div>

      <DashboardCollapsiblePanel
        panelId="expenses-filters"
        title="Search and filters"
        description="Search expenses and narrow the list by vehicle or category."
        tone="info"
        openLabel="Hide filters"
        closedLabel="Show filters"
        summaryItems={expenseFiltersSummaryItems}
        contentClassName="space-y-4"
      >
        {/* Search and Vehicle Filter */}
        <div className="flex flex-col gap-2 md:flex-row w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              name="search"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <Select
            value={selectedVehicle}
            onValueChange={setSelectedVehicle}
            name="vehicle-filter"
          >
            <SelectTrigger id="vehicle-filter" className="h-11 w-full md:w-[220px] min-w-0">
              <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                <Car className="h-4 w-4 shrink-0" />
                <SelectValue
                  placeholder="All Vehicles"
                  className="truncate"
                />
              </span>
            </SelectTrigger>
            <SelectContent className="max-w-[300px]">
              <SelectItem value="ALL" className="truncate">All Vehicles</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id} className="truncate max-w-full">
                  <div className="flex items-center gap-2">
                    <VehicleLogo make={vehicle.make} size="xs" />
                    <span className="truncate">{vehicleLabel(vehicle)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter Tabs */}
        {availableCategories.length > 0 && (
          <>
            <Tabs
              value={activeCategory === "ALL" ? "all" : activeCategory === "UNCATEGORIZED" ? "uncategorized" : activeCategory}
              onValueChange={(v) =>
                setActiveCategory(
                  v === "all" ? "ALL" : v === "uncategorized" ? "UNCATEGORIZED" : (v as ExpenseCategory),
                )
              }
            >
              <TabsList className="grid h-auto w-full grid-cols-4 p-1 sm:grid-cols-6 overflow-x-auto">
                <TabsTrigger value="all" className="text-xs whitespace-nowrap">
                  All
                </TabsTrigger>
                <TabsTrigger value="uncategorized" className="text-xs whitespace-nowrap">
                  Needs Review
                </TabsTrigger>
                {availableCategories.slice(0, 4).map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-xs whitespace-nowrap"
                  >
                    {EXPENSE_CATEGORY_LABELS[category]?.split(" ")[0] ||
                      category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Second row for remaining categories */}
            {availableCategories.length > 4 && (
              <Tabs
                value={activeCategory === "ALL" ? "" : activeCategory === "UNCATEGORIZED" ? "" : activeCategory}
                onValueChange={(v) =>
                  setActiveCategory(v as ExpenseCategory)
                }
              >
                <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:grid-cols-6 overflow-x-auto">
                  {availableCategories.slice(4).map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="text-xs whitespace-nowrap"
                    >
                      {EXPENSE_CATEGORY_LABELS[category]?.split(" ")[0] ||
                        category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </>
        )}
      </DashboardCollapsiblePanel>

      {/* Summary */}
      <div className="py-3 border-b border-border bg-muted/30 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {filteredExpenses.length} expense
              {filteredExpenses.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground sm:text-sm">Total</p>
            <p className="text-lg font-bold">{formatZAR(totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="py-4 space-y-3 w-full max-w-full">
        {filteredExpenses.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No expenses found</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/expenses/new">
                  Add Your First Expense
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredExpenses.map((expense) => {
            const Icon = categoryIcons[expense.category] || FileText;
            const colors = categoryColors[expense.category] || {
              bg: "bg-muted",
              text: "text-muted-foreground",
            };

            return (
              <Card
                key={expense.id}
                className={cn(
                  "border-border/50 hover:border-border transition-colors relative",
                  expense.isLocked && "border-amber-500/50",
                )}
              >
                {/* Lock indicator */}
                {expense.isLocked && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/30"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-center gap-4 w-full">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        colors.bg,
                      )}
                    >
                      <Icon className={cn("h-6 w-6", colors.text)} />
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {expense.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {expense.vehicleReg}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              &bull;
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(expense.date, "d MMM yyyy")}
                            </span>
                          </div>
                          {expense.supplierName && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {expense.supplierName}
                            </p>
                          )}
                          {expense.category === ExpenseCategory.FUEL_LOG &&
                            expense.fuelConsumptionLPer100km != null && (
                              <p className="text-xs font-medium text-chart-1 mt-0.5 truncate">
                                {formatConsumptionWithPreference(
                                  expense.fuelConsumptionLPer100km,
                                  preferences.regional.fuelEfficiencyDisplay,
                                )}{" "}
                                (full tank cycle)
                              </p>
                            )}
                          {(expense.imageCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <ImageIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {expense.imageCount} image
                                {expense.imageCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">
                            {formatZAR(expense.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <Link
                      href={`/dashboard/expenses/${expense.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View details
                      <ChevronRight className="h-3 w-3" />
                    </Link>

                    <EntryActions
                      entryId={expense.id}
                      entryType="expense"
                      isLocked={expense.isLocked ?? false}
                      lockedAt={expense.lockedAt}
                      lockedByName={expense.lockedByName}
                      lockedReason={expense.lockedReason}
                      onEdit={() =>
                        router.push(`/dashboard/expenses/${expense.id}/edit`)
                      }
                      onDelete={() => handleDeleteExpense(expense.id)}
                      onLock={(reason) => handleLockExpense(expense.id, reason)}
                      onUnlock={() => handleUnlockExpense(expense.id)}
                      disabled={
                        selectedVehicle === "ALL" &&
                        expense.category !== ExpenseCategory.PERSONAL_LICENSE
                      }
                      variant="icons"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
