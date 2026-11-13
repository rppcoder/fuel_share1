import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  Wallet,
  Calendar,
} from 'lucide-react';
import {
  Trip,
  FuelPurchase,
  Expense,
  Payment,
  Driver,
  Vehicle,
  MonthSummaryReport,
} from '../types/database';
import {
  formatKM,
  formatLKR,
  generateMonthlyReport,
  getCurrentMonthString,
  isAdminDriver,
} from '../lib/accounting';

interface AdminAnalyticsProps {
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
  vehicle: Vehicle | null;
  drivers: Driver[];
  driverTrips: Trip[];
  adminTrips: Trip[];
  fuelPurchases: FuelPurchase[];
  expenses: Expense[];
  payments: Payment[];
  monthlyReport?: MonthSummaryReport;
}

type ChartTab = 'overview' | 'daily' | 'drivers' | 'trends';

const DRIVER_COLORS = [
  '#059669', // emerald-600
  '#0284c7', // sky-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#ea580c', // orange-600
  '#0d9488', // teal-600
];

const ADMIN_COLOR = '#f59e0b'; // amber-500

const EXPENSE_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  fuel: { label: 'Fuel (Pump)', color: '#f59e0b' },
  maintenance: { label: 'Maintenance', color: '#3b82f6' },
  service: { label: 'Service', color: '#0ea5e9' },
  tyres: { label: 'Tyres', color: '#8b5cf6' },
  spare_parts: { label: 'Spare Parts', color: '#ec4899' },
  insurance: { label: 'Insurance', color: '#14b8a6' },
  revenue_license: { label: 'License', color: '#6366f1' },
  other: { label: 'Other', color: '#64748b' },
};

