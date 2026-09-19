"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { getSATaxYear } from "@/lib/types/database";
import { toast } from "sonner";

export type TripExportFormat = "csv" | "excel" | "html" | "pdf";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface TripExportDialogProps {
  vehicleId: string;
  vehicleLabel: string;
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}

async function downloadTripExport(
  vehicleId: string,
  format: TripExportFormat,
  taxYear: number,
): Promise<void> {
  const backendFormat =
    format === "excel"
      ? "EXCEL"
      : format === "pdf"
        ? "PDF"
        : format === "html"
          ? "HTML"
          : "CSV";

  const res = await apiFetch("/exports/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleId,
      format: backendFormat,
      taxYear,
    }),
  });

  if (res.status === 404) {
    throw new Error("Export API not found. Restart the Spring Boot backend.");
  }
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let filename = `trips-export.${format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : format === "html" ? "html" : "csv"}`;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TripExportDialog({
  vehicleId,
  vehicleLabel,
  disabled,
  triggerLabel = "Export trip logs",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "gap-2",
}: TripExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<TripExportFormat>("csv");
  const [taxYear, setTaxYear] = useState(String(getSATaxYear()));
  const [loading, setLoading] = useState<"download" | null>(null);

  const handleDownload = async () => {
    setLoading("download");
    try {
      await downloadTripExport(vehicleId, format, Number(taxYear));
      toast.success("Trip export downloaded");
      setOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to generate trip export. Is the backend running?",
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
        >
          <Download className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export trip records only</DialogTitle>
          <DialogDescription>
            This export is only for the trip logbook records for{" "}
            <span className="font-medium text-foreground">{vehicleLabel}</span>
            for the selected tax year. It does not include expenses, fuel logs
            or the full dashboard export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="trip-export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as TripExportFormat)}
              name="format"
            >
              <SelectTrigger id="trip-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-export-tax-year">Tax year (starts March)</Label>
            <Select value={taxYear} onValueChange={setTaxYear} name="taxYear">
              <SelectTrigger id="trip-export-tax-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map((offset) => {
                  const y = getSATaxYear() - offset;
                  return (
                    <SelectItem key={y} value={String(y)}>
                      {y}/{y + 1}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full gap-2"
            onClick={handleDownload}
            disabled={loading !== null}
          >
            {loading === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
