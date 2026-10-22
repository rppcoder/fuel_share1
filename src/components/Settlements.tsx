import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { MonthSummaryReport, UserRole, Settlement } from '../types/database';
import { formatLKR, formatKM } from '../lib/accounting';

interface SettlementsProps {
  report: MonthSummaryReport;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  role: UserRole;
  onConfirmSettlement: (month: string, summary: any) => Promise<boolean>;
  onAmendSettlement: (month: string, reason: string) => Promise<boolean>;
}

export const Settlements: React.FC<SettlementsProps> = ({
  report,
  selectedMonth,
  onMonthChange,
  role,
  onConfirmSettlement,
  onAmendSettlement,
}) => {
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [showAmendModal, setShowAmendModal] = useState<boolean>(false);
  const [amendReason, setAmendReason] = useState<string>('');
  const [showSnapshotView, setShowSnapshotView] = useState<boolean>(false);

  const settlement = report.settlement;
  const isConfirmed = settlement?.status === 'confirmed';
  const isAmended = settlement?.status === 'amended';

  const dateObj = new Date(`${selectedMonth}-01T00:00:00Z`);
  const monthName = dateObj.toLocaleDateString('en-LK', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrev = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleConfirm = async () => {
    if (report.incompleteTripsTotal > 0) {
      const proceed = confirm(
        `Warning: There are ${report.incompleteTripsTotal} incomplete trips in this month. Incomplete trips are excluded from confirmed billing. Do you still wish to lock and confirm this monthly settlement?`
      );
      if (!proceed) return;
    }

    setIsConfirming(true);
    try {
      const snapshot = {
        month: selectedMonth,
        totalDistanceKm: report.totalDistanceKm,
        totalConfirmedContributionLKR: report.totalConfirmedContributionLKR,
        totalFuelExpenditureLKR: report.totalFuelExpenditureLKR,
        totalOtherExpensesLKR: report.totalOtherExpensesLKR,
        totalPaymentsCollectedLKR: report.totalPaymentsCollectedLKR,
        drivers: report.driverSummaries,
        confirmedAt: new Date().toISOString(),
      };
      await onConfirmSettlement(selectedMonth, snapshot);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAmend = async () => {
    if (!amendReason.trim()) {
      alert('Please provide a reason for amending the confirmed settlement.');
      return;
    }
    setIsConfirming(true);
    try {
      await onAmendSettlement(selectedMonth, amendReason.trim());
      setShowAmendModal(false);
      setAmendReason('');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Month Navigator Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Monthly Settlement</div>
          <span className="font-extrabold text-slate-900 text-sm">{monthName}</span>
        </div>
        <button
          onClick={handleNext}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Settlement Status Card */}
      <div
        className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
          isConfirmed
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : isAmended
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isConfirmed
                ? 'bg-emerald-600 text-white'
                : isAmended
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isConfirmed ? (
              <Lock className="w-5 h-5" />
            ) : isAmended ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {isConfirmed
                ? 'Settlement Confirmed & Locked'
                : isAmended
                ? 'Settlement Amended'
                : 'Draft Month (Unconfirmed)'}
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isConfirmed
                ? `Snapshot captured on ${new Date(settlement!.confirmed_at).toLocaleDateString()}`
                : isAmended
                ? `Re-opened and amended on ${new Date(settlement!.amended_at!).toLocaleDateString()}`
                : 'Review all trips and payments before finalizing.'}
            </p>
          </div>
        </div>

        {settlement?.summary_snapshot && (
          <button
            onClick={() => setShowSnapshotView(!showSnapshotView)}
            className="px-2.5 py-1 text-xs font-bold bg-white/80 rounded-lg border border-slate-200 text-slate-700 hover:bg-white"
          >
            Snapshot
          </button>
        )}
      </div>

      {/* Snapshot Preview Drawer */}
      {showSnapshotView && settlement && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-amber-300">Audited Snapshot Record</span>
            <button
              onClick={() => setShowSnapshotView(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="font-mono text-[10px] text-emerald-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(settlement.summary_snapshot, null, 2)}
          </pre>
        </div>
      )}

      {/* Incomplete Trips Warning */}
      {report.incompleteTripsTotal > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {report.incompleteTripsTotal} Incomplete Trip(s) Detected
            </span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Trips without a finishing odometer reading are excluded from confirmed billing. Please check the Trips tab.
            </p>
          </div>
        </div>
      )}

      {/* Comprehensive Statement Breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Monthly Settlement Breakdown
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Total Completed Distance:</span>
            <span className="font-mono font-bold text-slate-900">{formatKM(report.totalDistanceKm)}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Total Driver Contributions (Confirmed):</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatLKR(report.totalConfirmedContributionLKR)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Actual Fuel Purchases (Pump):</span>
            <span className="font-mono font-bold text-amber-700">
              {formatLKR(report.totalFuelExpenditureLKR)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Vehicle Repairs & Other Outlays:</span>
            <span className="font-mono font-bold text-blue-700">
              {formatLKR(report.totalOtherExpensesLKR)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-600">Driver Payments Collected:</span>
            <span className="font-mono font-bold text-emerald-800">
              {formatLKR(report.totalPaymentsCollectedLKR)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-sm font-extrabold">
            <span className="text-slate-900">Vehicle Net Cash Margin:</span>
            <span
              className={`font-mono ${
                report.netVehicleCashflowLKR >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatLKR(report.netVehicleCashflowLKR)}
            </span>
          </div>
        </div>
      </div>

      {/* Driver-by-Driver Settlement Table */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Per-Driver Final Statement
        </h3>

        <div className="space-y-3">
          {report.driverSummaries.map((ds) => (
            <div
              key={ds.driverId}
              className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{ds.driverName}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    ds.outstandingBalanceLKR > 0
                      ? 'bg-rose-100 text-rose-800'
                      : ds.outstandingBalanceLKR < 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {ds.outstandingBalanceLKR > 0
                    ? `Due: ${formatLKR(ds.outstandingBalanceLKR)}`
                    : ds.outstandingBalanceLKR < 0
                    ? `Credit: ${formatLKR(Math.abs(ds.outstandingBalanceLKR))}`
                    : 'Fully Settled'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-500 pt-1">
                <div>KM: <strong className="text-slate-800 font-mono">{formatKM(ds.completedKm)}</strong></div>
                <div>Bill: <strong className="text-slate-800 font-mono">{formatLKR(ds.confirmedContributionLKR)}</strong></div>
                <div>Paid: <strong className="text-slate-800 font-mono">{formatLKR(ds.allocatedPaymentsLKR)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Administrator Lock / Confirm Controls */}
      {role === 'admin' && (
        <div className="pt-2">
          {!isConfirmed ? (
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <CalendarCheck className="w-5 h-5" />
              <span>{isConfirming ? 'Confirming...' : `Confirm & Lock Settlement (${monthName})`}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAmendModal(true)}
              className="w-full py-3.5 rounded-2xl border-2 border-amber-500 text-amber-900 font-bold text-xs hover:bg-amber-50 transition flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-amber-600" />
              <span>Amend / Correct This Confirmed Month</span>
            </button>
          )}
        </div>
      )}

      {/* Amend Settlement Dialog */}
      {showAmendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm">Amend Confirmed Settlement</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This month was previously confirmed and locked. Amending will preserve the original snapshot in the historical audit ledger while allowing authorized corrections.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Amendment (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Added late fuel receipt from driver"
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAmendModal(false)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAmend}
                disabled={isConfirming || !amendReason.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs shadow transition disabled:opacity-50"
              >
                {isConfirming ? 'Amending...' : 'Confirm Amendment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
