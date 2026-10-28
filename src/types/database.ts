export type UserRole = 'admin' | 'driver';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type TripStatus = 'draft' | 'incomplete' | 'completed' | 'void';
export type ExpenseCategory =
  | 'maintenance'
  | 'tyres'
  | 'insurance'
  | 'revenue_license'
  | 'service'
  | 'spare_parts'
  | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'ez_cash' | 'other';
export type SettlementStatus = 'draft' | 'confirmed' | 'amended';

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  created_at: string;
  user_email?: string;
}

export interface Vehicle {
  id: string;
  household_id: string;
  name: string;
  registration_identifier: string; // e.g., "WP AB-7890" or "CP QH-4521"
  vehicle_type: string;
  current_odometer_km: number;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  household_id: string;
  display_name: string;
  whatsapp_number: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContributionRate {
  id: string;
  household_id: string;
  vehicle_id: string;
  amount_per_km: number;
  effective_from: string; // YYYY-MM-DD
  created_by?: string;
  created_at: string;
}

export interface Trip {
  id: string;
  household_id: string;
  vehicle_id: string;
  driver_id: string;
  trip_date: string; // YYYY-MM-DD
  start_odometer_km: number;
  end_odometer_km: number | null;
  distance_km: number;
  rate_per_km_snapshot: number;
  calculated_contribution: number;
  status: TripStatus;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // Join fields
  driver?: Driver;
  vehicle?: Vehicle;
  // Local offline status flag
  is_local_draft?: boolean;
}

export interface FuelPurchase {
  id: string;
  household_id: string;
  vehicle_id: string;
  purchase_date: string; // YYYY-MM-DD
  fuel_type: string; // e.g. "Petrol 92 Octane", "Petrol 95 Octane", "Auto Diesel"
  amount_lkr: number;
  litres: number | null;
  odometer_km: number | null;
  paid_by: string; // Name of person who paid at the pump
  receipt_path?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  household_id: string;
  vehicle_id: string;
  expense_date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount_lkr: number;
  paid_by: string;
  description: string;
  receipt_path?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  household_id: string;
  driver_id: string;
  amount_lkr: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  allocated_month: string; // YYYY-MM
  reference?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  // Join fields
  driver?: Driver;
}

export interface Settlement {
  id: string;
  household_id: string;
  vehicle_id: string;
  settlement_month: string; // YYYY-MM
  status: SettlementStatus;
  summary_snapshot: Record<string, unknown>;
  confirmed_by?: string | null;
  confirmed_at: string;
  amended_at?: string | null;
}

export interface AuditLog {
  id: string;
  household_id: string;
  actor_user_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at: string;
}

export interface DriverMonthlySummary {
  driverId: string;
  driverName: string;
  whatsappNumber: string;
  active: boolean;
  totalTrips: number;
  completedKm: number;
  confirmedContributionLKR: number;
  allocatedPaymentsLKR: number;
  outstandingBalanceLKR: number; // positive = owes money, negative = credit in advance
  incompleteTripsCount: number;
  voidTripsCount: number;
}

export interface MonthSummaryReport {
  month: string; // YYYY-MM
  vehicleId: string;
  vehicleName: string;
  registrationNumber: string;
  totalDistanceKm: number;
  driverDistanceKm?: number;
  adminDistanceKm?: number;
  totalConfirmedContributionLKR: number;
  totalFuelExpenditureLKR: number;
  totalFuelLitres: number;
  averageConsumptionKmPerLitre: number | null;
  totalOtherExpensesLKR: number;
  totalActualExpenditureLKR: number; // fuel + expenses
  totalPaymentsCollectedLKR: number;
  netVehicleCashflowLKR: number; // payments collected - actual expenditure
  totalDriversCount: number;
  incompleteTripsTotal: number;
  driverSummaries: DriverMonthlySummary[];
  settlement?: Settlement | null;
}
