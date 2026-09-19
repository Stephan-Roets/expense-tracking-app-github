"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
  FileCode,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface FleetAssignmentHistoryExportDialogProps {
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}

interface ConditionSectionDTO {
  sectionType: string;
  condition: string;
  description: string;
  locked: boolean;
  inspectedAt: string;
  imageUrls: string[];
}

interface ManagerNoteDTO {
  note: string;
  createdByName: string;
  createdAt: string;
}

interface VehicleConditionReportDTO {
  purpose: string;
  createdAt: string;
  completedByName: string;
  sections: ConditionSectionDTO[];
  managerNotes: ManagerNoteDTO[];
}

interface AssignmentInfo {
  driverName: string;
  driverEmail: string;
  assignedAt: string;
  unassignedAt: string | null;
  assignedByName: string;
  assignedByEmail: string;
  status: string;
  odometerAtAssignment: number | null;
  odometerConfirmationImageUrl: string | null;
  conditionReport?: VehicleConditionReportDTO | null;
}

interface FleetAssignmentHistory {
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  currentOdometer: number | null;
  currentDriver: AssignmentInfo | null;
  previousDriver: AssignmentInfo | null;
}

type ExportFormat = "csv" | "html" | "pdf";

async function downloadAssignmentHistory(
  includeConditionReports: boolean,
  format: ExportFormat,
): Promise<void> {
  const res = await apiFetch(
    `/vehicles/fleet/assignment-history?includeConditionReports=${includeConditionReports}`,
    {
      method: "GET",
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch assignment history (${res.status})`);
  }

  const data: FleetAssignmentHistory[] = await res.json();

  if (format === "csv") {
    // Generate CSV
    const headers = [
      "Vehicle Registration",
      "Make",
      "Model",
      "Current Odometer",
      "Current Driver Name",
      "Current Driver Email",
      "Current Driver Assigned At",
      "Current Driver Assigned By",
      "Current Driver Odometer at Assignment",
      "Previous Driver Name",
      "Previous Driver Email",
      "Previous Driver Assigned At",
      "Previous Driver Assigned By",
      "Previous Driver Odometer at Assignment",
    ];

    if (includeConditionReports) {
      headers.push(
        "Current Condition Report Purpose",
        "Current Condition Report Completed By",
        "Current Condition Report Sections Count",
        "Current Condition Report Images Count",
        "Previous Condition Report Purpose",
        "Previous Condition Report Completed By",
        "Previous Condition Report Sections Count",
        "Previous Condition Report Images Count",
      );
    }

    const rows = data.map((vehicle) => [
      vehicle.vehicleRegistration,
      vehicle.vehicleMake,
      vehicle.vehicleModel,
      vehicle.currentOdometer?.toString() || "",
      vehicle.currentDriver?.driverName || "",
      vehicle.currentDriver?.driverEmail || "",
      vehicle.currentDriver?.assignedAt || "",
      vehicle.currentDriver?.assignedByName || "",
      vehicle.currentDriver?.odometerAtAssignment?.toString() || "",
      vehicle.previousDriver?.driverName || "",
      vehicle.previousDriver?.driverEmail || "",
      vehicle.previousDriver?.assignedAt || "",
      vehicle.previousDriver?.assignedByName || "",
      vehicle.previousDriver?.odometerAtAssignment?.toString() || "",
      ...(includeConditionReports
        ? [
            vehicle.currentDriver?.conditionReport?.purpose || "",
            vehicle.currentDriver?.conditionReport?.completedByName || "",
            vehicle.currentDriver?.conditionReport?.sections?.length?.toString() || "0",
            vehicle.currentDriver?.conditionReport?.sections?.reduce((acc, s) => acc + s.imageUrls.length, 0)?.toString() || "0",
            vehicle.previousDriver?.conditionReport?.purpose || "",
            vehicle.previousDriver?.conditionReport?.completedByName || "",
            vehicle.previousDriver?.conditionReport?.sections?.length?.toString() || "0",
            vehicle.previousDriver?.conditionReport?.sections?.reduce((acc, s) => acc + s.imageUrls.length, 0)?.toString() || "0",
          ]
        : []),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-assignment-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === "html" || format === "pdf") {
    // Generate HTML with condition reports
    const headers = [
      "Vehicle Registration",
      "Make",
      "Model",
      "Current Odometer",
      "Current Driver Name",
      "Current Driver Email",
      "Current Driver Assigned At",
      "Current Driver Assigned By",
      "Current Driver Odometer at Assignment",
      "Previous Driver Name",
      "Previous Driver Email",
      "Previous Driver Assigned At",
      "Previous Driver Assigned By",
      "Previous Driver Odometer at Assignment",
    ];

    const rows = data.map((vehicle) => [
      vehicle.vehicleRegistration,
      vehicle.vehicleMake,
      vehicle.vehicleModel,
      vehicle.currentOdometer?.toString() || "",
      vehicle.currentDriver?.driverName || "",
      vehicle.currentDriver?.driverEmail || "",
      vehicle.currentDriver?.assignedAt || "",
      vehicle.currentDriver?.assignedByName || "",
      vehicle.currentDriver?.odometerAtAssignment?.toString() || "",
      vehicle.previousDriver?.driverName || "",
      vehicle.previousDriver?.driverEmail || "",
      vehicle.previousDriver?.assignedAt || "",
      vehicle.previousDriver?.assignedByName || "",
      vehicle.previousDriver?.odometerAtAssignment?.toString() || "",
    ]);

    // Generate condition report HTML sections
    const conditionReportsHtml = includeConditionReports ? data.map((vehicle) => {
      const currentReport = vehicle.currentDriver?.conditionReport;
      const previousReport = vehicle.previousDriver?.conditionReport;

      let reportHtml = `<div class="vehicle-section" style="margin-top: 40px; page-break-before: auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
          ${vehicle.vehicleRegistration} - ${vehicle.vehicleMake} ${vehicle.vehicleModel}
        </h2>`;

      if (currentReport) {
        reportHtml += `
          <h3 style="color: #666; margin-top: 20px;">Current Driver Condition Report</h3>
          <p><strong>Purpose:</strong> ${currentReport.purpose}</p>
          <p><strong>Completed By:</strong> ${currentReport.completedByName}</p>
          <p><strong>Completed At:</strong> ${new Date(currentReport.createdAt).toLocaleString()}</p>
          
          <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
            <thead>
              <tr>
                <th style="background-color: #2196F3; color: white; border: 1px solid #ddd; padding: 8px;">Section</th>
                <th style="background-color: #2196F3; color: white; border: 1px solid #ddd; padding: 8px;">Condition</th>
                <th style="background-color: #2196F3; color: white; border: 1px solid #ddd; padding: 8px;">Description</th>
                <th style="background-color: #2196F3; color: white; border: 1px solid #ddd; padding: 8px;">Images</th>
              </tr>
            </thead>
            <tbody>
              ${currentReport.sections.map(section => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.sectionType}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.condition}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.description || ''}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${section.imageUrls.length > 0
                      ? section.imageUrls.map(url => {
                          const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL || 'https://fleet-expense-app.duckdns.org'}${url}`;
                          return `<img src="${fullUrl}" style="max-width: 100px; max-height: 100px; margin: 2px; border: 1px solid #ddd;" />`;
                        }).join('')
                      : 'No images'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${currentReport.managerNotes && currentReport.managerNotes.length > 0 ? `
            <h4 style="margin-top: 15px;">Manager Notes</h4>
            <ul style="margin-top: 5px;">
              ${currentReport.managerNotes.map(note => `
                <li style="margin-bottom: 5px;">
                  <strong>${note.createdByName}</strong> (${new Date(note.createdAt).toLocaleString()}): ${note.note}
                </li>
              `).join('')}
            </ul>
          ` : ''}
        `;
      }

      if (previousReport) {
        reportHtml += `
          <h3 style="color: #666; margin-top: 30px;">Previous Driver Condition Report</h3>
          <p><strong>Purpose:</strong> ${previousReport.purpose}</p>
          <p><strong>Completed By:</strong> ${previousReport.completedByName}</p>
          <p><strong>Completed At:</strong> ${new Date(previousReport.createdAt).toLocaleString()}</p>
          
          <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
            <thead>
              <tr>
                <th style="background-color: #FF9800; color: white; border: 1px solid #ddd; padding: 8px;">Section</th>
                <th style="background-color: #FF9800; color: white; border: 1px solid #ddd; padding: 8px;">Condition</th>
                <th style="background-color: #FF9800; color: white; border: 1px solid #ddd; padding: 8px;">Description</th>
                <th style="background-color: #FF9800; color: white; border: 1px solid #ddd; padding: 8px;">Images</th>
              </tr>
            </thead>
            <tbody>
              ${previousReport.sections.map(section => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.sectionType}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.condition}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${section.description || ''}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${section.imageUrls.length > 0
                      ? section.imageUrls.map(url => {
                          const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL || 'https://fleet-expense-app.duckdns.org'}${url}`;
                          return `<img src="${fullUrl}" style="max-width: 100px; max-height: 100px; margin: 2px; border: 1px solid #ddd;" />`;
                        }).join('')
                      : 'No images'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${previousReport.managerNotes && previousReport.managerNotes.length > 0 ? `
            <h4 style="margin-top: 15px;">Manager Notes</h4>
            <ul style="margin-top: 5px;">
              ${previousReport.managerNotes.map(note => `
                <li style="margin-bottom: 5px;">
                  <strong>${note.createdByName}</strong> (${new Date(note.createdAt).toLocaleString()}): ${note.note}
                </li>
              `).join('')}
            </ul>
          ` : ''}
        `;
      }

      reportHtml += `</div>`;
      return reportHtml;
    }).join('') : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fleet Assignment History</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .date { font-size: 12px; color: #666; }
    img { object-fit: cover; }
  </style>
</head>
<body>
  <h1>Fleet Assignment History</h1>
  <p class="date">Generated: ${new Date().toLocaleString()}</p>
  
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>

  ${conditionReportsHtml}
</body>
</html>`;

    if (format === "html") {
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleet-assignment-history-${new Date().toISOString().split("T")[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      // For PDF, we'll use the browser's print functionality with the HTML
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        throw new Error("Failed to open print window. Please allow popups for this site.");
      }
    }
  }
}

export function FleetAssignmentHistoryExportDialog({
  disabled = false,
  triggerLabel = "Export All",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName = "",
}: FleetAssignmentHistoryExportDialogProps) {
  const { user } = useAuth();
  const { data: permissions } = usePermissions(user?.organizationId || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeConditionReports, setIncludeConditionReports] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const hasPermission =
    isSuperAdmin || permissions?.["FLEET_STATUS"]?.["VIEW_FLEET_STATUS"];

  if (!hasPermission) {
    return null;
  }

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadAssignmentHistory(includeConditionReports, format);
      toast.success("Fleet assignment history exported successfully");
      setOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export assignment history",
      );
    } finally {
      setLoading(false);
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
          <Download className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Fleet Assignment History</DialogTitle>
          <DialogDescription>
            Generate a comprehensive report showing vehicle assignments, driver
            history, and odometer readings for all fleet vehicles.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("csv")}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                variant={format === "html" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("html")}
                className="w-full"
              >
                <FileCode className="mr-2 h-4 w-4" />
                HTML
              </Button>
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("pdf")}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeConditionReports"
              checked={includeConditionReports}
              onCheckedChange={(checked) =>
                setIncludeConditionReports(checked as boolean)
              }
            />
            <label
              htmlFor="includeConditionReports"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Include vehicle condition reports
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This report includes:
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>Vehicle registration, make, and model</li>
            <li>Current odometer reading</li>
            <li>Current driver assignment details</li>
            <li>Previous driver assignment history</li>
            <li>Odometer readings at each assignment</li>
            <li>Who assigned each driver (name and email)</li>
            {includeConditionReports && (
              <li>Vehicle condition reports (if available)</li>
            )}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
