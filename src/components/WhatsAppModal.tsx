import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  X,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { DriverMonthlySummary, Vehicle } from '../types/database';
import { buildDriverWhatsAppUrl, formatLKR, formatKM } from '../lib/accounting';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverSummary: DriverMonthlySummary | null;
  vehicle: Vehicle | null;
  month: string; // e.g. "2026-10"
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  driverSummary,
  vehicle,
  month,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !driverSummary || !vehicle) return null;

  // Format month to readable e.g. "October 2026"
  const dateObj = new Date(`${month}-01T00:00:00Z`);
  const monthName = dateObj.toLocaleDateString('en-LK', {
    month: 'long',
    year: 'numeric',
  });

  const waUrl = buildDriverWhatsAppUrl({
    driverSummary,
    vehicleName: vehicle.name,
    registrationNumber: vehicle.registration_identifier,
    monthName,
  });

  // Decode text for previewing the exact message
  const urlParams = new URL(waUrl).searchParams;
  const rawMessage = urlParams.get('text') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#075E54] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#128C7E] flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Monthly WhatsApp Statement</h3>
              <p className="text-xs text-emerald-100">Review statement before opening WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-[#128C7E] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Driver Info Card */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase">Recipient</div>
              <div className="text-base font-bold text-slate-900">{driverSummary.driverName}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{driverSummary.whatsappNumber || 'No phone number provided'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-semibold uppercase">Reporting Month</div>
              <div className="text-sm font-bold text-emerald-800">{monthName}</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Distance</div>
              <div className="text-sm font-bold text-emerald-950 mt-0.5">
                {formatKM(driverSummary.completedKm)}
              </div>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-[10px] uppercase font-bold text-blue-700">Contributed</div>
              <div className="text-sm font-bold text-blue-950 mt-0.5">
                {formatLKR(driverSummary.confirmedContributionLKR)}
              </div>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                driverSummary.outstandingBalanceLKR > 0
                  ? 'bg-rose-50 border-rose-100'
                  : 'bg-emerald-50 border-emerald-100'
              }`}
            >
              <div
                className={`text-[10px] uppercase font-bold ${
                  driverSummary.outstandingBalanceLKR > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                Balance
              </div>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  driverSummary.outstandingBalanceLKR > 0 ? 'text-rose-950' : 'text-emerald-950'
                }`}
              >
                {formatLKR(Math.abs(driverSummary.outstandingBalanceLKR))}
                <span className="text-[10px] font-normal block text-slate-500">
                  {driverSummary.outstandingBalanceLKR > 0 ? '(Due)' : '(Prepaid)'}
                </span>
              </div>
            </div>
          </div>

          {driverSummary.incompleteTripsCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{driverSummary.incompleteTripsCount} incomplete trip(s)</strong> flagged in this month and not included in confirmed totals.
              </span>
            </div>
          )}

          {/* Preview of Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Prefilled WhatsApp Message:</label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {rawMessage}
            </pre>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Note: Clicking &quot;Send via WhatsApp&quot; opens WhatsApp with this prefilled statement for you to review and send manually.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-xs shadow-md active:scale-95 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
