"use client";

import { useEffect, useState } from 'react';
import { Download, FileText, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { reportExportService } from '@/services/report-export-service';
import { ReportExport, ReportExportRequest, ReportExportType, ExportFormat, ReportExportStatus } from '@/types/report-export';

export default function ReportExportManager() {
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [request, setRequest] = useState<ReportExportRequest>({
    reportType: ReportExportType.FLEET_SUMMARY,
    format: ExportFormat.EXCEL,
  });
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    loadExports();
  }, []);

  useEffect(() => {
    // Poll for updates every 5 seconds if there are pending exports AND user has permission
    const hasPending = exports.some(e => e.status === ReportExportStatus.PENDING);
    if (!hasPending || !hasPermission) return;

    const interval = setInterval(() => {
      loadExports();
    }, 5000);

    return () => clearInterval(interval);
  }, [exports, hasPermission]);

  const loadExports = async () => {
    try {
      const data = await reportExportService.getExports();
      setExports(data);
      setHasPermission(true);
    } catch (error) {
      // Silently fail - this feature may not be available for all users
      setExports([]);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      await reportExportService.requestExport(request);
      setShowRequestForm(false);
      loadExports();
    } catch (error: any) {
      alert(error.message || 'Failed to request export');
    } finally {
      setRequesting(false);
    }
  };

  const handleDeleteExport = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export?')) return;
    try {
      await reportExportService.deleteExport(exportId);
      loadExports();
    } catch (error) {
      alert('Failed to delete export');
    }
  };

  const getStatusIcon = (status: ReportExportStatus) => {
    switch (status) {
      case ReportExportStatus.PENDING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case ReportExportStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case ReportExportStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: ReportExportStatus) => {
    switch (status) {
      case ReportExportStatus.PENDING:
        return 'Processing...';
      case ReportExportStatus.COMPLETED:
        return 'Completed';
      case ReportExportStatus.FAILED:
        return 'Failed';
    }
  };

  const getReportTypeLabel = (type: ReportExportType) => {
    switch (type) {
      case ReportExportType.FLEET_SUMMARY:
        return 'Fleet Summary';
      case ReportExportType.ASSIGNMENT_HISTORY:
        return 'Assignment History';
      case ReportExportType.DRIVER_CREDENTIALS:
        return 'Driver Credentials';
      case ReportExportType.EXPENSE_AUDIT:
        return 'Expense Audit';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Report Exports</h3>
        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showRequestForm ? 'Cancel' : 'New Export'}
        </button>
      </div>

      {showRequestForm && (
        <form onSubmit={handleRequestExport} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select
              id="reportType"
              name="reportType"
              value={request.reportType}
              onChange={(e) => setRequest({ ...request, reportType: e.target.value as ReportExportType })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value={ReportExportType.FLEET_SUMMARY}>Fleet Summary</option>
              <option value={ReportExportType.ASSIGNMENT_HISTORY}>Assignment History</option>
              <option value={ReportExportType.DRIVER_CREDENTIALS}>Driver Credentials</option>
              <option value={ReportExportType.EXPENSE_AUDIT}>Expense Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              id="format"
              name="format"
              value={request.format}
              onChange={(e) => setRequest({ ...request, format: e.target.value as ExportFormat })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value={ExportFormat.EXCEL}>Excel (XLSX)</option>
              <option value={ExportFormat.CSV}>CSV</option>
              <option value={ExportFormat.PDF}>PDF</option>
              <option value={ExportFormat.HTML}>HTML</option>
            </select>
          </div>

          {request.reportType !== ReportExportType.FLEET_SUMMARY && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <input
                  type="date"
                  id="dateFrom"
                  name="dateFrom"
                  value={request.dateFrom || ''}
                  onChange={(e) => setRequest({ ...request, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <input
                  type="date"
                  id="dateTo"
                  name="dateTo"
                  value={request.dateTo || ''}
                  onChange={(e) => setRequest({ ...request, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={requesting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {requesting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting...
              </span>
            ) : (
              'Request Export'
            )}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : exports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No exports yet. Request your first export above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exports.map((exp) => (
            <div key={exp.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(exp.status)}
                  <span className="font-medium">{getReportTypeLabel(exp.reportType)}</span>
                  <span className="text-sm text-gray-500">• {exp.format}</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>Requested by {exp.requestedByName}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(exp.createdAt).toLocaleString()}</span>
                </div>
                {exp.errorMessage && (
                  <div className="text-sm text-red-600 mt-1">{exp.errorMessage}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exp.status === ReportExportStatus.COMPLETED && exp.fileUrl && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/storage/${exp.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                )}
                <button
                  onClick={() => handleDeleteExport(exp.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
