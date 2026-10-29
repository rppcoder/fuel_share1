import React from 'react';
import {
  Car,
  Database,
  Shield,
  User,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { Vehicle, UserRole } from '../types/database';
import { SupabaseConfigInfo } from '../lib/supabase';

interface NavbarProps {
  vehicle: Vehicle | null;
  role: UserRole;
  config: SupabaseConfigInfo;
  onOpenConfig: () => void;
  onOpenQA: () => void;
  onSelectScreen: (screen: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vehicle,
  role,
  config,
  onOpenConfig,
  onOpenQA,
  onSelectScreen,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectScreen('dashboard')}
          className="flex items-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-700 border border-emerald-600 flex items-center justify-center text-amber-400 shadow-inner">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-base tracking-tight text-white">FuelShare</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                LK
              </span>
            </div>
            <p className="text-[10px] text-emerald-300 font-medium">Shared Tuk-Tuk Manager</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Role badge / Admin Panel access */}
          <div
            onClick={() => onSelectScreen('admin')}
            title="Open Admin Panel"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-xs font-semibold border border-emerald-700/60 cursor-pointer active:scale-95 transition"
          >
            {role === 'admin' ? (
              <Shield
                onClick={() => onSelectScreen('admin')}
                className="w-3.5 h-3.5 text-amber-300 cursor-pointer"
              />
            ) : (
              <>
                <User
                  onClick={() => onSelectScreen('admin')}
                  className="w-3 h-3 text-emerald-300 cursor-pointer"
                />
                <span className="text-[11px]">Driver</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-bar with active vehicle identifier */}
      {vehicle && (
        <div className="bg-emerald-950/80 px-4 py-1.5 border-t border-emerald-800/50 text-[11px] text-emerald-200">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <span className="font-semibold text-white">
              {vehicle.name} <span className="font-mono text-amber-300 ml-1">({vehicle.registration_identifier})</span>
            </span>
            <span className="text-emerald-300">
              Odo: <strong className="text-white font-mono">{vehicle.current_odometer_km.toLocaleString()} km</strong>
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