function formatCompactLKR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}${(abs / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  selectedMonth,
  onMonthChange,
  vehicle,
  drivers,
  driverTrips,
  adminTrips,
  fuelPurchases,
  expenses,
  payments,
  monthlyReport,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('overview');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [trendMode, setTrendMode] = useState<'financial' | 'distance'>('financial');
  const [highlightedSliceId, setHighlightedSliceId] = useState<string | null>(null);

  const currentMonthStr = getCurrentMonthString();
  const isCurrentMonth = selectedMonth === currentMonthStr;

  const allTrips = useMemo(() => [...driverTrips, ...adminTrips], [driverTrips, adminTrips]);

  const activeReport = useMemo(() => {
    if (monthlyReport && monthlyReport.month === selectedMonth) {
      return monthlyReport;
    }
    if (!vehicle) return null;
    return generateMonthlyReport({
      month: selectedMonth,
      vehicle,
      trips: allTrips,
      payments,
      fuelPurchases,
      expenses,
      drivers,
    });
  }, [monthlyReport, selectedMonth, vehicle, allTrips, payments, fuelPurchases, expenses, drivers]);

  const dateObj = new Date(`${selectedMonth}-01T00:00:00Z`);
  const formattedMonth = dateObj.toLocaleDateString('en-LK', {
    month: 'short',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedDayIndex(null);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedDayIndex(null);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // 1. Daily Mileage & Activity Data for Selected Month
  const dailySeries = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map<
      string,
      {
        day: number;
        dateStr: string;
        driverKm: number;
        adminKm: number;
        contributionLKR: number;
        tripCount: number;
      }
    >();

    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      const dateStr = `${selectedMonth}-${dd}`;
      map.set(dateStr, {
        day: d,
        dateStr,
        driverKm: 0,
        adminKm: 0,
        contributionLKR: 0,
        tripCount: 0,
      });
    }

    allTrips
      .filter((t) => t.trip_date?.startsWith(selectedMonth) && t.status === 'completed')
      .forEach((t) => {
        const entry = map.get(t.trip_date);
        if (!entry) return;
        const isAdm = isAdminDriver(t.driver, t.driver_id);
        if (isAdm) {
          entry.adminKm += t.distance_km || 0;
        } else {
          entry.driverKm += t.distance_km || 0;
          entry.contributionLKR += t.calculated_contribution || 0;
        }
        entry.tripCount += 1;
      });

    return Array.from(map.values());
  }, [allTrips, selectedMonth]);

  const maxDailyKm = useMemo(() => {
    const peak = Math.max(...dailySeries.map((d) => d.driverKm + d.adminKm), 0);
    return peak > 0 ? Math.ceil(peak * 1.15) : 50;
  }, [dailySeries]);

  const activeDaysCount = useMemo(
    () => dailySeries.filter((d) => d.driverKm + d.adminKm > 0).length,
    [dailySeries]
  );

  // 2. Expense Breakdown (Fuel + Other Categories) for Selected Month
  const expenseBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {};
    const monthFuel = fuelPurchases
      .filter((f) => f.purchase_date?.startsWith(selectedMonth))
      .reduce((acc, f) => acc + Number(f.amount_lkr || 0), 0);
    if (monthFuel > 0) buckets['fuel'] = monthFuel;

    expenses
      .filter((e) => e.expense_date?.startsWith(selectedMonth))
      .forEach((e) => {
        const cat = e.category || 'other';
        buckets[cat] = (buckets[cat] || 0) + Number(e.amount_lkr || 0);
      });

    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return Object.entries(buckets)
      .map(([key, amount]) => {
        const meta = EXPENSE_CATEGORY_LABELS[key] || { label: key, color: '#64748b' };
        return {
          key,
          label: meta.label,
          color: meta.color,
          amount,
          pct: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [fuelPurchases, expenses, selectedMonth]);

  // 3. Distance Share Slices (Drivers + Admin) for Donut Chart
  const distanceSlices = useMemo(() => {
    if (!activeReport) return [];
    const items: Array<{
      id: string;
      label: string;
      km: number;
      color: string;
      pct: number;
    }> = [];

    activeReport.driverSummaries.forEach((ds, idx) => {
      if (ds.completedKm > 0) {
        items.push({
          id: ds.driverId,
          label: ds.driverName,
          km: ds.completedKm,
          color: DRIVER_COLORS[idx % DRIVER_COLORS.length],
          pct:
            activeReport.totalDistanceKm > 0
              ? Math.round((ds.completedKm / activeReport.totalDistanceKm) * 100)
              : 0,
        });
      }
    });

    if ((activeReport.adminDistanceKm ?? 0) > 0) {
      const admKm = activeReport.adminDistanceKm ?? 0;
      items.push({
        id: 'admin',
        label: 'Admin Runs',
        km: admKm,
        color: ADMIN_COLOR,
        pct:
          activeReport.totalDistanceKm > 0
            ? Math.round((admKm / activeReport.totalDistanceKm) * 100)
            : 0,
      });
    }

    return items;
  }, [activeReport]);

  // 4. 6-Month Historical Trend Ending at Selected Month
  const sixMonthTrend = useMemo(() => {
    if (!vehicle) return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    const months: Array<{
      month: string;
      shortLabel: string;
      contributions: number;
      payments: number;
      costs: number;
      driverKm: number;
      adminKm: number;
      totalKm: number;
      kmPerLitre: number | null;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const rep = generateMonthlyReport({
        month: monthStr,
        vehicle,
        trips: allTrips,
        payments,
        fuelPurchases,
        expenses,
        drivers,
      });
      months.push({
        month: monthStr,
        shortLabel,
        contributions: rep.totalConfirmedContributionLKR,
        payments: rep.totalPaymentsCollectedLKR,
        costs: rep.totalActualExpenditureLKR,
        driverKm: rep.driverDistanceKm ?? 0,
        adminKm: rep.adminDistanceKm ?? 0,
        totalKm: rep.totalDistanceKm,
        kmPerLitre: rep.averageConsumptionKmPerLitre,
      });
    }
    return months;
  }, [vehicle, selectedMonth, allTrips, payments, fuelPurchases, expenses, drivers]);

  const maxTrendFinance = useMemo(() => {
    const peak = Math.max(
      ...sixMonthTrend.flatMap((m) => [m.contributions, m.payments, m.costs]),
      0
    );
    return peak > 0 ? Math.ceil(peak * 1.15) : 5000;
  }, [sixMonthTrend]);

  const maxTrendDistance = useMemo(() => {
    const peak = Math.max(...sixMonthTrend.map((m) => m.totalKm), 0);
    return peak > 0 ? Math.ceil(peak * 1.15) : 100;
  }, [sixMonthTrend]);

  if (!activeReport) return null;

  const collectionRate =
    activeReport.totalConfirmedContributionLKR > 0
      ? Math.min(
          100,
          Math.round(
            (activeReport.totalPaymentsCollectedLKR /
              activeReport.totalConfirmedContributionLKR) *
              100
          )
        )
      : 0;

  const maxFinanceOverview = Math.max(
    activeReport.totalConfirmedContributionLKR,
    activeReport.totalPaymentsCollectedLKR,
    activeReport.totalFuelExpenditureLKR,
    activeReport.totalOtherExpensesLKR,
    1
  );

  // Donut SVG geometry helper
  const renderDonut = (
    slices: Array<{ id: string; label: string; value: number; color: string; pct: number }>,
    centerTop: string,
    centerBottom: string
  ) => {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let accumulated = 0;
    const total = slices.reduce((s, item) => s + item.value, 0);

    return (
      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-100 dark:text-slate-700"
          />
          {total > 0 &&
            slices.map((slice) => {
              const fraction = slice.value / total;
              const dashLength = fraction * circumference;
              const gapLength = circumference - dashLength;
              const offset = -accumulated * circumference;
              accumulated += fraction;
              const isHighlighted = highlightedSliceId === slice.id;

              return (
                <circle
                  key={slice.id}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHighlighted ? '15' : '12'}
                  strokeDasharray={`${Math.max(dashLength - 1, 0)} ${gapLength + 1}`}
                  strokeDashoffset={offset}
                  className="transition-all duration-200 cursor-pointer"
                  onClick={() =>
                    setHighlightedSliceId((prev) => (prev === slice.id ? null : slice.id))
                  }
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[11px] font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
            {centerTop}
          </span>
          <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
            {centerBottom}
          </span>
        </div>
      </div>
    );
  };

  // Inspected day or peak day for daily bar chart
  const activeDayPoint =
    selectedDayIndex !== null
      ? dailySeries[selectedDayIndex]
      : dailySeries.reduce(
          (best, cur) =>
            cur.driverKm + cur.adminKm > best.driverKm + best.adminKm ? cur : best,
          dailySeries[0]
        );

  // Inspected month for 6-month trend (defaults to current selectedMonth, which is last index 5)
  const activeTrendPoint =
    selectedTrendIndex !== null
      ? sixMonthTrend[selectedTrendIndex]
      : sixMonthTrend[sixMonthTrend.length - 1];

  return (
    <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
      {/* Header & Integrated Month Stepper */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Analytics &amp; Graphs</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Visual breakdown for {formattedMonth}
          </p>
        </div>

        {onMonthChange && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => !isCurrentMonth && onMonthChange(currentMonthStr)}
              title={isCurrentMonth ? 'Viewing current month' : 'Tap to jump to current month'}
              className="px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap"
            >
              {formattedMonth}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Key Analytical Metrics Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>Total Distance</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatKM(activeReport.totalDistanceKm)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
            {activeReport.averageConsumptionKmPerLitre
              ? `${activeReport.averageConsumptionKmPerLitre} km/L avg`
              : `${activeDaysCount} active day${activeDaysCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>Net Cash Margin</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div
            className={`text-sm font-black font-mono tabular-nums mt-1 ${
              activeReport.netVehicleCashflowLKR >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatLKR(activeReport.netVehicleCashflowLKR)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
            Collected: {collectionRate}% of billed
          </div>
        </div>
      </div>

      {/* Interactive Chart View Tabs */}
      <div
        role="tablist"
        aria-label="Admin Analytics Views"
        className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-700"
      >
        {(
          [
            { id: 'overview', label: 'Cash Flow' },
            { id: 'daily', label: 'Daily KM' },
            { id: 'drivers', label: 'Drivers' },
            { id: 'trends', label: '6-Mo Trend' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CASH FLOW & EXPENSE BREAKDOWN */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Revenue vs Cost Horizontal Comparison Bars */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Revenue vs Expenditure ({formattedMonth})
              </span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                LKR
              </span>
            </div>

            {[
              {
                label: 'Driver Contributions (Billed)',
                value: activeReport.totalConfirmedContributionLKR,
                colorClass: 'bg-emerald-600 dark:bg-emerald-500',
                textClass: 'text-emerald-700 dark:text-emerald-400',
              },
              {
                label: 'Payments Collected',
                value: activeReport.totalPaymentsCollectedLKR,
                colorClass: 'bg-teal-500 dark:bg-teal-400',
                textClass: 'text-teal-700 dark:text-teal-300',
              },
              {
                label: 'Fuel Purchases (Pump)',
                value: activeReport.totalFuelExpenditureLKR,
                colorClass: 'bg-amber-500',
                textClass: 'text-amber-700 dark:text-amber-400',
              },
              {
                label: 'Repairs & Other Expenses',
                value: activeReport.totalOtherExpensesLKR,
                colorClass: 'bg-blue-500',
                textClass: 'text-blue-700 dark:text-blue-400',
              },
            ].map((row) => {
              const pct = Math.max(2, Math.round((row.value / maxFinanceOverview) * 100));
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {row.label}
                    </span>
                    <span className={`font-mono tabular-nums font-bold ${row.textClass}`}>
                      {formatLKR(row.value)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${row.colorClass}`}
                      style={{ width: `${row.value > 0 ? pct : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expense Share Donut */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                <span>Expense Cost Breakdown</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
                Total: {formatLKR(activeReport.totalActualExpenditureLKR)}
              </span>
            </div>

            {expenseBreakdown.length === 0 ? (
              <div className="py-5 px-3 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400">
                No fuel or maintenance expenses logged in {formattedMonth}.
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {renderDonut(
                  expenseBreakdown.map((item) => ({
                    id: item.key,
                    label: item.label,
                    value: item.amount,
                    color: item.color,
                    pct: item.pct,
                  })),
                  formatCompactLKR(activeReport.totalActualExpenditureLKR),
                  'Total LKR'
                )}
                <div className="flex-1 space-y-1.5 text-[11px] min-w-0">
                  {expenseBreakdown.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setHighlightedSliceId((prev) => (prev === item.key ? null : item.key))
                      }
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition ${
                        highlightedSliceId === item.key
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-200 font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {item.pct}% · {formatCompactLKR(item.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DAILY DISTANCE BAR CHART (DRIVERS + ADMIN) */}
      {activeTab === 'daily' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Daily Distance Run (KM)</span>
            </span>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500 inline-block" />
                Drivers
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Admin
              </span>
            </div>
          </div>

          {activeDaysCount === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
              No completed trips recorded in {formattedMonth} yet.
            </div>
          ) : (
            <>
              {/* Interactive Selected/Peak Day Summary Readout */}
              {activeDayPoint && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {activeDayPoint.dateStr}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                      ({selectedDayIndex !== null ? 'Selected' : 'Peak Day'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Drv: {activeDayPoint.driverKm.toFixed(1)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Adm: {activeDayPoint.adminKm.toFixed(1)}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      Total: {(activeDayPoint.driverKm + activeDayPoint.adminKm).toFixed(1)} km
                    </span>
                  </div>
                </div>
              )}

              {/* SVG Daily Bar Chart */}
              <div className="w-full pt-1">
                <svg
                  viewBox="0 0 360 155"
                  className="w-full h-40 overflow-visible select-none"
                  role="img"
                  aria-label={`Daily distance chart for ${formattedMonth}`}
                >
                  {/* Horizontal Gridlines */}
                  {[0, 0.5, 1].map((ratio) => {
                    const y = 130 - ratio * 110;
                    const labelVal = Math.round(maxDailyKm * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1="28"
                          y1={y}
                          x2="355"
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray={ratio === 0 ? undefined : '2 3'}
                          className="text-slate-200 dark:text-slate-700"
                          strokeWidth="1"
                        />
                        <text
                          x="24"
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-400 dark:fill-slate-500 text-[8px] font-mono"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars for each day of month */}
                  {dailySeries.map((dayItem, idx) => {
                    const slotWidth = 324 / dailySeries.length;
                    const barWidth = Math.max(4, slotWidth - 2.5);
                    const x = 30 + idx * slotWidth + (slotWidth - barWidth) / 2;
                    const driverHeight = (dayItem.driverKm / maxDailyKm) * 110;
                    const adminHeight = (dayItem.adminKm / maxDailyKm) * 110;
                    const isSelected = selectedDayIndex === idx;
                    const hasData = dayItem.driverKm + dayItem.adminKm > 0;

                    return (
                      <g
                        key={dayItem.dateStr}
                        className="cursor-pointer"
                        onClick={() =>
                          setSelectedDayIndex((prev) => (prev === idx ? null : idx))
                        }
                      >
                        {/* Invisible full-height touch target */}
                        <rect
                          x={30 + idx * slotWidth}
                          y={15}
                          width={slotWidth}
                          height={120}
                          fill="transparent"
                        />

                        {isSelected && (
                          <rect
                            x={x - 1}
                            y={18}
                            width={barWidth + 2}
                            height={112}
                            rx="2"
                            className="fill-slate-200/60 dark:fill-slate-700/60"
                          />
                        )}

                        {/* Driver KM bar */}
                        {dayItem.driverKm > 0 && (
                          <rect
                            x={x}
                            y={130 - driverHeight}
                            width={barWidth}
                            height={Math.max(2, driverHeight)}
                            rx="1.5"
                            className={
                              isSelected
                                ? 'fill-emerald-500'
                                : 'fill-emerald-600 dark:fill-emerald-500'
                            }
                          />
                        )}

                        {/* Admin KM stacked on top */}
                        {dayItem.adminKm > 0 && (
                          <rect
                            x={x}
                            y={130 - driverHeight - adminHeight}
                            width={barWidth}
                            height={Math.max(2, adminHeight)}
                            rx="1.5"
                            className="fill-amber-500"
                          />
                        )}

                        {/* Subtle baseline tick if zero */}
                        {!hasData && (
                          <rect
                            x={x}
                            y={129}
                            width={barWidth}
                            height={1}
                            className="fill-slate-200 dark:fill-slate-700"
                          />
                        )}

                        {/* X-axis day ticks (1, 5, 10, 15, 20, 25, last) */}
                        {(dayItem.day === 1 ||
                          dayItem.day % 5 === 0 ||
                          dayItem.day === dailySeries.length) && (
                          <text
                            x={x + barWidth / 2}
                            y={144}
                            textAnchor="middle"
                            className={`text-[8px] font-mono ${
                              isSelected
                                ? 'fill-emerald-700 dark:fill-emerald-400 font-bold'
                                : 'fill-slate-400 dark:fill-slate-500'
                            }`}
                          >
                            {dayItem.day}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Tap any day bar to inspect driver vs admin mileage
              </p>
            </>
          )}
        </div>
      )}

      {/* TAB 3: DRIVER SHARE & COLLECTION PERFORMANCE */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Distance Share Donut */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mileage Share (Drivers &amp; Admin)</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                {formatKM(activeReport.totalDistanceKm)}
              </span>
            </div>

            {distanceSlices.length === 0 ? (
              <div className="py-5 px-3 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400">
                No completed distance logged for {formattedMonth}.
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {renderDonut(
                  distanceSlices.map((s) => ({
                    id: s.id,
                    label: s.label,
                    value: s.km,
                    color: s.color,
                    pct: s.pct,
                  })),
                  `${activeReport.totalDistanceKm.toFixed(0)}`,
                  'Total KM'
                )}

                <div className="flex-1 space-y-1.5 text-[11px] min-w-0">
                  {distanceSlices.map((slice) => (
                    <button
                      key={slice.id}
                      type="button"
                      onClick={() =>
                        setHighlightedSliceId((prev) => (prev === slice.id ? null : slice.id))
                      }
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition ${
                        highlightedSliceId === slice.id
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-200 font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate">{slice.label}</span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {slice.pct}% · {slice.km.toFixed(1)} km
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Driver Contribution vs Paid Comparison */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Driver Billing vs Payments Collected
            </div>

            {activeReport.driverSummaries.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-slate-400">
                No drivers registered.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeReport.driverSummaries.map((ds, idx) => {
                  const maxDriverVal = Math.max(
                    ds.confirmedContributionLKR,
                    ds.allocatedPaymentsLKR,
                    1
                  );
                  const billedPct =
                    ds.confirmedContributionLKR > 0
                      ? Math.round((ds.confirmedContributionLKR / maxDriverVal) * 100)
                      : 0;
                  const paidPct =
                    ds.allocatedPaymentsLKR > 0
                      ? Math.round((ds.allocatedPaymentsLKR / maxDriverVal) * 100)
                      : 0;
                  const barColor = DRIVER_COLORS[idx % DRIVER_COLORS.length];

                  return (
                    <div
                      key={ds.driverId}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 space-y-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: barColor }}
                          />
                          {ds.driverName}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            ds.outstandingBalanceLKR > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {ds.outstandingBalanceLKR > 0
                            ? `Due ${formatLKR(ds.outstandingBalanceLKR)}`
                            : ds.outstandingBalanceLKR < 0
                            ? `Credit ${formatLKR(Math.abs(ds.outstandingBalanceLKR))}`
                            : 'Settled'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-[10px] text-slate-500 dark:text-slate-400">
                            Billed
                          </span>
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-500 dark:bg-slate-400 rounded-full"
                              style={{ width: `${billedPct}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                            {formatCompactLKR(ds.confirmedContributionLKR)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-10 text-[10px] text-slate-500 dark:text-slate-400">
                            Paid
                          </span>
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCompactLKR(ds.allocatedPaymentsLKR)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: 6-MONTH HISTORICAL PERFORMANCE TREND */}
      {activeTab === 'trends' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>6-Month Trend</span>
            </span>

            {/* Metric Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTrendMode('financial')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                  trendMode === 'financial'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                LKR
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('distance')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                  trendMode === 'distance'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                KM
              </button>
            </div>
          </div>

          {/* Selected Month Trend Readout */}
          {activeTrendPoint && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {activeTrendPoint.month}
                </span>
                {trendMode === 'financial' ? (
                  <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
                    Net:{' '}
                    <span
                      className={
                        activeTrendPoint.payments - activeTrendPoint.costs >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {formatLKR(activeTrendPoint.payments - activeTrendPoint.costs)}
                    </span>
                  </span>
                ) : (
                  <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
                    Total: {formatKM(activeTrendPoint.totalKm)}
                  </span>
                )}
              </div>

              {trendMode === 'financial' ? (
                <div className="grid grid-cols-3 gap-1 font-mono tabular-nums text-[10px]">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Billed: {formatCompactLKR(activeTrendPoint.contributions)}
                  </span>
                  <span className="text-teal-700 dark:text-teal-300 text-center">
                    Paid: {formatCompactLKR(activeTrendPoint.payments)}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 text-right">
                    Cost: {formatCompactLKR(activeTrendPoint.costs)}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 font-mono tabular-nums text-[10px]">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Drivers: {activeTrendPoint.driverKm.toFixed(1)} km
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 text-center">
                    Admin: {activeTrendPoint.adminKm.toFixed(1)} km
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 text-right">
                    Eff: {activeTrendPoint.kmPerLitre ? `${activeTrendPoint.kmPerLitre} km/L` : '—'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SVG 6-Month Grouped Bar Chart */}
          <div className="w-full pt-1">
            <svg
              viewBox="0 0 360 155"
              className="w-full h-40 overflow-visible select-none"
              role="img"
              aria-label="6-Month Performance Trend Chart"
            >
              {[0, 0.5, 1].map((ratio) => {
                const y = 128 - ratio * 105;
                const peak = trendMode === 'financial' ? maxTrendFinance : maxTrendDistance;
                const val = Math.round(peak * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="34"
                      y1={y}
                      x2="352"
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray={ratio === 0 ? undefined : '2 3'}
                      className="text-slate-200 dark:text-slate-700"
                      strokeWidth="1"
                    />
                    <text
                      x="30"
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[8px] font-mono"
                    >
                      {trendMode === 'financial' ? formatCompactLKR(val) : val}
                    </text>
                  </g>
                );
              })}

              {sixMonthTrend.map((m, idx) => {
                const groupWidth = 315 / sixMonthTrend.length;
                const gx = 38 + idx * groupWidth;
                const isSelected =
                  selectedTrendIndex === idx ||
                  (selectedTrendIndex === null && idx === sixMonthTrend.length - 1);

                if (trendMode === 'financial') {
                  const barW = 10;
                  const startX = gx + (groupWidth - barW * 3 - 4) / 2;
                  const hContrib = (m.contributions / maxTrendFinance) * 105;
                  const hPaid = (m.payments / maxTrendFinance) * 105;
                  const hCost = (m.costs / maxTrendFinance) * 105;

                  return (
                    <g
                      key={m.month}
                      className="cursor-pointer"
                      onClick={() => setSelectedTrendIndex(idx)}
                    >
                      <rect
                        x={gx}
                        y={18}
                        width={groupWidth}
                        height={118}
                        rx="6"
                        className={
                          isSelected
                            ? 'fill-slate-100/90 dark:fill-slate-700/40'
                            : 'fill-transparent'
                        }
                      />
                      <rect
                        x={startX}
                        y={128 - hContrib}
                        width={barW}
                        height={Math.max(m.contributions > 0 ? 2 : 0, hContrib)}
                        rx="2"
                        className="fill-emerald-600 dark:fill-emerald-500"
                      />
                      <rect
                        x={startX + barW + 2}
                        y={128 - hPaid}
                        width={barW}
                        height={Math.max(m.payments > 0 ? 2 : 0, hPaid)}
                        rx="2"
                        className="fill-teal-500 dark:fill-teal-400"
                      />
                      <rect
                        x={startX + (barW + 2) * 2}
                        y={128 - hCost}
                        width={barW}
                        height={Math.max(m.costs > 0 ? 2 : 0, hCost)}
                        rx="2"
                        className="fill-amber-500"
                      />
                      <text
                        x={gx + groupWidth / 2}
                        y={144}
                        textAnchor="middle"
                        className={`text-[9px] font-mono ${
                          isSelected
                            ? 'fill-emerald-700 dark:fill-emerald-400 font-bold'
                            : 'fill-slate-500 dark:fill-slate-400'
                        }`}
                      >
                        {m.shortLabel}
                      </text>
                    </g>
                  );
                }

                // Distance stacked bars
                const barW = 18;
                const bx = gx + (groupWidth - barW) / 2;
                const hDrv = (m.driverKm / maxTrendDistance) * 105;
                const hAdm = (m.adminKm / maxTrendDistance) * 105;

                return (
                  <g
                    key={m.month}
                    className="cursor-pointer"
                    onClick={() => setSelectedTrendIndex(idx)}
                  >
                    <rect
                      x={gx}
                      y={18}
                      width={groupWidth}
                      height={118}
                      rx="6"
                      className={
                        isSelected
                          ? 'fill-slate-100/90 dark:fill-slate-700/40'
                          : 'fill-transparent'
                      }
                    />
                    <rect
                      x={bx}
                      y={128 - hDrv}
                      width={barW}
                      height={Math.max(m.driverKm > 0 ? 2 : 0, hDrv)}
                      rx="2"
                      className="fill-emerald-600 dark:fill-emerald-500"
                    />
                    <rect
                      x={bx}
                      y={128 - hDrv - hAdm}
                      width={barW}
                      height={Math.max(m.adminKm > 0 ? 2 : 0, hAdm)}
                      rx="2"
                      className="fill-amber-500"
                    />
                    <text
                      x={gx + groupWidth / 2}
                      y={144}
                      textAnchor="middle"
                      className={`text-[9px] font-mono ${
                        isSelected
                          ? 'fill-emerald-700 dark:fill-emerald-400 font-bold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {m.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            {trendMode === 'financial' ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  Billed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-500 inline-block" />
                  Collected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Expenses
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  Drivers KM
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Admin KM
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
