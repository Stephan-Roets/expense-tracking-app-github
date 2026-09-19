export enum ReportExportType {
  FLEET_SUMMARY = 'FLEET_SUMMARY',
  ASSIGNMENT_HISTORY = 'ASSIGNMENT_HISTORY',
  DRIVER_CREDENTIALS = 'DRIVER_CREDENTIALS',
  EXPENSE_AUDIT = 'EXPENSE_AUDIT'
}

export enum ReportExportStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum ExportFormat {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  HTML = 'HTML',
  CSV = 'CSV'
}

export interface ReportExportRequest {
  reportType: ReportExportType;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportExport {
  id: string;
  organizationId: string;
  requestedById: string;
  requestedByName: string;
  reportType: ReportExportType;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  status: ReportExportStatus;
  fileUrl?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
