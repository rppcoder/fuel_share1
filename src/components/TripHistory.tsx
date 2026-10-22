import React, { useState } from 'react';
import {
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Ban,
  Clock,
  ArrowRight,
  Shield,
  FileText,
  Search,
} from 'lucide-react';
import { Trip, Driver, UserRole, Vehicle } from '../types/database';
import { formatLKR, formatKM, calculateTrip } from '../lib/accounting';

interface TripHistoryProps {
  trips: Trip[];
  drivers: Driver[];
  role: UserRole;
  vehicle: Vehicle | null;
  onUpdateTrip: (tripId: string, updates: Partial<Trip>, auditReason: string) => Promise<boolean>;
  onVoidTrip: (tripId: string, reason: string) => Promise<boolean>;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  trips,
  drivers,
  role,
  onUpdateTrip,
  onVoidTrip,
}) => {
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states for editing / voiding
  const [selectedTripForEdit, setSelectedTripForEdit] = useState<Trip | null>(null);
  const [editEndKm, setEditEndKm] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedTripForVoid, setSelectedTripForVoid] = useState<Trip | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');

  const filteredTrips = trips.filter((t) => {
    if (driverFilter !== 'all' && t.driver_id !== driverFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchDriver = t.driver?.display_name?.toLowerCase().includes(q);
      const matchDate = t.trip_date?.includes(q);
      if (!matchNotes && !matchDriver && !matchDate) return false;
    }
    return true;
  });

  const handleOpenEdit = (trip: Trip) => {
    setSelectedTripForEdit(trip);
    setEditEndKm(trip.end_odometer_km ? String(trip.end_odometer_km) : '');
    setEditReason('');
    setActionError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedTripForEdit) return;
    setActionError(null);

    const end = parseFloat(editEndKm);
    if (isNaN(end) || end < selectedTripForEdit.start_odometer_km) {
      setActionError(`Ending odometer must be at least ${selectedTripForEdit.start_odometer_km} km.`);
      return;
    }
    if (!editReason.trim()) {
      setActionError('Audit reason is required for accounting corrections.');
      return;
    }

    setIsUpdating(true);
    try {
      const calc = calculateTrip(
        selectedTripForEdit.start_odometer_km,
        end,
        selectedTripForEdit.rate_per_km_snapshot
      );

      const success = await onUpdateTrip(
        selectedTripForEdit.id,
        {
          end_odometer_km: end,
          distance_km: calc.distanceKm,
          calculated_contribution: calc.calculatedContribution,
          status: 'completed',
        },
        editReason.trim()
      );

      if (success) {
        setSelectedTripForEdit(null);
      } else {
        setActionError('Failed to update trip.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating trip.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!selectedTripForVoid) return;
    if (!voidReason.trim()) {
      alert('Audit reason is required when voiding a trip.');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await onVoidTrip(selectedTripForVoid.id, voidReason.trim());
      if (success) {
        setSelectedTripForVoid(null);
      } else {
        alert('Failed to void trip.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Header & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Trip History</h2>
            <p className="text-xs text-slate-500">
              {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} listed
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by driver, date, or route note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Driver Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Driver</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
            >
              <option value="all">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="incomplete">Incomplete Drafts</option>
              <option value="void">Voided</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-300" />
          <p>No trips found matching the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTrips.map((trip) => {
            const isCompleted = trip.status === 'completed';
            const isIncomplete = trip.status === 'incomplete' || trip.status === 'draft';
            const isVoid = trip.status === 'void';

            return (
              <div
                key={trip.id}
                className={`bg-white p-4 rounded-2xl border shadow-xs transition space-y-2.5 ${
                  isIncomplete
                    ? 'border-amber-300 bg-amber-50/20'
                    : isVoid
                    ? 'border-slate-200 opacity-60 bg-slate-50'
                    : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {trip.driver?.display_name || 'Driver'}
                    </span>
                    <span className="text-[11px] text-slate-400">• {trip.trip_date}</span>
                    {trip.is_local_draft && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-bold rounded uppercase">
                        Pending Sync
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isIncomplete
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-600 line-through'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {isIncomplete && <Clock className="w-3 h-3 text-amber-600" />}
                    {isVoid && <XCircle className="w-3 h-3 text-slate-500" />}
                    <span className="capitalize">{trip.status}</span>
                  </span>
                </div>

                {/* Readings & Calculation */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Odometer</span>
                    <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                      {trip.start_odometer_km} → {trip.end_odometer_km ?? '???'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
                    <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">
                      {isCompleted ? formatKM(trip.distance_km) : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Contribution</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 block">
                      {isCompleted ? formatLKR(trip.calculated_contribution) : 'Rs. 0.00'}
                    </span>
                  </div>
                </div>

                {/* Rate Snapshot & Notes */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">
                    Rate Snapshot: Rs. {trip.rate_per_km_snapshot.toFixed(2)}/km
                  </span>
                  {trip.notes && (
                    <span className="italic truncate max-w-[200px]" title={trip.notes}>
                      &quot;{trip.notes}&quot;
                    </span>
                  )}
                </div>

                {/* Action buttons (Edit/Resolve & Void) */}
                {!isVoid && (
                  <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                    {isIncomplete && (
                      <button
                        onClick={() => handleOpenEdit(trip)}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Enter Final Reading</span>
                      </button>
                    )}

                    {role === 'admin' && (
                      <>
                        {!isIncomplete && (
                          <button
                            onClick={() => handleOpenEdit(trip)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Correct Trip"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedTripForVoid(trip);
                            setVoidReason('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Void Trip (Preserves Audit)"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Resolve Trip Modal */}
      {selectedTripForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm">
                {selectedTripForEdit.status === 'incomplete'
                  ? 'Resolve Incomplete Trip'
                  : 'Correct Trip Odometer'}
              </h3>
              <span className="text-xs text-slate-500">{selectedTripForEdit.trip_date}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 space-y-1">
                <div>
                  Driver: <strong>{selectedTripForEdit.driver?.display_name}</strong>
                </div>
                <div>
                  Starting Reading: <strong>{selectedTripForEdit.start_odometer_km} km</strong>
                </div>
                <div>
                  Rate Snapshot: <strong>Rs. {selectedTripForEdit.rate_per_km_snapshot}/km</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Finishing Odometer (KM)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder={`Min ${selectedTripForEdit.start_odometer_km}`}
                  value={editEndKm}
                  onChange={(e) => setEditEndKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Audit Correction Reason</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected forgot meter reading at depot"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedTripForEdit(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Trip Modal */}
      {selectedTripForVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-sm">Void Trip Record</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Voiding marks this trip as invalid. It will be excluded from all monthly contributions and balances. Historical audit log will record your user ID and timestamp.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Voiding (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry by driver"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedTripForVoid(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={isUpdating || !voidReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdating ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
