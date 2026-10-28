import {
  Trip,
  Payment,
  FuelPurchase,
  Expense,
  Driver,
  Vehicle,
  Settlement,
  MonthSummaryReport,
  DriverMonthlySummary,
} from '../types/database';

/**
 * Format currency to Sri Lankan Rupees standard display
 */
export function formatLKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rs. 0.00';
  }
  return `Rs. ${Number(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format KM with 1 or 2 decimal places
 */
export function formatKM(distance: number | null | undefined): string {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return '0.0 km';
  }
  return `${Number(distance).toLocaleString('en-LK', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} km`;
}

export interface TripCalculationResult {
  distanceKm: number;
  ratePerKm: number;
  calculatedContribution: number;
  isValid: boolean;
  errorMessage?: string;
  isOverlappingWarning?: boolean;
}

/**
 * Calculate distance and driver contribution with validation
 */
export function calculateTrip(
  startKm: number,
  endKm: number | null,
  ratePerKm: number
): TripCalculationResult {
  if (isNaN(startKm) || startKm < 0) {
    return {
      distanceKm: 0,
      ratePerKm,
      calculatedContribution: 0,
      isValid: false,
      errorMessage: 'Starting odometer reading must be a positive number.',
    };
  }

  if (endKm === null || isNaN(endKm)) {
    // Incomplete trip (draft)
    return {
      distanceKm: 0,
      ratePerKm,
      calculatedContribution: 0,
      isValid: true, // valid as an incomplete draft
    };
  }

  if (endKm < startKm) {
    return {
      distanceKm: 0,
      ratePerKm,
      calculatedContribution: 0,
      isValid: false,
      errorMessage: `Finishing reading (${endKm} km) cannot be less than starting reading (${startKm} km).`,
    };
  }

  // Exact 2-decimal arithmetic
  const distanceKm = Math.round((endKm - startKm) * 100) / 100;
  const calculatedContribution = Math.round(distanceKm * ratePerKm * 100) / 100;

  return {
    distanceKm,
    ratePerKm,
    calculatedContribution,
    isValid: true,
  };
}

export const DEFAULT_ADMIN_DRIVER_ID = '00000000-0000-4000-8000-000000000010';

/**
 * Helper to determine if a driver record represents the Vehicle Admin / Owner
 */
export function isAdminDriver(driver?: Driver | null, driverId?: string | null): boolean {
  if (driverId === DEFAULT_ADMIN_DRIVER_ID || driver?.id === DEFAULT_ADMIN_DRIVER_ID) {
    return true;
  }
  if (!driver) return false;
  const name = (driver.display_name || '').trim().toLowerCase();
  return (
    name === 'admin' ||
    name === 'administrator' ||
    name === 'pradeep' ||
    name === 'owner' ||
    name === 'owner (admin)'
  );
}

/**
 * Generates an aggregated monthly report for a specific vehicle and month (YYYY-MM)
 */
export function generateMonthlyReport({
  month,
  vehicle,
  trips,
  payments,
  fuelPurchases,
  expenses,
  drivers,
  settlement,
}: {
  month: string; // "YYYY-MM"
  vehicle: Vehicle;
  trips: Trip[];
  payments: Payment[];
  fuelPurchases: FuelPurchase[];
  expenses: Expense[];
  drivers: Driver[];
  settlement?: Settlement | null;
}): MonthSummaryReport {
  // Filter for the chosen month (using trip_date startsWith or allocated_month)
  const monthTrips = trips.filter(
    (t) => t.vehicle_id === vehicle.id && t.trip_date.startsWith(month)
  );

  const monthFuel = fuelPurchases.filter(
    (f) => f.vehicle_id === vehicle.id && f.purchase_date.startsWith(month)
  );

  const monthExpenses = expenses.filter(
    (e) => e.vehicle_id === vehicle.id && e.expense_date.startsWith(month)
  );

  const monthPayments = payments.filter((p) => p.allocated_month === month);

  const isTripByAdmin = (t: Trip) => {
    const drv = t.driver || drivers.find((d) => d.id === t.driver_id);
    return isAdminDriver(drv, t.driver_id);
  };

  // Totals for Completed Trips only (Accounting Rule: Incomplete & void trips excluded)
  const completedTrips = monthTrips.filter((t) => t.status === 'completed');
  const incompleteTrips = monthTrips.filter((t) => t.status === 'incomplete' || t.status === 'draft');

  // Total distance includes both regular drivers and Admin runs
  const totalDistanceKm = completedTrips.reduce((acc, t) => acc + (t.distance_km || 0), 0);
  const adminDistanceKm = completedTrips
    .filter((t) => isTripByAdmin(t))
    .reduce((acc, t) => acc + (t.distance_km || 0), 0);
  const driverDistanceKm = completedTrips
    .filter((t) => !isTripByAdmin(t))
    .reduce((acc, t) => acc + (t.distance_km || 0), 0);

  // Confirmed contributions only apply to regular drivers (Admin runs are Rs. 0 contribution)
  const totalConfirmedContributionLKR = completedTrips
    .filter((t) => !isTripByAdmin(t))
    .reduce((acc, t) => acc + (t.calculated_contribution || 0), 0);

  // Fuel Expenditure
  const totalFuelExpenditureLKR = monthFuel.reduce((acc, f) => acc + Number(f.amount_lkr || 0), 0);
  const totalFuelLitres = monthFuel.reduce((acc, f) => acc + Number(f.litres || 0), 0);
  const averageConsumptionKmPerLitre =
    totalFuelLitres > 0 && totalDistanceKm > 0
      ? Math.round((totalDistanceKm / totalFuelLitres) * 10) / 10
      : null;

  // Other Expenses
  const totalOtherExpensesLKR = monthExpenses.reduce(
    (acc, e) => acc + Number(e.amount_lkr || 0),
    0
  );
  const totalActualExpenditureLKR = totalFuelExpenditureLKR + totalOtherExpensesLKR;

  // Payments collected for this month
  const totalPaymentsCollectedLKR = monthPayments.reduce(
    (acc, p) => acc + Number(p.amount_lkr || 0),
    0
  );

  // Net cash flow: collected payments minus actual expenditure paid out
  const netVehicleCashflowLKR = totalPaymentsCollectedLKR - totalActualExpenditureLKR;

  // Exclude Admin from separate driver summaries
  const regularDrivers = drivers.filter((driver) => !isAdminDriver(driver));

  // Per-driver breakdown (only regular drivers)
  const driverSummaries: DriverMonthlySummary[] = regularDrivers.map((driver) => {
    const driverTrips = monthTrips.filter((t) => t.driver_id === driver.id);
    const driverCompleted = driverTrips.filter((t) => t.status === 'completed');
    const driverIncomplete = driverTrips.filter(
      (t) => t.status === 'incomplete' || t.status === 'draft'
    );
    const driverVoid = driverTrips.filter((t) => t.status === 'void');

    const completedKm = driverCompleted.reduce((acc, t) => acc + (t.distance_km || 0), 0);
    const confirmedContributionLKR = driverCompleted.reduce(
      (acc, t) => acc + (t.calculated_contribution || 0),
      0
    );

    const driverPayments = monthPayments.filter((p) => p.driver_id === driver.id);
    const allocatedPaymentsLKR = driverPayments.reduce(
      (acc, p) => acc + Number(p.amount_lkr || 0),
      0
    );

    // Outstanding Balance = Confirmed Contributions - Payments Allocated
    // Positive: Driver owes the shared vehicle fund
    // Negative: Driver has a prepaid credit balance
    const outstandingBalanceLKR = Math.round((confirmedContributionLKR - allocatedPaymentsLKR) * 100) / 100;

    return {
      driverId: driver.id,
      driverName: driver.display_name,
      whatsappNumber: driver.whatsapp_number,
      active: driver.active,
      totalTrips: driverTrips.length,
      completedKm: Math.round(completedKm * 100) / 100,
      confirmedContributionLKR: Math.round(confirmedContributionLKR * 100) / 100,
      allocatedPaymentsLKR: Math.round(allocatedPaymentsLKR * 100) / 100,
      outstandingBalanceLKR,
      incompleteTripsCount: driverIncomplete.length,
      voidTripsCount: driverVoid.length,
    };
  });

  return {
    month,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    registrationNumber: vehicle.registration_identifier,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    driverDistanceKm: Math.round(driverDistanceKm * 100) / 100,
    adminDistanceKm: Math.round(adminDistanceKm * 100) / 100,
    totalConfirmedContributionLKR: Math.round(totalConfirmedContributionLKR * 100) / 100,
    totalFuelExpenditureLKR: Math.round(totalFuelExpenditureLKR * 100) / 100,
    totalFuelLitres: Math.round(totalFuelLitres * 100) / 100,
    averageConsumptionKmPerLitre,
    totalOtherExpensesLKR: Math.round(totalOtherExpensesLKR * 100) / 100,
    totalActualExpenditureLKR: Math.round(totalActualExpenditureLKR * 100) / 100,
    totalPaymentsCollectedLKR: Math.round(totalPaymentsCollectedLKR * 100) / 100,
    netVehicleCashflowLKR: Math.round(netVehicleCashflowLKR * 100) / 100,
    totalDriversCount: regularDrivers.length,
    incompleteTripsTotal: incompleteTrips.length,
    driverSummaries,
    settlement,
  };
}

/**
 * Build WhatsApp click-to-chat URL with statement message
 * Neutral, clear review statement as required by Section 7
 */
export function buildDriverWhatsAppUrl({
  driverSummary,
  vehicleName,
  registrationNumber,
  monthName,
}: {
  driverSummary: DriverMonthlySummary;
  vehicleName: string;
  registrationNumber: string;
  monthName: string; // e.g. "October 2026"
}): string {
  // Format balance string
  const balanceText =
    driverSummary.outstandingBalanceLKR > 0
      ? `Due / To Pay: ${formatLKR(driverSummary.outstandingBalanceLKR)}`
      : driverSummary.outstandingBalanceLKR < 0
      ? `Credit Balance: ${formatLKR(Math.abs(driverSummary.outstandingBalanceLKR))} (Prepaid)`
      : `Balance Settled: ${formatLKR(0)}`;

  const incompleteWarning =
    driverSummary.incompleteTripsCount > 0
      ? `\n⚠️ Note: You have ${driverSummary.incompleteTripsCount} incomplete trip(s) pending odometer review.`
      : '';

  const message = `*FuelShare Monthly Statement — ${monthName}*
Vehicle: ${vehicleName} (${registrationNumber})
Driver: ${driverSummary.driverName}
---------------------------------
• Completed Distance: ${formatKM(driverSummary.completedKm)}
• Confirmed Contribution: ${formatLKR(driverSummary.confirmedContributionLKR)}
• Payments Recorded: ${formatLKR(driverSummary.allocatedPaymentsLKR)}
• *Current Status: ${balanceText}*${incompleteWarning}
---------------------------------
This is an automated statement for your review. Please confirm or let the admin know if any odometer correction is required. Thank you!`;

  // Clean phone number (e.g. +94771234567 or 0771234567 -> 94771234567)
  let cleanNumber = driverSummary.whatsappNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
    cleanNumber = '94' + cleanNumber.substring(1);
  }

  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
