import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Payment, Driver, UserRole, PaymentMethod } from '../types/database';
import { formatLKR } from '../lib/accounting';

interface PaymentsProps {
  payments: Payment[];
  drivers: Driver[];
  role: UserRole;
  currentMonth: string;
  onAddPayment: (payment: Partial<Payment>) => Promise<boolean>;
}

export const Payments: React.FC<PaymentsProps> = ({
  payments,
  drivers,
  role,
  currentMonth,
  onAddPayment,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [driverFilter, setDriverFilter] = useState<string>('all');

  // Form states
  const [driverId, setDriverId] = useState<string>('');
  const [amountLkr, setAmountLkr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [allocatedMonth, setAllocatedMonth] = useState<string>(currentMonth);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredPayments = payments.filter((p) => {
    if (driverFilter !== 'all' && p.driver_id !== driverFilter) return false;
    return true;
  });

  const handleOpenModal = () => {
    setErrorMessage(null);
    if (drivers.length > 0) {
      setDriverId(driverId && drivers.some(d => d.id === driverId) ? driverId : drivers[0].id);
    } else {
      setDriverId('');
    }
    setAmountLkr('');
    setReference('');
    setNotes('');
    setAllocatedMonth(currentMonth);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseFloat(amountLkr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid payment amount in LKR.');
      return;
    }
    if (!driverId) {
      setErrorMessage('Please select a driver.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAddPayment({
        driver_id: driverId,
        amount_lkr: amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        allocated_month: allocatedMonth,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });

      if (success) {
        setShowAddModal(false);
      } else {
        setErrorMessage('Failed to save payment. Please try again.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCollected = filteredPayments.reduce((acc, p) => acc + Number(p.amount_lkr || 0), 0);

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Header & Add Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Driver Payments</h2>
          <p className="text-xs text-slate-500">Cash, bank transfer, & eZ Cash allocations</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary KPI Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payments</span>
            <span className="text-lg font-black font-mono text-emerald-800">
              {formatLKR(totalCollected)}
            </span>
          </div>
        </div>

        {/* Filter dropdown */}
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
        >
          <option value="all">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Payment History List */}
      <div className="space-y-2.5">
        {filteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
            <p>No payments recorded yet.</p>
          </div>
        ) : (
          filteredPayments.map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {p.driver?.display_name || 'Driver'}
                  </span>
                  <span className="text-[11px] text-slate-400">• {p.payment_date}</span>
                </div>
                <span className="font-mono font-black text-sm text-emerald-700">
                  +{formatLKR(p.amount_lkr)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-xl">
                <span>
                  Allocated to Month: <strong className="font-mono text-slate-800">{p.allocated_month}</strong>
                </span>
                <span className="capitalize font-semibold text-slate-700 px-2 py-0.5 bg-white rounded-md border border-slate-200">
                  {p.payment_method.replace('_', ' ')}
                </span>
              </div>

              {p.reference && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ref: <strong className="font-mono">{p.reference}</strong></span>
                </div>
              )}

              {p.notes && (
                <p className="text-[11px] text-slate-500 italic">&quot;{p.notes}&quot;</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal to Record Payment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-base text-slate-900">Record Driver Payment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver *</label>
                <select
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-sm"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name} ({d.whatsapp_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2500.00"
                  value={amountLkr}
                  onChange={(e) => setAmountLkr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Allocated Month</label>
                  <input
                    type="month"
                    required
                    value={allocatedMonth}
                    onChange={(e) => setAllocatedMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Bank Transfer / Deposit</option>
                  <option value="ez_cash">eZ Cash / mCash</option>
                  <option value="other">Other Payment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slip / Ref Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. BOC-TX-98421"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid partial towards weekend shifts"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Payment...</span>
                  </>
                ) : (
                  <span>Record Payment</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
