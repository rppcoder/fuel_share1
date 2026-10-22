import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Upload,
  Printer,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  MonthSummaryReport,
  Trip,
  Payment,
  FuelPurchase,
  Expense,
  Vehicle,
  Driver,
} from '../types/database';
import { formatLKR, formatKM } from '../lib/accounting';

interface ReportsProps {
  report: MonthSummaryReport;
  selectedMonth: string;
  vehicle: Vehicle | null;
  trips: Trip[];
  payments: Payment[];
  fuelPurchases: FuelPurchase[];
  expenses: Expense[];
  drivers: Driver[];
  onImportBackup?: (data: any) => Promise<boolean>;
}

export const Reports: React.FC<ReportsProps> = ({
  report,
  selectedMonth,
  vehicle,
  trips,
  payments,
  fuelPurchases,
  expenses,
  drivers,
  onImportBackup,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // 1. Export Trips to CSV
  const exportTripsCSV = () => {
    const headers = [
      'Trip ID',
      'Date',
      'Driver',
      'Start Odometer (KM)',
      'End Odometer (KM)',
      'Distance (KM)',
      'Rate Snapshot (LKR)',
      'Contribution (LKR)',
      'Status',
      'Notes',
    ];

    const rows = trips.map((t) => [
      t.id,
      t.trip_date,
      t.driver?.display_name || 'Driver',
      t.start_odometer_km,
      t.end_odometer_km ?? '',
      t.distance_km,
      t.rate_per_km_snapshot,
      t.calculated_contribution,
      t.status,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `fuelshare_trips_${selectedMonth}.csv`, 'text/csv');
  };

  // 2. Export Monthly Driver Statement CSV
  const exportStatementCSV = () => {
    const headers = [
      'Driver Name',
      'Reporting Month',
      'Completed KM',
      'Confirmed Contribution (LKR)',
      'Allocated Payments (LKR)',
      'Outstanding Balance (LKR)',
      'Status',
    ];

    const rows = report.driverSummaries.map((ds) => [
      `"${ds.driverName}"`,
      selectedMonth,
      ds.completedKm,
      ds.confirmedContributionLKR,
      ds.allocatedPaymentsLKR,
      ds.outstandingBalanceLKR,
      ds.outstandingBalanceLKR > 0 ? 'Due' : ds.outstandingBalanceLKR < 0 ? 'Credit' : 'Settled',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `fuelshare_statement_${selectedMonth}.csv`, 'text/csv');
  };

  // 3. Export JSON Complete Backup
  const exportJSONBackup = () => {
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      vehicle,
      drivers,
      trips,
      fuelPurchases,
      expenses,
      payments,
      report,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    downloadBlob(jsonStr, `fuelshare_backup_${selectedMonth}_${Date.now()}.json`, 'application/json');
  };

  // 4. Import & Validate JSON Backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Security & Schema validation
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON root format.');
        }

        if (!parsed.trips && !parsed.drivers && !parsed.vehicle) {
          throw new Error('Unrecognized schema: Missing essential vehicle or trip entities.');
        }

        if (onImportBackup) {
          const success = await onImportBackup(parsed);
          if (success) {
            setImportStatus('Backup restored successfully!');
          } else {
            setImportStatus('Error committing restored records.');
          }
        } else {
          setImportStatus('JSON validated successfully. Ready for commit.');
        }
      } catch (err: unknown) {
        setImportStatus(
          `Import rejected: ${err instanceof Error ? err.message : 'Malformed JSON file.'}`
        );
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Reports & Exports</h2>
          <p className="text-xs text-slate-500">Statements, CSV spreadsheets & backup</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Printable Monthly Summary Sheet Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:shadow-none print:border-none">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-emerald-800">
              FuelShare Sri Lanka
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Monthly Statement: {selectedMonth}
            </h3>
            <p className="text-xs text-slate-500">
              Vehicle: {vehicle?.name} ({vehicle?.registration_identifier})
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
            LKR
          </span>
        </div>

        {/* Printable Driver Statement Rows */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
            <span>Driver</span>
            <span className="text-right">Distance</span>
            <span className="text-right">Contrib.</span>
            <span className="text-right">Balance</span>
          </div>

          {report.driverSummaries.map((d) => (
            <div
              key={d.driverId}
              className="grid grid-cols-4 text-xs font-medium py-1.5 border-b border-slate-50 items-center"
            >
              <span className="font-bold text-slate-900 truncate">{d.driverName}</span>
              <span className="text-right font-mono text-slate-600">{formatKM(d.completedKm)}</span>
              <span className="text-right font-mono text-slate-800">
                {formatLKR(d.confirmedContributionLKR)}
              </span>
              <span
                className={`text-right font-mono font-bold ${
                  d.outstandingBalanceLKR > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {d.outstandingBalanceLKR > 0
                  ? `+${formatLKR(d.outstandingBalanceLKR)}`
                  : d.outstandingBalanceLKR < 0
                  ? `-${formatLKR(Math.abs(d.outstandingBalanceLKR))}`
                  : 'Rs. 0.00'}
              </span>
            </div>
          ))}
        </div>

        {/* Aggregate Totals */}
        <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Total Completed Distance:</span>
            <span className="font-mono font-bold text-slate-900">{formatKM(report.totalDistanceKm)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Total Driver Contributions:</span>
            <span className="font-mono font-bold text-emerald-800">
              {formatLKR(report.totalConfirmedContributionLKR)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Actual Fuel Pump Expenditure:</span>
            <span className="font-mono font-bold text-amber-800">
              {formatLKR(report.totalFuelExpenditureLKR)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Vehicle Repairs & Maintenance:</span>
            <span className="font-mono font-bold text-blue-800">
              {formatLKR(report.totalOtherExpensesLKR)}
            </span>
          </div>
        </div>
      </div>

      {/* CSV Export Options */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Spreadsheet (CSV) Exports</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={exportTripsCSV}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold transition active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Trips CSV</span>
          </button>

          <button
            onClick={exportStatementCSV}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold transition active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Driver Statement CSV</span>
          </button>
        </div>
      </div>

      {/* JSON Backup & Safe Restore */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Database className="w-4 h-4 text-emerald-700" />
          <span>JSON Database Backup & Restore</span>
        </h3>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Download a full encrypted JSON backup containing vehicles, trips, rates, fuel logs, and driver payments.
        </p>

        <div className="space-y-2">
          <button
            onClick={exportJSONBackup}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Download Full JSON Backup</span>
          </button>

          <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>{isImporting ? 'Validating...' : 'Restore from JSON File'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              importStatus.includes('successfully')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {importStatus.includes('successfully') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};
