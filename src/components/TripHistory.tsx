import React, { useState } from 'react';
import {
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Ban,
  Trash2,
  Clock,
  ArrowRight,
  Shield,
  FileText,
  Search,
} from 'lucide-react';
import { Trip, Driver, UserRole, Vehicle, TripStatus } from '../types/database';
import { formatLKR, formatKM, calculateTrip, isAdminDriver } from '../lib/accounting';

interface TripHistoryProps {
  trips: Trip[];
  drivers: Driver[];
  role: UserRole;
  vehicle: Vehicle | null;
  onUpdateTrip: (tripId: string, updates: Partial<Trip>, auditReason: string) => Promise<boolean>;
  onVoidTrip: (tripId: string, reason: string) => Promise<boolean>;
  onDeleteTrip?: (tripId: string, reason?: string) => Promise<boolean>;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  trips,
  drivers,
  role,
  onUpdateTrip,
  onVoidTrip,
  onDeleteTrip,
}) => {
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states for editing / changing trip
  const [selectedTripForEdit, setSelectedTripForEdit] = useState<Trip | null>(null);
  const [editDriverId, setEditDriverId] = useState<string>('');
  const [editTripDate, setEditTripDate] = useState<string>('');
  const [editStartKm, setEditStartKm] = useState<string>('');
  const [editEndKm, setEditEndKm] = useState<string>('');
  const [editRatePerKm, setEditRatePerKm] = useState<string>('');
  const [editStatus, setEditStatus] = useState<TripStatus>('completed');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states for voiding trip
  const [selectedTripForVoid, setSelectedTripForVoid] = useState<Trip | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidError, setVoidError] = useState<string | null>(null);

  // Modal states for deleting trip
  const [selectedTripForDelete, setSelectedTripForDelete] = useState<Trip | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  const filteredTrips = trips.filter((t) => {
    if (isAdminDriver(t.driver, t.driver_id)) return false;
    if (driverFilter !== 'all' && t.driver_id !== driverFilter) {
      return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchDriver = (t.driver?.display_name || '').toLowerCase().includes(q);
      const matchDate = t.trip_date?.includes(q);
      if (!matchNotes && !matchDriver && !matchDate) return false;
    }
    return true;
  });

  const handleOpenEdit = (trip: Trip) => {
    setSelectedTripForEdit(trip);
    setEditDriverId(trip.driver_id);
    setEditTripDate(trip.trip_date);
    setEditStartKm(String(trip.start_odometer_km));
    setEditEndKm(trip.end_odometer_km !== null && trip.end_odometer_km !== undefined ? String(trip.end_odometer_km) : '');
    setEditRatePerKm(String(trip.rate_per_km_snapshot));
    setEditStatus(trip.status === 'incomplete' || trip.status === 'draft' ? 'completed' : trip.status);
    setEditNotes(trip.notes || '');
    setEditReason('');
    setActionError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedTripForEdit) return;
    setActionError(null);

    const start = isAdmin ? parseFloat(editStartKm) : selectedTripForEdit.start_odometer_km;
    if (isNaN(start) || start < 0) {
      setActionError('Starting odometer must be a valid non-negative number.');
      return;
    }

    const nextStatus: TripStatus = isAdmin ? editStatus : 'completed';
    const hasEndReading = editEndKm.trim() !== '';
    const end = hasEndReading ? parseFloat(editEndKm) : null;

    if (nextStatus === 'completed') {
      if (end === null || isNaN(end) || end < start) {
        setActionError(`Ending odometer must be at least ${start} km for a completed trip.`);
        return;
      }
    } else if (end !== null && (isNaN(end) || end < start)) {
      setActionError(`Ending odometer must be at least ${start} km.`);
      return;
    }

    const rate = isAdmin ? parseFloat(editRatePerKm) : selectedTripForEdit.rate_per_km_snapshot;
    if (isNaN(rate) || rate < 0) {
      setActionError('Rate per km must be a valid non-negative number.');
      return;
    }

    if (!isAdmin && !editReason.trim()) {
      setActionError('Audit reason is required for accounting corrections.');
      return;
    }

    setIsUpdating(true);
    try {
      const calc = calculateTrip(start, nextStatus === 'void' ? null : end, rate);

      const updates: Partial<Trip> = isAdmin
        ? {
            driver_id: editDriverId || selectedTripForEdit.driver_id,
            trip_date: editTripDate || selectedTripForEdit.trip_date,
            start_odometer_km: start,
            end_odometer_km: end,
            distance_km: nextStatus === 'completed' ? calc.distanceKm : 0,
            rate_per_km_snapshot: rate,
            calculated_contribution: nextStatus === 'completed' ? calc.calculatedContribution : 0,
            status: nextStatus,
            notes: editNotes.trim() || null,
          }
        : {
            end_odometer_km: end,
            distance_km: calc.distanceKm,
            calculated_contribution: calc.calculatedContribution,
            status: 'completed',
          };

      const success = await onUpdateTrip(
        selectedTripForEdit.id,
        updates,
        editReason.trim() || 'Admin edited trip record'
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
    setVoidError(null);
    if (!voidReason.trim()) {
      setVoidError('Audit reason is required when voiding a trip.');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await onVoidTrip(selectedTripForVoid.id, voidReason.trim());
      if (success) {
        setSelectedTripForVoid(null);
      } else {
        setVoidError('Failed to void trip.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTripForDelete || !onDeleteTrip) return;
    setDeleteError(null);

    setIsUpdating(true);
    try {
      const success = await onDeleteTrip(
        selectedTripForDelete.id,
        deleteReason.trim() || 'Deleted by administrator'
      );
      if (success) {
        setSelectedTripForDelete(null);
      } else {
        setDeleteError('Failed to delete trip.');
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting trip.');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalRunKmShown = filteredTrips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.distance_km || 0), 0);

  // Live preview calculation inside Edit Modal
  const previewStart = parseFloat(editStartKm) || 0;
  const previewEnd = editEndKm.trim() !== '' ? parseFloat(editEndKm) : null;
  const previewRate = parseFloat(editRatePerKm) || 0;
  const previewCalc = calculateTrip(
    previewStart,
    editStatus === 'completed' ? previewEnd : null,
    previewRate
  );

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Trip History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredTrips.length} driver trip{filteredTrips.length !== 1 ? 's' : ''} • Driver Run:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{formatKM(totalRunKmShown)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
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
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
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
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p>No trips found matching the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTrips.map((trip) => {
            const isCompleted = trip.status === 'completed';
            const isIncomplete = trip.status === 'incomplete' || trip.status === 'draft';
            const isVoid = trip.status === 'void';
            const isAdminRun = isAdminDriver(trip.driver, trip.driver_id);

            return (
              <div
                key={trip.id}
                className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-xs transition space-y-2.5 ${
                  isIncomplete
                    ? 'border-amber-300 bg-amber-50/20 dark:border-amber-700/60 dark:bg-amber-950/20'
                    : isVoid
                    ? 'border-slate-200 dark:border-slate-700 opacity-60 bg-slate-50 dark:bg-slate-900/50'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {isAdminRun ? 'Admin' : trip.driver?.display_name || 'Driver'}
                    </span>
                    {isAdminRun && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded border border-slate-200 uppercase">
                        Admin Run
                      </span>
                    )}
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
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : isIncomplete
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 line-through'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    {isIncomplete && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                    {isVoid && <XCircle className="w-3 h-3 text-slate-500" />}
                    <span className="capitalize">{trip.status}</span>
                  </span>
                </div>

                {/* Readings & Calculation */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Odometer</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {trip.start_odometer_km} → {trip.end_odometer_km ?? '???'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {isCompleted ? formatKM(trip.distance_km) : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Contribution</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                      {isAdminRun ? 'Rs. 0.00 (Admin)' : isCompleted ? formatLKR(trip.calculated_contribution) : 'Rs. 0.00'}
                    </span>
                  </div>
                </div>

                {/* Rate Snapshot & Notes */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono">
                    {isAdminRun
                      ? 'Added to Total Run KM (No driver fee)'
                      : `Rate Snapshot: Rs. ${trip.rate_per_km_snapshot.toFixed(2)}/km`}
                  </span>
                  {trip.notes && (
                    <span className="italic truncate max-w-[200px]" title={trip.notes}>
                      &quot;{trip.notes}&quot;
                    </span>
                  )}
                </div>

                {/* Action buttons (Resolve / Edit / Change / Void / Delete) */}
                {(isIncomplete || isAdmin) && (
                  <div className="pt-1.5 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                    {isIncomplete && !isVoid && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(trip)}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Enter Final Reading</span>
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(trip)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-lg transition"
                          title="Edit or Change Trip Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {!isVoid && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTripForVoid(trip);
                              setVoidReason('');
                              setVoidError(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                            title="Void Trip (Preserves Audit)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDeleteTrip && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTripForDelete(trip);
                              setDeleteReason('');
                              setDeleteError(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Trip Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Change / Resolve Trip Modal */}
      {selectedTripForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm">
                {isAdmin
                  ? 'Edit / Change Driver Trip'
                  : selectedTripForEdit.status === 'incomplete'
                  ? 'Resolve Incomplete Trip'
                  : 'Correct Trip Odometer'}
              </h3>
              <span className="text-xs text-slate-500">{selectedTripForEdit.trip_date}</span>
            </div>

            <div className="space-y-3 text-xs">
              {isAdmin ? (
                <>
                  {/* Admin full edit fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Driver
                      </label>
                      <select
                        value={editDriverId}
                        onChange={(e) => setEditDriverId(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.display_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Trip Date
                      </label>
                      <input
                        type="date"
                        value={editTripDate}
                        onChange={(e) => setEditTripDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Start Odometer (KM)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={editStartKm}
                        onChange={(e) => setEditStartKm(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Finish Odometer (KM)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder={`Min ${editStartKm || 0}`}
                        value={editEndKm}
                        onChange={(e) => setEditEndKm(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Rate Snapshot (Rs./KM)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editRatePerKm}
                        onChange={(e) => setEditRatePerKm(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Trip Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TripStatus)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="completed">Completed</option>
                        <option value="incomplete">Incomplete</option>
                        <option value="void">Voided</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Route / Trip Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional route note..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Live Recalculation Preview */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        New Distance
                      </span>
                      <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100">
                        {formatKM(previewCalc.distanceKm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        New Contribution
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatLKR(previewCalc.calculatedContribution)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-300 space-y-1">
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
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Finishing Odometer (KM)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder={`Min ${selectedTripForEdit.start_odometer_km}`}
                      value={editEndKm}
                      onChange={(e) => setEditEndKm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Audit Correction Reason {isAdmin ? '(Optional)' : '(Required)'}</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Updated driver or corrected odometer reading"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedTripForEdit(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Trip Modal */}
      {selectedTripForVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-sm">Void Trip Record</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Voiding marks this trip as invalid. It will be excluded from all monthly contributions and balances while keeping an audit record.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Voiding (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry by driver"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {voidError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{voidError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedTripForVoid(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isUpdating || !voidReason.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdating ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Trip Modal */}
      {selectedTripForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm">Delete Driver Trip</h3>
            </div>

            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/70 dark:border-rose-800/60 text-xs space-y-1 text-slate-700 dark:text-slate-200">
              <div>
                Driver: <strong>{selectedTripForDelete.driver?.display_name || 'Driver'}</strong>
              </div>
              <div>
                Date: <strong>{selectedTripForDelete.trip_date}</strong>
              </div>
              <div>
                Odometer: <strong>{selectedTripForDelete.start_odometer_km} → {selectedTripForDelete.end_odometer_km ?? '???'} km</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently remove this trip record and recalculate monthly mileage and driver contributions.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Deletion (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Entered by mistake"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedTripForDelete(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdating ? 'Deleting...' : 'Delete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

