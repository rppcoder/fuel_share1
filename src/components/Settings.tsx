import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Car,
  Users,
  Percent,
  Shield,
  KeyRound,
  FlaskConical,
  Plus,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import {
  Vehicle,
  Driver,
  ContributionRate,
  UserRole,
} from '../types/database';

interface SettingsProps {
  vehicle: Vehicle | null;
  drivers: Driver[];
  activeRate: ContributionRate | null;
  ratesHistory: ContributionRate[];
  role: UserRole;
  onUpdateRole: (role: UserRole) => void;
  onUpdateVehicle: (updates: Partial<Vehicle>) => Promise<boolean>;
  onAddDriver: (driver: Partial<Driver>) => Promise<boolean>;
  onUpdateDriver: (driverId: string, updates: Partial<Driver>) => Promise<boolean>;
  onDeleteDriver: (driverId: string) => Promise<boolean>;
  onSetNewRate: (ratePerKm: number, effectiveFrom: string) => Promise<boolean>;
  onOpenSupabaseConfig: () => void;
  onOpenQASuite: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  vehicle,
  drivers,
  activeRate,
  role,
  onUpdateRole,
  onUpdateVehicle,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onSetNewRate,
  onOpenSupabaseConfig,
  onOpenQASuite,
}) => {
  // Vehicle edit state
  const [vehicleName, setVehicleName] = useState(vehicle?.name || 'Three-Wheeler');
  const [regId, setRegId] = useState(vehicle?.registration_identifier || 'WP AB-1234');
  const [vehicleOdometer, setVehicleOdometer] = useState(
    vehicle ? String(vehicle.current_odometer_km) : '0'
  );
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleSaveSuccess, setVehicleSaveSuccess] = useState(false);

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

  React.useEffect(() => {
    if (vehicle) {
      setVehicleName(vehicle.name);
      setRegId(vehicle.registration_identifier);
      setVehicleOdometer(String(vehicle.current_odometer_km));
    }
  }, [vehicle]);

  React.useEffect(() => {
    if (activeRate) {
      setNewRate(String(activeRate.amount_per_km));
      if (activeRate.effective_from) {
        setRateEffectiveDate(activeRate.effective_from);
      }
    }
  }, [activeRate]);

  const isAdmin = role === 'admin';

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

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Admin Panel</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200">
              /admin
            </span>
          </h2>
          <p className="text-xs text-slate-500">Vehicle details, drivers, rate per km & database</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
          <SettingsIcon className="w-5 h-5" />
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
