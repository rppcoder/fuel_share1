import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Wrench,
  Plus,
  Camera,
  Calendar,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';
import { FuelPurchase, Expense, Vehicle, UserRole } from '../types/database';
import { formatLKR } from '../lib/accounting';
import { uploadReceipt, getReceiptSignedUrl } from '../lib/storage';

interface FuelExpensesProps {
  vehicle: Vehicle | null;
  role: UserRole;
  fuelPurchases: FuelPurchase[];
  expenses: Expense[];
  onAddFuel: (fuel: Partial<FuelPurchase>) => Promise<boolean>;
  onAddExpense: (expense: Partial<Expense>) => Promise<boolean>;
}

export const FuelExpenses: React.FC<FuelExpensesProps> = ({
  vehicle,
  fuelPurchases,
  expenses,
  onAddFuel,
  onAddExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states for Fuel
  const [fuelDate, setFuelDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState<string>('Petrol 92 Octane');
  const [fuelAmount, setFuelAmount] = useState<string>('');
  const [fuelLitres, setFuelLitres] = useState<string>('');
  const [fuelOdometer, setFuelOdometer] = useState<string>(
    vehicle ? String(vehicle.current_odometer_km) : ''
  );
  const [fuelPaidBy, setFuelPaidBy] = useState<string>('');
  const [fuelNotes, setFuelNotes] = useState<string>('');

  useEffect(() => {
    if (vehicle?.current_odometer_km && (!fuelOdometer || fuelOdometer === '0')) {
      setFuelOdometer(String(vehicle.current_odometer_km));
    }
  }, [vehicle?.current_odometer_km]);

  // Form states for Expenses
  const [expDate, setExpDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<string>('maintenance');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expPaidBy, setExpPaidBy] = useState<string>('');
  const [expDescription, setExpDescription] = useState<string>('');

  // Receipt image file
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Receipt viewer modal
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenReceipt = async (path: string) => {
    setLoadingReceipt(true);
    setViewingReceiptUrl(null);
    try {
      const signedUrl = await getReceiptSignedUrl(path);
      if (signedUrl) {
        setViewingReceiptUrl(signedUrl);
      } else {
        alert('Could not retrieve private receipt signed URL. Check connection.');
      }
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const amount = parseFloat(fuelAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid fuel amount in LKR.');
      return;
    }
    if (!fuelPaidBy.trim()) {
      setSubmitError('Please enter the name of the person who paid at the pump.');
      return;
    }

    setIsUploading(true);
    try {
      let receiptPath: string | null = null;
      if (receiptFile && vehicle) {
        const uploadRes = await uploadReceipt({
          file: receiptFile,
          householdId: vehicle.household_id,
          category: 'fuel',
        });
        receiptPath = uploadRes.path;
      }

      const success = await onAddFuel({
        vehicle_id: vehicle?.id || '',
        purchase_date: fuelDate,
        fuel_type: fuelType,
        amount_lkr: amount,
        litres: fuelLitres ? parseFloat(fuelLitres) : null,
        odometer_km: fuelOdometer ? parseFloat(fuelOdometer) : null,
        paid_by: fuelPaidBy.trim(),
        receipt_path: receiptPath,
        notes: fuelNotes.trim() || null,
      });

      if (success) {
        setShowAddModal(false);
        setFuelAmount('');
        setFuelLitres('');
        setFuelNotes('');
        setReceiptFile(null);
        setReceiptPreview(null);
      } else {
        setSubmitError('Failed to record fuel purchase.');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid expense amount in LKR.');
      return;
    }
    if (!expDescription.trim()) {
      setSubmitError('Please enter a description for this expense.');
      return;
    }
    if (!expPaidBy.trim()) {
      setSubmitError('Please enter who paid for this expense.');
      return;
    }

    setIsUploading(true);
    try {
      let receiptPath: string | null = null;
      if (receiptFile && vehicle) {
        const uploadRes = await uploadReceipt({
          file: receiptFile,
          householdId: vehicle.household_id,
          category: 'expense',
        });
        receiptPath = uploadRes.path;
      }

      const success = await onAddExpense({
        vehicle_id: vehicle?.id || '',
        expense_date: expDate,
        category: expCategory as any,
        amount_lkr: amount,
        paid_by: expPaidBy.trim(),
        description: expDescription.trim(),
        receipt_path: receiptPath,
      });

      if (success) {
        setShowAddModal(false);
        setExpAmount('');
        setExpDescription('');
        setReceiptFile(null);
        setReceiptPreview(null);
      } else {
        setSubmitError('Failed to record vehicle expense.');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Header & New Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Fuel & Expenses</h2>
          <p className="text-xs text-slate-500">Actual pump & maintenance cash outlays</p>
        </div>
        <button
          onClick={() => {
            setSubmitError(null);
            if (vehicle?.current_odometer_km) {
              setFuelOdometer(String(vehicle.current_odometer_km));
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record New</span>
        </button>
      </div>

      {/* Clear Accounting Rule Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Accounting Distinction:</strong> Actual petrol purchases and spare parts costs are tracked independently and do not automatically count as driver contributions.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('fuel')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition ${
            activeTab === 'fuel'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Fuel className="w-4 h-4 text-amber-600" />
          <span>Fuel Purchases ({fuelPurchases.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition ${
            activeTab === 'expenses'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 text-blue-600" />
          <span>Repairs & Other ({expenses.length})</span>
        </button>
      </div>

      {/* Tab 1: Fuel Purchases List */}
      {activeTab === 'fuel' && (
        <div className="space-y-2.5">
          {fuelPurchases.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
              <Fuel className="w-8 h-8 mx-auto text-slate-300" />
              <p>No fuel purchases recorded yet.</p>
            </div>
          ) : (
            fuelPurchases.map((f) => (
              <div
                key={f.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{f.fuel_type}</span>
                    <span className="text-[11px] text-slate-400">• {f.purchase_date}</span>
                  </div>
                  <span className="font-mono font-black text-sm text-amber-700">
                    {formatLKR(f.amount_lkr)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Paid By</span>
                    <span className="font-semibold text-slate-800">{f.paid_by}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Litres</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {f.litres ? `${f.litres} L` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Odometer</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {f.odometer_km ? `${f.odometer_km} km` : '—'}
                    </span>
                  </div>
                </div>

                {f.notes && (
                  <p className="text-[11px] text-slate-500 italic">&quot;{f.notes}&quot;</p>
                )}

                {f.receipt_path && (
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => handleOpenReceipt(f.receipt_path!)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Private Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Expenses List */}
      {activeTab === 'expenses' && (
        <div className="space-y-2.5">
          {expenses.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
              <Wrench className="w-8 h-8 mx-auto text-slate-300" />
              <p>No other expenses recorded yet.</p>
            </div>
          ) : (
            expenses.map((e) => (
              <div
                key={e.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{e.description}</span>
                    <div className="text-[11px] text-slate-400">
                      {e.category.replace('_', ' ')} • {e.expense_date}
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-blue-700">
                    {formatLKR(e.amount_lkr)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Paid by: <strong className="text-slate-800">{e.paid_by}</strong></span>
                  {e.receipt_path && (
                    <button
                      onClick={() => handleOpenReceipt(e.receipt_path!)}
                      className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal to Record New Fuel or Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-base text-slate-900">
                {activeTab === 'fuel' ? 'Record Fuel Refill' : 'Record Vehicle Expense'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'fuel' ? (
              <form onSubmit={handleSubmitFuel} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="Petrol 92 Octane">Petrol 92 Octane</option>
                    <option value="Petrol 95 Octane">Petrol 95 Octane</option>
                    <option value="Auto Diesel">Auto Diesel</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total LKR (Rs.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 3500.00"
                      value={fuelAmount}
                      onChange={(e) => setFuelAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Litres (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 9.5"
                      value={fuelLitres}
                      onChange={(e) => setFuelLitres(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Paid By (Name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Driver Sunil"
                      value={fuelPaidBy}
                      onChange={(e) => setFuelPaidBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Meter KM at Pump</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1540"
                      value={fuelOdometer}
                      onChange={(e) => setFuelOdometer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receipt Photo (Private Storage)</label>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600 font-semibold">
                      {receiptFile ? receiptFile.name : 'Choose or Snap Receipt'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="mt-2 w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                </div>

                {submitError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px]">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow transition active:scale-98 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Saving...' : 'Save Fuel Refill'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitExpense} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="maintenance">Maintenance / Oil Change</option>
                    <option value="spare_parts">Spare Parts</option>
                    <option value="tyres">Tyres & Tube Repair</option>
                    <option value="service">Full Service</option>
                    <option value="insurance">Insurance Renewal</option>
                    <option value="revenue_license">Revenue License</option>
                    <option value="other">Other Outlay</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine oil 20W50 + spark plug"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount LKR (Rs.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2400.00"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Paid By (Name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kamal"
                      value={expPaidBy}
                      onChange={(e) => setExpPaidBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receipt Photo (Private Storage)</label>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600 font-semibold">
                      {receiptFile ? receiptFile.name : 'Choose or Snap Receipt'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="mt-2 w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                  )}
                </div>

                {submitError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px]">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow transition active:scale-98 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Saving...' : 'Save Vehicle Expense'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Private Receipt Viewer Lightbox */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">Private Receipt Photo</span>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={viewingReceiptUrl}
              alt="Receipt"
              className="w-full max-h-[60vh] object-contain rounded-2xl border border-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
