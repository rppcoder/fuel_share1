import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Fuel,
  MoreHorizontal,
  CreditCard,
  CalendarCheck,
  FileBarChart,
  Settings,
  Shield,
  X,
  FlaskConical,
} from 'lucide-react';

interface BottomNavProps {
  currentScreen: string;
  onSelectScreen: (screen: string) => void;
  pendingDraftCount: number;
  incompleteTripsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onSelectScreen,
  pendingDraftCount,
  incompleteTripsCount,
}) => {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const handleSelect = (screen: string) => {
    onSelectScreen(screen);
    setShowMoreSheet(false);
  };

  const moreScreens = [
    { id: 'payments', label: 'Payments', icon: CreditCard, desc: 'Record driver payments & deposits' },
    { id: 'settlements', label: 'Monthly Settlements', icon: CalendarCheck, desc: 'Confirm & audit monthly statements' },
    { id: 'reports', label: 'Reports & Exports', icon: FileBarChart, desc: 'CSV, printable bills & JSON backup' },
    { id: 'qa_suite', label: 'QA Test Runner', icon: FlaskConical, desc: 'Verify 17 security & accounting tests' },
  ];

  return (
    <>
      {/* Expandable More Menu Sheet */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Additional Features</h3>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-4">
              {moreScreens.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl text-left transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 shadow-xs'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar - Elevated floating pill bar clear of Netlify badges & safe areas */}
      <nav className="fixed bottom-2 left-2 right-2 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl pb-safe">
        <div className="w-full px-2 h-16 flex items-center justify-around">
          {/* Dashboard */}
          <button
            onClick={() => handleSelect('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              currentScreen === 'dashboard'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] mt-1">Dashboard</span>
          </button>

          {/* Trip History */}
          <button
            onClick={() => handleSelect('trips')}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition ${
              currentScreen === 'trips'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] mt-1">Trips</span>
            {incompleteTripsCount > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Record Trip (Prominent Center Button) */}
          <div className="flex items-center justify-center -mt-5 flex-1">
            <button
              onClick={() => handleSelect('record_trip')}
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all duration-150 ${
                currentScreen === 'record_trip'
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-emerald-700/30'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Record New Trip"
            >
              <PlusCircle className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Fuel & Expenses */}
          <button
            onClick={() => handleSelect('fuel_expenses')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              currentScreen === 'fuel_expenses'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Fuel className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] mt-1">Expenses</span>
          </button>

          {/* More menu */}
          <button
            onClick={() => setShowMoreSheet(true)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition ${
              ['payments', 'settlements', 'reports', 'qa_suite'].includes(currentScreen)
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] mt-1">More</span>
            {pendingDraftCount > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
