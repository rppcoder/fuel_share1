import React from 'react';
import {
  TrendingUp,
  Fuel,
  Wrench,
  CreditCard,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ArrowUpRight,
  Calendar,
  Gauge,
  Wallet,
} from 'lucide-react';
import {
  MonthSummaryReport,
  DriverMonthlySummary,
  Trip,
  Payment,
  FuelPurchase,
  Expense,
} from '../types/database';
import { formatLKR, formatKM, isAdminDriver } from '../lib/accounting';

interface DashboardProps {
  report: MonthSummaryReport;
  selectedMonth: string;
  onMonthChange: (newMonth: string) => void;
  onNavigate: (screen: string) => void;
  onSelectDriverForWhatsApp: (driverSummary: DriverMonthlySummary) => void;
  recentTrips: Trip[];
  recentFuel: FuelPurchase[];
  recentExpenses: Expense[];
  recentPayments: Payment[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  selectedMonth,
  onMonthChange,
  onNavigate,
  onSelectDriverForWhatsApp,
  recentTrips,
  recentFuel,
  recentExpenses,
  recentPayments,
}) => {
  // Navigation for month selector
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const prev = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(next);
  };

  const dateObj = new Date(`${selectedMonth}-01T00:00:00Z`);
  const formattedMonth = dateObj.toLocaleDateString('en-LK', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5 pb-24">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="font-extrabold text-slate-900 text-sm">{formattedMonth}</span>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Incomplete Trips Warning Alert */}
      {report.incompleteTripsTotal > 0 && (
        <div
          onClick={() => onNavigate('trips')}
          className="cursor-pointer flex items-center justify-between p-3.5 bg-amber-500/15 border border-amber-400/60 rounded-2xl text-amber-950 active:scale-99 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">
                {report.incompleteTripsTotal} Incomplete Trip{report.incompleteTripsTotal > 1 ? 's' : ''} Need Attention
              </div>
              <div className="text-[11px] text-amber-800">
                Missing ending odometer readings are excluded from confirmed billing.
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-900 shrink-0" />
        </div>
      )}

      {/* DRIVER BALANCES & STATEMENTS - Prioritized at the top for quick readability */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Driver Balances & Statements
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {report.driverSummaries.length} Driver{report.driverSummaries.length !== 1 ? 's' : ''}
          </span>
        </div>

        {report.driverSummaries.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            No drivers registered yet. Add drivers in the Settings tab.
          </div>
        ) : (
          <div className="space-y-3">
            {report.driverSummaries.map((ds) => {
              const owesMoney = ds.outstandingBalanceLKR > 0;
              const hasCredit = ds.outstandingBalanceLKR < 0;
              const firstLetter = ds.driverName.charAt(0).toUpperCase() || 'D';

              return (
                <div
                  key={ds.driverId}
                  className={`bg-white p-4 rounded-2xl border shadow-xs transition space-y-3.5 ${
                    owesMoney
                      ? 'border-rose-200/80 bg-gradient-to-b from-white to-rose-50/20'
                      : hasCredit
                      ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Driver Header Row: Name & Large Clear Balance Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {firstLetter}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-base text-slate-900">{ds.driverName}</span>
                          {!ds.active && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium font-mono">
                          {ds.whatsappNumber || 'No phone'}
                        </span>
                      </div>
                    </div>

                    {/* Highly readable prominent Balance Badge */}
                    <div
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm text-right shrink-0 shadow-xs border ${
                        owesMoney
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : hasCredit
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold tracking-wider opacity-75">
                        {owesMoney ? 'To Pay' : hasCredit ? 'Credit Balance' : 'Status'}
                      </span>
                      <span>
                        {owesMoney
                          ? `Owes ${formatLKR(ds.outstandingBalanceLKR)}`
                          : hasCredit
                          ? `Credit ${formatLKR(Math.abs(ds.outstandingBalanceLKR))}`
                          : 'Settled (Rs. 0.00)'}
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Metrics Breakdown: Distance, Rate Bill, Paid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Distance
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 block truncate">
                        {formatKM(ds.completedKm)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Contribution Due
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 block truncate">
                        {formatLKR(ds.confirmedContributionLKR)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Paid So Far
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono mt-0.5 block truncate">
                        {formatLKR(ds.allocatedPaymentsLKR)}
                      </span>
                    </div>
                  </div>

                  {/* Warning if incomplete trips */}
                  {ds.incompleteTripsCount > 0 && (
                    <div className="text-[11px] p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{ds.incompleteTripsCount} incomplete trip(s) pending odometer review</span>
                    </div>
                  )}

                  {/* Action: Send WhatsApp Statement */}
                  <button
                    onClick={() => onSelectDriverForWhatsApp(ds)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 active:scale-98 text-[#075E54] text-xs font-bold rounded-xl border border-[#25D366]/30 transition"
                  >
                    <MessageSquare className="w-4 h-4 text-[#25D366]" />
                    <span>Send Statement to {ds.driverName ? ds.driverName.split(' ')[0] : 'Driver'} via WhatsApp</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero Financial Summary Overview */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Kilometres */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Run KM</span>
            <Gauge className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2 font-mono">
            {formatKM(report.totalDistanceKm)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {report.adminDistanceKm && report.adminDistanceKm > 0 ? (
              <span>
                Drivers: {formatKM(report.driverDistanceKm)} • Admin: {formatKM(report.adminDistanceKm)}
              </span>
            ) : (
              <span>
                Avg: {report.averageConsumptionKmPerLitre ? `${report.averageConsumptionKmPerLitre} km/L` : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Calculated Driver Contributions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Confirmed Contributions</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800 mt-2 font-mono">
            {formatLKR(report.totalConfirmedContributionLKR)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            From completed driver trips
          </div>
        </div>
      </div>

      {/* Accounting Separation Card: Actual Expenses vs Contributions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Vehicle Actual Cash Flow
            </h3>
            <p className="text-[10px] text-slate-500">
              Separates actual pump & workshop costs from calculated driver rates
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-900">
            Net: {formatLKR(report.netVehicleCashflowLKR)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
              <Fuel className="w-3.5 h-3.5 text-amber-600" />
              <span>Fuel (Pump)</span>
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 font-mono">
              {formatLKR(report.totalFuelExpenditureLKR)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {report.totalFuelLitres} Litres
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Repairs / Maint</span>
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 font-mono">
              {formatLKR(report.totalOtherExpensesLKR)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Parts & service
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Driver Payments</span>
            </div>
            <div className="text-xs font-bold text-emerald-700 mt-1 font-mono">
              {formatLKR(report.totalPaymentsCollectedLKR)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Collected cash
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcut Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onNavigate('record_trip')}
          className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 active:scale-98 transition shadow"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-amber-300" />
          </div>
          <span>Record New Trip</span>
        </button>

        <button
          onClick={() => onNavigate('payments')}
          className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-98 transition shadow"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <span>Record Payment</span>
        </button>
      </div>

      {/* Latest Transactions Feed */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Latest Transactions
          </h3>
          <button
            onClick={() => onNavigate('trips')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View All
          </button>
        </div>

        <div className="space-y-2">
          {recentTrips.slice(0, 3).map((trip) => {
            const isAdminRun = isAdminDriver(trip.driver, trip.driver_id);
            return (
              <div
                key={trip.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    KM
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {isAdminRun ? 'Admin' : trip.driver?.display_name || 'Driver'} • {trip.trip_date}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {trip.start_odometer_km} → {trip.end_odometer_km ?? '???'} km ({formatKM(trip.distance_km)})
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 font-mono">
                    {isAdminRun ? 'Admin Run' : formatLKR(trip.calculated_contribution)}
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      trip.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trip.status === 'incomplete'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>
              </div>
            );
          })}

          {recentFuel.slice(0, 2).map((fuel) => (
            <div
              key={fuel.id}
              className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Fuel Refill • {fuel.purchase_date}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Paid by {fuel.paid_by} ({fuel.litres ? `${fuel.litres}L` : fuel.fuel_type})
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-amber-800">
                {formatLKR(fuel.amount_lkr)}
              </div>
            </div>
          ))}

          {recentPayments.slice(0, 2).map((pay) => (
            <div
              key={pay.id}
              className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Payment: {pay.driver?.display_name || 'Driver'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Allocated to {pay.allocated_month} ({pay.payment_method})
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-emerald-700">
                +{formatLKR(pay.amount_lkr)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
