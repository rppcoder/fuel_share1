import React, { useState, useEffect } from 'react';
import {
  Gauge,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Save,
  HelpCircle,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';
import { Driver, Vehicle, ContributionRate, Trip } from '../types/database';
import { calculateTrip, formatLKR, formatKM } from '../lib/accounting';

interface RecordTripProps {
  vehicle: Vehicle | null;
  drivers: Driver[];
  activeRate: ContributionRate | null;
  lastOdometer: number;
  onSaveTrip: (tripData: Partial<Trip>) => Promise<boolean>;
  onNavigate: (screen: string) => void;
}

export const RecordTrip: React.FC<RecordTripProps> = ({
  vehicle,
  drivers,
  activeRate,
  lastOdometer,
  onSaveTrip,
  onNavigate,
}) => {
  const [driverId, setDriverId] = useState<string>('');
  const [tripDate, setTripDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [startKm, setStartKm] = useState<string>(String(lastOdometer || 0));
  const [endKm, setEndKm] = useState<string>('');
  const [isIncompleteDraft, setIsIncompleteDraft] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Set default driver if available
  useEffect(() => {
    if (drivers.length > 0 && !driverId) {
      setDriverId(drivers[0].id);
    }
  }, [drivers, driverId]);

  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  // Keep startKm synced with last known odometer if user hasn't manually overridden
  useEffect(() => {
    if (lastOdometer !== undefined && !isManualOverride) {
      setStartKm(String(lastOdometer));
    }
  }, [lastOdometer, isManualOverride]);

  const numStart = parseFloat(startKm) || 0;
  const numEnd = isIncompleteDraft || !endKm ? null : parseFloat(endKm);
  const currentRate = activeRate?.amount_per_km || 35.0; // Standard Sri Lankan default Rs. 35/km

  const calculation = calculateTrip(numStart, numEnd, currentRate);
  const isStartOverridden = lastOdometer > 0 && Math.abs(numStart - lastOdometer) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!driverId) {
      setSubmitError('Please select a driver.');
      return;
    }
    if (numStart < 0) {
      setSubmitError('Starting odometer cannot be negative.');
      return;
    }
    if (!isIncompleteDraft && (numEnd === null || numEnd < numStart)) {
      setSubmitError(`Finishing odometer must be equal or greater than starting odometer (${numStart} km).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const tripPayload: Partial<Trip> = {
        vehicle_id: vehicle?.id || '',
        driver_id: driverId,
        trip_date: tripDate,
        start_odometer_km: numStart,
        end_odometer_km: isIncompleteDraft ? null : numEnd,
        distance_km: isIncompleteDraft ? 0 : calculation.distanceKm,
        rate_per_km_snapshot: currentRate,
        calculated_contribution: isIncompleteDraft ? 0 : calculation.calculatedContribution,
        status: isIncompleteDraft ? 'incomplete' : 'completed',
        notes: notes.trim() || null,
      };

      const success = await onSaveTrip(tripPayload);
      if (success) {
        setSubmitSuccess(true);
        // Reset form for next trip
        if (!isIncompleteDraft && numEnd !== null) {
          setStartKm(String(numEnd));
        }
        setEndKm('');
        setNotes('');
        setIsIncompleteDraft(false);
        setIsManualOverride(false);

        setTimeout(() => {
          setSubmitSuccess(false);
          onNavigate('trips');
        }, 1500);
      } else {
        setSubmitError('Failed to record trip. Please check your connection.');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error saving trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Record Three-Wheeler Trip</h2>
          <p className="text-xs text-slate-500">Live odometer tracking & rate calculation</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Rate</span>
          <span className="text-xs font-black text-emerald-700 font-mono">
            Rs. {currentRate.toFixed(2)}/km
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Driver Selection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-700" />
            <span>Driver</span>
          </label>
          {drivers.length === 0 ? (
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900">
              No drivers found. Add drivers in Settings first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {drivers.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => setDriverId(d.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between ${
                    driverId === d.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{d.display_name}</span>
                  {driverId === d.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trip Date */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Trip Date</span>
          </label>
          <input
            type="date"
            required
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {/* Odometer Readings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-700" />
              <span>Odometer Readings (KM)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Last saved: <strong className="font-mono text-slate-700">{lastOdometer} km</strong>
            </span>
          </div>

          {/* Starting KM */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
              <span>Starting Odometer</span>
              {isStartOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    setStartKm(String(lastOdometer));
                    setIsManualOverride(false);
                  }}
                  className="text-[10px] text-amber-700 hover:text-amber-900 underline font-bold flex items-center gap-1"
                  title="Click to reset to vehicle's last saved odometer"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Reset to {lastOdometer} km</span>
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.1"
              required
              inputMode="decimal"
              value={startKm}
              onChange={(e) => {
                setStartKm(e.target.value);
                setIsManualOverride(true);
              }}
              className={`w-full px-4 py-3 rounded-xl border font-mono text-lg font-bold focus:outline-none focus:ring-2 ${
                isStartOverridden
                  ? 'border-amber-400 bg-amber-50/40 text-amber-950 focus:ring-amber-500'
                  : 'border-slate-300 bg-white text-slate-900 focus:ring-emerald-600'
              }`}
            />
          </div>

          {/* Finishing KM or Incomplete Draft Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Finishing Odometer</span>
              <button
                type="button"
                onClick={() => setIsIncompleteDraft(!isIncompleteDraft)}
                className={`text-[11px] font-bold transition flex items-center gap-1 ${
                  isIncompleteDraft ? 'text-amber-700 underline' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileQuestion className="w-3 h-3" />
                <span>{isIncompleteDraft ? 'Draft Mode Active' : 'Forgot / Unknown?'}</span>
              </button>
            </div>

            {!isIncompleteDraft ? (
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder={`e.g. ${(numStart + 15).toFixed(1)}`}
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border font-mono text-lg font-bold focus:outline-none focus:ring-2 ${
                  !calculation.isValid && endKm
                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:ring-emerald-600'
                }`}
              />
            ) : (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Saving as Incomplete Draft</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Trip will be saved with starting reading ({numStart} km). It will NOT be billed or added to confirmed totals until the finishing reading is entered by an administrator.
                </p>
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {!calculation.isValid && calculation.errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{calculation.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Calculation Preview Card */}
        {!isIncompleteDraft && numEnd !== null && calculation.isValid && (
          <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-200 font-semibold border-b border-emerald-800 pb-2">
              <span>Live Trip Calculation</span>
              <span>Snapshot Rate: Rs. {currentRate.toFixed(2)}/km</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/60">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Distance</span>
                <span className="text-xl font-mono font-black text-white mt-1 block">
                  {formatKM(calculation.distanceKm)}
                </span>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/60">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Contribution</span>
                <span className="text-xl font-mono font-black text-amber-400 mt-1 block">
                  {formatLKR(calculation.calculatedContribution)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Optional Notes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Notes / Route (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Colombo Fort to Rajagiriya return"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {/* Submit Alerts */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Trip recorded successfully!</span>
          </div>
        )}

        {/* Big Action Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !calculation.isValid || !driverId}
          className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Trip...</span>
            </>
          ) : isIncompleteDraft ? (
            <>
              <Save className="w-4 h-4" />
              <span>Save Incomplete Draft</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Record Trip ({formatLKR(calculation.calculatedContribution)})</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
