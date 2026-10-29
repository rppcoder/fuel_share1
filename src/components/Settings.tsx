import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Car,
  Users,
  Percent,
  Shield,
  Plus,
  CheckCircle2,
  Lock,
  AlertTriangle,
  KeyRound,
  Delete,
  Trash2,
  Edit2,
  Save,
  X,
  Sun,
  Moon,
  Gauge,
  Calendar,
  Ban,
  Search,
  FileText,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  Vehicle,
  Driver,
  ContributionRate,
  UserRole,
  Trip,
  MonthSummaryReport,
} from '../types/database';
import { formatKM, calculateTrip } from '../lib/accounting';
import { getFromStorage, saveToStorage } from '../lib/persistence';

interface SettingsProps {
  vehicle: Vehicle | null;
  drivers: Driver[];
  activeRate: ContributionRate | null;
  ratesHistory: ContributionRate[];
  role: UserRole;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onUpdateRole: (role: UserRole) => void;
  onUpdateVehicle: (updates: Partial<Vehicle>) => Promise<boolean>;
  onAddDriver: (driver: Partial<Driver>) => Promise<boolean>;
  onUpdateDriver: (driverId: string, updates: Partial<Driver>) => Promise<boolean>;
  onDeleteDriver: (driverId: string) => Promise<boolean>;
  onSetNewRate: (ratePerKm: number, effectiveFrom: string) => Promise<boolean>;
  adminTrips?: Trip[];
  monthlyReport?: MonthSummaryReport;
  onSaveAdminTrip?: (tripData: Partial<Trip>) => Promise<boolean>;
  onUpdateTrip?: (tripId: string, updates: Partial<Trip>, auditReason: string) => Promise<boolean>;
  onVoidTrip?: (tripId: string, reason: string) => Promise<boolean>;
  onOpenSupabaseConfig: () => void;
  onOpenQASuite: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  vehicle,
  drivers,
  activeRate,
  role,
  theme = 'light',
  onToggleTheme,
  onUpdateRole,
  onUpdateVehicle,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onSetNewRate,
  adminTrips = [],
  monthlyReport,
  onSaveAdminTrip,
  onUpdateTrip,
  onVoidTrip,
}) => {
  // 6-Digit Admin Passcode Gate state
  const [storedPasscode, setStoredPasscode] = useState<string>(() => {
    const saved = getFromStorage<string>('adminPasscode', '583027');
    if (!saved || saved === '123456') {
      saveToStorage('adminPasscode', '583027');
      return '583027';
    }
    return saved;
  });
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(false);
  const [passcodeEntry, setPasscodeEntry] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Change 6-Digit Passcode state
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Vehicle edit state
  const [vehicleName, setVehicleName] = useState(vehicle?.name || 'Three-Wheeler');
  const [regId, setRegId] = useState(vehicle?.registration_identifier || 'WP AB-1234');
  const [vehicleOdometer, setVehicleOdometer] = useState(
    vehicle ? String(vehicle.current_odometer_km) : '0'
  );
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleSaveSuccess, setVehicleSaveSuccess] = useState(false);

  // Admin Trip recording state
  const [adminTripDate, setAdminTripDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [adminStartKm, setAdminStartKm] = useState<string>(
    vehicle ? String(vehicle.current_odometer_km) : '0'
  );
  const [adminEndKm, setAdminEndKm] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isAdminManualStart, setIsAdminManualStart] = useState<boolean>(false);
  const [isSavingAdminTrip, setIsSavingAdminTrip] = useState<boolean>(false);
  const [adminTripSuccess, setAdminTripSuccess] = useState<boolean>(false);
  const [adminTripError, setAdminTripError] = useState<string | null>(null);

  // Separate Admin Trips section filter & edit/void state
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');
  const [selectedAdminTripForEdit, setSelectedAdminTripForEdit] = useState<Trip | null>(null);
  const [adminEditEndKm, setAdminEditEndKm] = useState<string>('');
  const [adminEditReason, setAdminEditReason] = useState<string>('');
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [isUpdatingAdminTrip, setIsUpdatingAdminTrip] = useState<boolean>(false);
  const [selectedAdminTripForVoid, setSelectedAdminTripForVoid] = useState<Trip | null>(null);
  const [adminVoidReason, setAdminVoidReason] = useState<string>('');

  // Rate edit state
  const [newRate, setNewRate] = useState<string>(
    activeRate ? String(activeRate.amount_per_km) : '35.00'
  );
  const [rateEffectiveDate, setRateEffectiveDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [rateSaveSuccess, setRateSaveSuccess] = useState(false);

  // New Driver state
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverWhatsApp, setNewDriverWhatsApp] = useState('07');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // Edit Driver state
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');

  useEffect(() => {
    if (vehicle) {
      setVehicleName(vehicle.name);
      setRegId(vehicle.registration_identifier);
      setVehicleOdometer(String(vehicle.current_odometer_km));
      if (!isAdminManualStart) {
        setAdminStartKm(String(vehicle.current_odometer_km));
      }
    }
  }, [vehicle, isAdminManualStart]);

  useEffect(() => {
    if (activeRate) {
      setNewRate(String(activeRate.amount_per_km));
      if (activeRate.effective_from) {
        setRateEffectiveDate(activeRate.effective_from);
      }
    }
  }, [activeRate]);

  const isAdmin = role === 'admin';

  const lastOdometer = vehicle?.current_odometer_km || 0;
  const parsedAdminStart = parseFloat(adminStartKm) || 0;
  const parsedAdminEnd = adminEndKm ? parseFloat(adminEndKm) : null;
  const adminRunDistance =
    parsedAdminEnd !== null && !isNaN(parsedAdminEnd) && parsedAdminEnd >= parsedAdminStart
      ? Math.round((parsedAdminEnd - parsedAdminStart) * 100) / 100
      : 0;
  const isAdminEndInvalid =
    parsedAdminEnd !== null && !isNaN(parsedAdminEnd) && parsedAdminEnd < parsedAdminStart;

  const filteredAdminTrips = adminTrips.filter((t) => {
    if (adminStatusFilter !== 'all' && t.status !== adminStatusFilter) return false;
    if (adminSearchQuery) {
      const q = adminSearchQuery.toLowerCase();
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchDate = t.trip_date?.includes(q);
      if (!matchNotes && !matchDate) return false;
    }
    return true;
  });

  const totalCompletedAdminKm = filteredAdminTrips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.distance_km || 0), 0);

  const handleOpenEditAdminTrip = (trip: Trip) => {
    setSelectedAdminTripForEdit(trip);
    setAdminEditEndKm(trip.end_odometer_km ? String(trip.end_odometer_km) : '');
    setAdminEditReason('');
    setAdminActionError(null);
  };

  const handleSaveEditAdminTrip = async () => {
    if (!selectedAdminTripForEdit || !onUpdateTrip) return;
    setAdminActionError(null);

    const end = parseFloat(adminEditEndKm);
    if (isNaN(end) || end < selectedAdminTripForEdit.start_odometer_km) {
      setAdminActionError(
        `Ending odometer must be at least ${selectedAdminTripForEdit.start_odometer_km} km.`
      );
      return;
    }
    if (!adminEditReason.trim()) {
      setAdminActionError('Audit reason is required for correcting an admin run.');
      return;
    }

    setIsUpdatingAdminTrip(true);
    try {
      const calc = calculateTrip(selectedAdminTripForEdit.start_odometer_km, end, 0);
      const success = await onUpdateTrip(
        selectedAdminTripForEdit.id,
        {
          end_odometer_km: end,
          distance_km: calc.distanceKm,
          calculated_contribution: 0,
          status: 'completed',
        },
        adminEditReason.trim()
      );
      if (success) {
        setSelectedAdminTripForEdit(null);
      } else {
        setAdminActionError('Failed to update admin run.');
      }
    } catch (err: unknown) {
      setAdminActionError(err instanceof Error ? err.message : 'Error updating admin run.');
    } finally {
      setIsUpdatingAdminTrip(false);
    }
  };

  const handleConfirmVoidAdminTrip = async () => {
    if (!selectedAdminTripForVoid || !onVoidTrip) return;
    if (!adminVoidReason.trim()) return;

    setIsUpdatingAdminTrip(true);
    try {
      const success = await onVoidTrip(selectedAdminTripForVoid.id, adminVoidReason.trim());
      if (success) {
        setSelectedAdminTripForVoid(null);
      }
    } finally {
      setIsUpdatingAdminTrip(false);
    }
  };

  const handleRecordAdminTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminTripError(null);

    if (!isAdmin) {
      setAdminTripError('Only administrators can record admin trips.');
      return;
    }
    if (parsedAdminStart < 0) {
      setAdminTripError('Starting odometer cannot be negative.');
      return;
    }
    if (parsedAdminEnd === null || isNaN(parsedAdminEnd) || parsedAdminEnd < parsedAdminStart) {
      setAdminTripError(
        `Finishing odometer must be equal or greater than starting odometer (${parsedAdminStart} km).`
      );
      return;
    }
    if (!onSaveAdminTrip) return;

    setIsSavingAdminTrip(true);
    try {
      const success = await onSaveAdminTrip({
        vehicle_id: vehicle?.id || '',
        trip_date: adminTripDate,
        start_odometer_km: parsedAdminStart,
        end_odometer_km: parsedAdminEnd,
        distance_km: adminRunDistance,
        rate_per_km_snapshot: 0,
        calculated_contribution: 0,
        status: 'completed',
        notes: adminNotes.trim() || 'Admin vehicle run',
      });

      if (success) {
        setAdminTripSuccess(true);
        setAdminStartKm(String(parsedAdminEnd));
        setAdminEndKm('');
        setAdminNotes('');
        setIsAdminManualStart(false);
        setTimeout(() => setAdminTripSuccess(false), 3000);
      } else {
        setAdminTripError('Failed to record admin run.');
      }
    } finally {
      setIsSavingAdminTrip(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access Denied: Only administrators can update vehicle details.');
      return;
    }

    setIsSavingVehicle(true);
    try {
      const success = await onUpdateVehicle({
        name: vehicleName.trim(),
        registration_identifier: regId.trim(),
        current_odometer_km: parseFloat(vehicleOdometer) || 0,
      });
      if (success) {
        setVehicleSaveSuccess(true);
        setTimeout(() => setVehicleSaveSuccess(false), 3000);
      }
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access Denied: Only administrators can set contribution rates.');
      return;
    }

    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Please enter a positive rate per kilometre.');
      return;
    }

    setIsSavingRate(true);
    try {
      const success = await onSetNewRate(rateNum, rateEffectiveDate);
      if (success) {
        setRateSaveSuccess(true);
        setTimeout(() => setRateSaveSuccess(false), 3000);
      }
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!newDriverName.trim()) {
      alert('Driver name is required.');
      return;
    }

    setIsAddingDriver(true);
    try {
      const success = await onAddDriver({
        display_name: newDriverName.trim(),
        whatsapp_number: newDriverWhatsApp.trim(),
        active: true,
      });

      if (success) {
        setNewDriverName('');
        setNewDriverWhatsApp('07');
        setShowAddDriver(false);
      }
    } finally {
      setIsAddingDriver(false);
    }
  };

  const startEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setEditName(driver.display_name);
    setEditWhatsApp(driver.whatsapp_number || '');
  };

  const saveEditDriver = async (driverId: string) => {
    await onUpdateDriver(driverId, { display_name: editName, whatsapp_number: editWhatsApp });
    setEditingDriverId(null);
  };

  const verifyPasscodeValue = (candidate: string) => {
    if (candidate === storedPasscode) {
      setIsPasscodeUnlocked(true);
      setPasscodeEntry('');
      setPasscodeError(null);
      if (role !== 'admin') {
        onUpdateRole('admin');
      }
    } else {
      setPasscodeError('Invalid 6-digit passcode. Please try again.');
      setPasscodeEntry('');
    }
  };

  const handlePasscodeDigit = (digit: string) => {
    if (passcodeEntry.length >= 6) return;
    setPasscodeError(null);
    const nextValue = passcodeEntry + digit;
    setPasscodeEntry(nextValue);
    if (nextValue.length === 6) {
      verifyPasscodeValue(nextValue);
    }
  };

  const handlePasscodeBackspace = () => {
    setPasscodeError(null);
    setPasscodeEntry((prev) => prev.slice(0, -1));
  };

  const handlePasscodeClear = () => {
    setPasscodeError(null);
    setPasscodeEntry('');
  };

  const handlePasscodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPasscodeError(null);
    setPasscodeEntry(digitsOnly);
    if (digitsOnly.length === 6) {
      verifyPasscodeValue(digitsOnly);
    }
  };

  const handleLockAdminPanel = () => {
    setIsPasscodeUnlocked(false);
    setPasscodeEntry('');
    setPasscodeError(null);
  };

  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage(null);

    if (currentPinInput !== storedPasscode) {
      setPinChangeMessage({
        type: 'error',
        text: 'Current 6-digit passcode is incorrect.',
      });
      return;
    }

    if (!/^\d{6}$/.test(newPinInput)) {
      setPinChangeMessage({
        type: 'error',
        text: 'New passcode must be exactly 6 numeric digits (0-9).',
      });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinChangeMessage({
        type: 'error',
        text: 'New passcode and confirmation do not match.',
      });
      return;
    }

    saveToStorage('adminPasscode', newPinInput);
    setStoredPasscode(newPinInput);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinChangeMessage({
      type: 'success',
      text: '6-digit admin passcode updated successfully!',
    });
  };

  // Render 6-Digit Passcode Login Screen when locked
  if (!isPasscodeUnlocked) {
    return (
      <div className="space-y-4 pb-24 max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200/80 dark:border-emerald-700">
            <KeyRound className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Admin Panel Login
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your 6-digit passcode to unlock the Admin Panel
            </p>
          </div>

          {/* 6-Digit Passcode Boxes + Accessible Keyboard Input */}
          <label className="block cursor-pointer relative">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={passcodeEntry}
              onChange={handlePasscodeInputChange}
              aria-label="6-digit admin passcode"
              className="sr-only"
            />
            <div className="grid grid-cols-6 gap-2 max-w-[270px] mx-auto">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = index < passcodeEntry.length;
                const isActive = index === passcodeEntry.length;
                return (
                  <div
                    key={index}
                    className={`h-12 rounded-xl border-2 flex items-center justify-center font-mono text-lg font-extrabold transition ${
                      isFilled
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : isActive
                        ? 'border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    {isFilled ? '●' : ''}
                  </div>
                );
              })}
            </div>
          </label>

          {passcodeError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{passcodeError}</span>
            </div>
          )}




        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Admin Panel</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
              /admin
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Admin driving, admin trips, vehicle details & settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLockAdminPanel}
            title="Lock Admin Panel"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-600 text-[11px] font-bold flex items-center gap-1 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            <SettingsIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin Privilege Restriction Banner */}
      {!isAdmin ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>Read-Only Mode (Driver Session)</span>
            </h4>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Only the <strong>Administrator</strong> has authority to edit settings, update vehicle profiles, add drivers, or modify contribution rates per Km.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
          <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Administrator privileges active. You have full edit authority for all system settings.</span>
        </div>
      )}

      {/* ADMIN DRIVING / RECORD ADMIN RUN KM */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-emerald-600/30 dark:border-emerald-500/40 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Admin Driving (Record Run KM)</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Log your own trips here — added directly to Total Run KM (no driver charge)
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono shrink-0">
            Odo: {lastOdometer} km
          </span>
        </div>

        {/* Monthly Total Run KM Breakdown */}
        {monthlyReport && (
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Drivers KM</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {formatKM(monthlyReport.driverDistanceKm ?? 0)}
              </span>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-700 px-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                Admin KM
              </span>
              <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {formatKM(monthlyReport.adminDistanceKm ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-900 dark:text-slate-100 block">
                Total Run KM
              </span>
              <span className="text-xs font-mono font-black text-slate-900 dark:text-white mt-0.5 block">
                {formatKM(monthlyReport.totalDistanceKm)}
              </span>
            </div>
          </div>
        )}

        {/* Record Admin Trip Form */}
        <form onSubmit={handleRecordAdminTrip} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-700" />
                <span>Trip Date</span>
              </label>
              <input
                type="date"
                required
                disabled={!isAdmin}
                value={adminTripDate}
                onChange={(e) => setAdminTripDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. Personal run"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Start Odometer
                </label>
                {Math.abs(parsedAdminStart - lastOdometer) > 0.01 && lastOdometer > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminStartKm(String(lastOdometer));
                      setIsAdminManualStart(false);
                    }}
                    className="text-[10px] text-amber-700 underline font-bold"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                required
                inputMode="decimal"
                disabled={!isAdmin}
                value={adminStartKm}
                onChange={(e) => {
                  setAdminStartKm(e.target.value);
                  setIsAdminManualStart(true);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Finish Odometer
              </label>
              <input
                type="number"
                step="0.1"
                required
                inputMode="decimal"
                disabled={!isAdmin}
                placeholder={`e.g. ${(parsedAdminStart + 10).toFixed(1)}`}
                value={adminEndKm}
                onChange={(e) => setAdminEndKm(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border font-mono font-bold disabled:bg-slate-100 ${
                  isAdminEndInvalid
                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                }`}
              />
            </div>
          </div>

          {adminTripError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{adminTripError}</span>
            </div>
          )}

          {adminTripSuccess && (
            <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Admin trip recorded & added to Total Run KM!</span>
            </div>
          )}

          {isAdmin ? (
            <button
              type="submit"
              disabled={isSavingAdminTrip || isAdminEndInvalid || !adminEndKm}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavingAdminTrip
                  ? 'Recording Admin Run...'
                  : adminRunDistance > 0
                  ? `Record Admin Run (+${formatKM(adminRunDistance)} to Total Run)`
                  : 'Record Admin Run'}
              </span>
            </button>
          ) : (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Only administrators can record admin trips</span>
            </div>
          )}
        </form>
      </div>

      {/* SEPARATE ADMIN TRIPS / RUN HISTORY SECTION (Excluded from regular "Trips" tab) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Admin Trips (Run History)</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredAdminTrips.length} admin run{filteredAdminTrips.length !== 1 ? 's' : ''} • Total Admin Run:{' '}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                {formatKM(totalCompletedAdminKm)}
              </strong>
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
            Admin Only
          </span>
        </div>

        {/* Search & Status Filter for Admin Runs */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="col-span-2 relative">
            <input
              type="text"
              placeholder="Search date or route note..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
          <div>
            <select
              value={adminStatusFilter}
              onChange={(e) => setAdminStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="void">Voided</option>
            </select>
          </div>
        </div>

        {/* Admin Trips List */}
        {filteredAdminTrips.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-center text-slate-400 text-xs space-y-1.5">
            <FileText className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
            <p>No admin runs recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
            {filteredAdminTrips.map((trip) => {
              const isCompleted = trip.status === 'completed';
              const isIncomplete = trip.status === 'incomplete' || trip.status === 'draft';
              const isVoid = trip.status === 'void';

              return (
                <div
                  key={trip.id}
                  className={`p-3 rounded-xl border transition space-y-2 ${
                    isVoid
                      ? 'border-slate-200 dark:border-slate-700 opacity-60 bg-slate-50 dark:bg-slate-900/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {trip.trip_date}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold rounded uppercase">
                        Admin Run
                      </span>
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

                  <div className="grid grid-cols-2 gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Odometer
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {trip.start_odometer_km} → {trip.end_odometer_km ?? '???'} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Added to Total Run
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                        {isCompleted ? `+${formatKM(trip.distance_km)}` : '0 km'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="italic truncate max-w-[210px]">
                      {trip.notes ? `"${trip.notes}"` : 'Added to Total Run KM (No driver fee)'}
                    </span>

                    {!isVoid && isAdmin && (onUpdateTrip || onVoidTrip) && (
                      <div className="flex items-center gap-1">
                        {onUpdateTrip && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditAdminTrip(trip)}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition"
                            title="Edit Admin Run Odometer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onVoidTrip && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAdminTripForVoid(trip);
                              setAdminVoidReason('');
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Void Admin Run"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Admin Run Modal */}
      {selectedAdminTripForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm">Correct Admin Run Odometer</h3>
              <span className="text-xs text-slate-500">{selectedAdminTripForEdit.trip_date}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-300 space-y-1">
                <div>
                  Starting Reading: <strong>{selectedAdminTripForEdit.start_odometer_km} km</strong>
                </div>
                <div>
                  Billing: <strong>Added to Total Run KM (No driver fee)</strong>
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
                  placeholder={`Min ${selectedAdminTripForEdit.start_odometer_km}`}
                  value={adminEditEndKm}
                  onChange={(e) => setAdminEditEndKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Audit Correction Reason</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Updated ending odometer reading"
                  value={adminEditReason}
                  onChange={(e) => setAdminEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {adminActionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{adminActionError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedAdminTripForEdit(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditAdminTrip}
                disabled={isUpdatingAdminTrip}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdatingAdminTrip ? 'Saving...' : 'Save & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Admin Run Modal */}
      {selectedAdminTripForVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-sm">Void Admin Run</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Voiding marks this admin run as invalid and removes its distance from Total Run KM.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Voiding (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate admin run entry"
                value={adminVoidReason}
                onChange={(e) => setAdminVoidReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedAdminTripForVoid(null)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidAdminTrip}
                disabled={isUpdatingAdminTrip || !adminVoidReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {isUpdatingAdminTrip ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Switcher (Simulating Admin vs Driver) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>Active Session Role</span>
          </label>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
            isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {role}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Switch role to test access controls. In driver mode, administrative setting edits are strictly locked.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => onUpdateRole('admin')}
            className={`py-2 px-3 rounded-xl border transition ${
              role === 'admin'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Administrator
          </button>
          <button
            type="button"
            onClick={() => onUpdateRole('driver')}
            className={`py-2 px-3 rounded-xl border transition ${
              role === 'driver'
                ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Driver (Read-Only)
          </button>
        </div>
      </div>

      {/* App Theme & Appearance Toggle */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>App Theme & Appearance</span>
          </label>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Switch between crisp light mode and high-contrast dark mode using standard Tailwind theme styles.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => onToggleTheme && onToggleTheme()}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition ${
              theme === 'light'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs font-extrabold'
                : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme && onToggleTheme()}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition ${
              theme === 'dark'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-extrabold'
                : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-300" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Security: 6-Digit Admin Passcode */}
      <form
        onSubmit={handleSaveNewPasscode}
        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Admin 6-Digit Passcode</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
            6-Digit PIN
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Update the 6-digit numeric passcode required to unlock the Admin Panel.
        </p>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={!isAdmin}
              placeholder="••••••"
              value={currentPinInput}
              onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 font-mono font-bold text-center tracking-widest disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              New 6-Digit
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={!isAdmin}
              placeholder="••••••"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 font-mono font-bold text-center tracking-widest disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={!isAdmin}
              placeholder="••••••"
              value={confirmPinInput}
              onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 font-mono font-bold text-center tracking-widest disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>

        {pinChangeMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              pinChangeMessage.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {pinChangeMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{pinChangeMessage.text}</span>
          </div>
        )}

        {isAdmin && (
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Update 6-Digit Passcode
          </button>
        )}
      </form>

      {/* Vehicle Profile */}
      <form onSubmit={handleSaveVehicle} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-4 h-4 text-emerald-700" />
            <span>Vehicle Details</span>
          </h3>
          {!isAdmin && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              <Lock className="w-3 h-3" /> Admin Only
            </span>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Vehicle Name</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Registration #</label>
              <input
                type="text"
                disabled={!isAdmin}
                placeholder="e.g. WP AB-7890"
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Odometer (KM)</label>
              <input
                type="number"
                step="0.1"
                disabled={!isAdmin}
                value={vehicleOdometer}
                onChange={(e) => setVehicleOdometer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {vehicleSaveSuccess && (
          <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Vehicle updated successfully!</span>
          </div>
        )}

        {isAdmin ? (
          <button
            type="submit"
            disabled={isSavingVehicle}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSavingVehicle ? 'Saving...' : 'Save Vehicle Changes'}
          </button>
        ) : (
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Only administrators can update vehicle details</span>
          </div>
        )}
      </form>

      {/* Driver Profiles Management */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Driver Profiles</span>
          </h3>
          {isAdmin ? (
            <button
              onClick={() => setShowAddDriver(!showAddDriver)}
              className="flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Driver</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              <Lock className="w-3 h-3" /> Admin Only
            </span>
          )}
        </div>

        {/* Add Driver inline form */}
        {showAddDriver && isAdmin && (
          <form onSubmit={handleAddDriverSubmit} className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ruwan Silva"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="tel"
                placeholder="e.g. 0771234567"
                value={newDriverWhatsApp}
                onChange={(e) => setNewDriverWhatsApp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddDriver(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingDriver}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
              >
                {isAddingDriver ? 'Adding...' : 'Save Driver'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Drivers */}
        <div className="space-y-2 text-xs">
          {drivers.map((d) => (
            <div
              key={d.id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2"
            >
              {editingDriverId === d.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300"
                  />
                  <input
                    type="tel"
                    value={editWhatsApp}
                    onChange={(e) => setEditWhatsApp(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEditDriver(d.id)} className="p-1.5 bg-emerald-700 text-white rounded"><Save className="w-3 h-3" /></button>
                    <button onClick={() => setEditingDriverId(null)} className="p-1.5 bg-slate-300 text-slate-700 rounded"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{d.display_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      WhatsApp: {d.whatsapp_number || 'None'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        d.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {d.active ? 'Active' : 'Inactive'}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditDriver(d)} className="text-slate-500 hover:text-emerald-700"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDeleteDriver(d.id)} className="text-slate-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onUpdateDriver(d.id, { active: !d.active })} className="text-[10px] text-slate-500 hover:text-slate-800 underline">Toggle</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contribution Rate per KM */}
      <form onSubmit={handleSaveRate} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-emerald-700" />
            <span>Contribution Rate per KM</span>
          </h3>
          <span className="text-xs font-bold font-mono text-emerald-700">
            Active: Rs. {activeRate?.amount_per_km?.toFixed(2) || '35.00'}/km
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Accounting rule: Setting a new rate applies strictly to future trips. All past trips permanently preserve their snapshot rate!
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">New Rate (LKR / KM)</label>
            <input
              type="number"
              step="0.5"
              disabled={!isAdmin}
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Effective From</label>
            <input
              type="date"
              disabled={!isAdmin}
              value={rateEffectiveDate}
              onChange={(e) => setRateEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {rateSaveSuccess && (
          <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>New rate activated!</span>
          </div>
        )}

        {isAdmin ? (
          <button
            type="submit"
            disabled={isSavingRate}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSavingRate ? 'Activating...' : 'Activate New Rate'}
          </button>
        ) : (
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Only administrators can change contribution rates per Km</span>
          </div>
        )}
      </form>
    </div>
  );
};
