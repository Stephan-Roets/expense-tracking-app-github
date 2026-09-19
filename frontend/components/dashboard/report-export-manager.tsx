"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/client"; // Uses centralized JWT handling

interface ReportExport {
  id: string;
  reportType: string;
  format: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  fileUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  FLEET_SUMMARY: "Fleet Summary",
  ASSIGNMENT_HISTORY: "Assignment History",
  DRIVER_CREDENTIALS: "Driver Credentials",
  EXPENSE_AUDIT: "Expense Audit",
};

const STATUS_CONFIG = {
  PENDING: {
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900/40",
    label: "Pending",
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-900/40",
    label: "Completed",
  },
  FAILED: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-900/40",
    label: "Failed",
  },
};

export function ReportExportManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchExports = async () => {
    try {
      const { data } = await api.get('/report-exports');
      setExports(data);
    } catch (error) {
      console.error("Error fetching exports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load report exports",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestExport = async (reportType: string, format: string) => {
    setRequesting(true);
    try {
      await api.post('/report-exports/request', {
        reportType,
        format,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      });

      toast({
        title: "Export requested",
        description: "Your report is being generated. This may take a few moments.",
      });

      await fetchExports();
    } catch (error) {
      console.error("Error requesting export:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request report export",
      });
    } finally {
      setRequesting(false);
    }
  };

  const deleteExport = async (exportId: string) => {
    try {
      await api.delete(`/report-exports/${exportId}`);

      toast({
        title: "Export deleted",
        description: "The report export has been removed",
      });

      await fetchExports();
    } catch (error) {
      console.error("Error deleting export:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete report export",
      });
    }
  };

  const downloadExport = (fileUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchExports();
    // Poll for updates every 5 seconds if there are pending exports
    const interval = setInterval(() => {
      if (exports.some((e) => e.status === "PENDING")) {
        fetchExports();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => requestExport("FLEET_SUMMARY", "CSV")}
          disabled={requesting}
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Fleet Summary (CSV)
        </Button>
        <Button
          onClick={() => requestExport("ASSIGNMENT_HISTORY", "CSV")}
          disabled={requesting}
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Assignment History (CSV)
        </Button>
        <Button
          onClick={() => requestExport("DRIVER_CREDENTIALS", "CSV")}
          disabled={requesting}
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Driver Credentials (CSV)
        </Button>
      </div>

      {exports.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No report exports yet. Request a report above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exports.map((exportItem) => {
            const statusConfig = STATUS_CONFIG[exportItem.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={exportItem.id}
                className={`border ${statusConfig.borderColor} ${statusConfig.bgColor}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {REPORT_TYPE_LABELS[exportItem.reportType] || exportItem.reportType}
                        <Badge variant="outline" className="text-xs">
                          {exportItem.format}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(exportItem.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color} border`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {exportItem.status === "COMPLETED" && exportItem.fileUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadExport(
                              exportItem.fileUrl!,
                              `${exportItem.reportType}_${exportItem.id}.${exportItem.format.toLowerCase()}`
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteExport(exportItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {exportItem.errorMessage && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {exportItem.errorMessage}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
