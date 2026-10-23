import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SupabaseSetupBanner } from './components/SupabaseSetupBanner';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { QASuiteModal } from './components/QASuiteModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

// Screens
import { Dashboard } from './components/Dashboard';
import { RecordTrip } from './components/RecordTrip';
import { TripHistory } from './components/TripHistory';
import { FuelExpenses } from './components/FuelExpenses';
import { Payments } from './components/Payments';
import { Settlements } from './components/Settlements';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';

// Types & Libs
import {
  Vehicle,
  Driver,
  ContributionRate,
  Trip,
  FuelPurchase,
  Expense,
  Payment,
  Settlement,
  UserRole,
  DriverMonthlySummary,
} from './types/database';
import {
  getSupabaseClient,
  getSupabaseConfig,
  SupabaseConfigInfo,
} from './lib/supabase';
import { generateMonthlyReport } from './lib/accounting';
import {
  getOfflineDrafts,
  saveOfflineDraft,
  removeOfflineDraft,
} from './lib/offlineDrafts';
import { saveToStorage, getFromStorage } from './lib/persistence';

// UUID helper functions
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16)
  );
}

export const isValidUuid = (str: any): boolean =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const ensureUuid = (id: string | null | undefined, defaultUuid: string): string =>
  isValidUuid(id) ? id! : defaultUuid;

// Standard PostgreSQL UUIDs for default initial state
export const DEFAULT_HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_VEHICLE_ID = '00000000-0000-4000-8000-000000000002';
export const DEFAULT_DRIVER1_ID = '00000000-0000-4000-8000-000000000003';
export const DEFAULT_DRIVER2_ID = '00000000-0000-4000-8000-000000000004';
export const DEFAULT_RATE_ID = '00000000-0000-4000-8000-000000000005';
export const DEFAULT_TRIP1_ID = '00000000-0000-4000-8000-000000000006';
export const DEFAULT_TRIP2_ID = '00000000-0000-4000-8000-000000000007';
export const DEFAULT_FUEL_ID = '00000000-0000-4000-8000-000000000008';
export const DEFAULT_PAYMENT_ID = '00000000-0000-4000-8000-000000000009';

const INITIAL_VEHICLE: Vehicle = {
  id: DEFAULT_VEHICLE_ID,
  household_id: DEFAULT_HOUSEHOLD_ID,
  name: 'Bajaj RE Tuk-Tuk',
  registration_identifier: 'ABV 9408',
  vehicle_type: 'three_wheeler',
  current_odometer_km: 12450.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_DRIVERS: Driver[] = [
  {
    id: DEFAULT_DRIVER1_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    display_name: 'Kamal Perera',
    whatsapp_number: '0771234567',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: DEFAULT_DRIVER2_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    display_name: 'Sunil Silva',
    whatsapp_number: '0719876543',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_RATE: ContributionRate = {
  id: DEFAULT_RATE_ID,
  household_id: DEFAULT_HOUSEHOLD_ID,
  vehicle_id: DEFAULT_VEHICLE_ID,
  amount_per_km: 35.0,
  effective_from: '2026-10-01',
  created_at: new Date().toISOString(),
};

const INITIAL_TRIPS: Trip[] = [
  {
    id: DEFAULT_TRIP1_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    vehicle_id: DEFAULT_VEHICLE_ID,
    driver_id: DEFAULT_DRIVER1_ID,
    trip_date: '2026-10-18',
    start_odometer_km: 12380.0,
    end_odometer_km: 12412.0,
    distance_km: 32.0,
    rate_per_km_snapshot: 35.0,
    calculated_contribution: 1120.0,
    status: 'completed',
    notes: 'Pettah market delivery shift',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: DEFAULT_TRIP2_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    vehicle_id: DEFAULT_VEHICLE_ID,
    driver_id: DEFAULT_DRIVER2_ID,
    trip_date: '2026-10-19',
    start_odometer_km: 12412.0,
    end_odometer_km: 12450.0,
    distance_km: 38.0,
    rate_per_km_snapshot: 35.0,
    calculated_contribution: 1330.0,
    status: 'completed',
    notes: 'Kaduwela school run & evening hires',
    created_at: '2026-10-19T18:00:00Z',
    updated_at: '2026-10-19T18:00:00Z',
  },
];

const INITIAL_FUEL: FuelPurchase[] = [
  {
    id: DEFAULT_FUEL_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    vehicle_id: DEFAULT_VEHICLE_ID,
    purchase_date: '2026-10-18',
    fuel_type: 'Petrol 92 Octane',
    amount_lkr: 3450.0,
    litres: 9.8,
    odometer_km: 12380.0,
    paid_by: 'Kamal Perera',
    notes: 'Ceypetco Borella shed',
    created_at: '2026-10-18T08:30:00Z',
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: DEFAULT_PAYMENT_ID,
    household_id: DEFAULT_HOUSEHOLD_ID,
    driver_id: DEFAULT_DRIVER1_ID,
    amount_lkr: 1000.0,
    payment_date: '2026-10-20',
    payment_method: 'cash',
    allocated_month: '2026-10',
    reference: 'Cash in box',
    notes: 'Weekly contribution deposit',
    created_at: '2026-10-20T12:00:00Z',
  },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      return 'admin';
    }
    return 'record_trip';
  });

  const handleNavigateScreen = useCallback((screen: string) => {
    setCurrentScreen(screen);
    if (typeof window !== 'undefined') {
      if (screen === 'admin') {
        window.history.pushState({}, '', '/admin');
      } else if (window.location.pathname === '/admin') {
        window.history.pushState({}, '', '/');
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin') {
        setCurrentScreen('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [userRole, setUserRole] = useState<UserRole>(() => getFromStorage<UserRole>('userRole', 'admin'));

  const handleUpdateRole = useCallback((newRole: UserRole) => {
    setUserRole(newRole);
    saveToStorage('userRole', newRole);
  }, []);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfigInfo>(getSupabaseConfig());

  // Entities state with UUID validation
  const [vehicle, setVehicle] = useState<Vehicle>(() => {
    const stored = getFromStorage<Vehicle>('vehicle', INITIAL_VEHICLE);
    if (!isValidUuid(stored?.id)) return INITIAL_VEHICLE;
    return stored;
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const stored = getFromStorage<Driver[]>('drivers', INITIAL_DRIVERS);
    if (!Array.isArray(stored) || stored.some((d) => !isValidUuid(d.id))) return INITIAL_DRIVERS;
    return stored;
  });
  const [activeRate, setActiveRate] = useState<ContributionRate>(() => {
    const stored = getFromStorage<ContributionRate>('rate', INITIAL_RATE);
    if (!isValidUuid(stored?.id)) return INITIAL_RATE;
    return stored;
  });
  const [ratesHistory, setRatesHistory] = useState<ContributionRate[]>([INITIAL_RATE]);
  const [trips, setTrips] = useState<Trip[]>(() => {
    const stored = getFromStorage<Trip[]>('trips', INITIAL_TRIPS);
    if (!Array.isArray(stored) || stored.some((t) => !isValidUuid(t.id))) return INITIAL_TRIPS;
    return stored;
  });
  const [fuelPurchases, setFuelPurchases] = useState<FuelPurchase[]>(() => {
    const stored = getFromStorage<FuelPurchase[]>('fuel', INITIAL_FUEL);
    if (!Array.isArray(stored) || stored.some((f) => !isValidUuid(f.id))) return INITIAL_FUEL;
    return stored;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const stored = getFromStorage<Expense[]>('expenses', []);
    if (!Array.isArray(stored) || stored.some((e) => !isValidUuid(e.id))) return [];
    return stored;
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const stored = getFromStorage<Payment[]>('payments', INITIAL_PAYMENTS);
    if (!Array.isArray(stored) || stored.some((p) => !isValidUuid(p.id))) return INITIAL_PAYMENTS;
    return stored;
  });
  const [settlements, setSettlements] = useState<Settlement[]>(() => {
    const stored = getFromStorage<Settlement[]>('settlements', []);
    if (!Array.isArray(stored) || stored.some((s) => !isValidUuid(s.id))) return [];
    return stored;
  });

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showQASuiteModal, setShowQASuiteModal] = useState<boolean>(false);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    summary: DriverMonthlySummary | null;
  }>({
    isOpen: false,
    summary: null,
  });

  const [isSyncingDrafts, setIsSyncingDrafts] = useState<boolean>(false);

  // Refresh config state
  const refreshConfig = useCallback(() => {
    setSupabaseConfig(getSupabaseConfig());
  }, []);

  // Fetch data from Supabase if connected
  const loadCloudData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // 0. Ensure default household row exists in Supabase so foreign key checks pass
      await client.from('households').upsert({
        id: DEFAULT_HOUSEHOLD_ID,
        name: 'Colombo Household',
        created_at: new Date().toISOString(),
      });

      // 1. Vehicle
      const { data: vData } = await client.from('vehicles').select('*').limit(1).maybeSingle();
      if (vData && isValidUuid(vData.id)) {
        setVehicle(vData);
        saveToStorage('vehicle', vData);
      } else {
        await client.from('vehicles').upsert(INITIAL_VEHICLE);
      }

      // 2. Drivers
      const { data: dData } = await client.from('drivers').select('*').order('created_at', { ascending: true });
      if (dData && dData.length > 0) {
        setDrivers(dData);
        saveToStorage('drivers', dData);
      } else {
        await client.from('drivers').upsert(INITIAL_DRIVERS);
      }

      // 3. Rates
      const { data: rData } = await client
        .from('contribution_rates')
        .select('*')
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false });
      if (rData && rData.length > 0) {
        setActiveRate(rData[0]);
        saveToStorage('rate', rData[0]);
        setRatesHistory(rData);
      } else {
        await client.from('contribution_rates').upsert(INITIAL_RATE);
      }

      // 4. Trips
      const { data: tData } = await client
        .from('trips')
        .select('*, driver:drivers(*)')
        .order('trip_date', { ascending: false });
      if (tData) {
        setTrips(tData);
        saveToStorage('trips', tData);
      }

      // 5. Fuel
      const { data: fData } = await client
        .from('fuel_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      if (fData) {
        setFuelPurchases(fData);
        saveToStorage('fuel', fData);
      }

      // 6. Expenses
      const { data: eData } = await client
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (eData) {
        setExpenses(eData);
        saveToStorage('expenses', eData);
      }

      // 7. Payments
      const { data: pData } = await client
        .from('payments')
        .select('*, driver:drivers(*)')
        .order('payment_date', { ascending: false });
      if (pData) {
        setPayments(pData);
        saveToStorage('payments', pData);
      }

      // 8. Settlements
      const { data: sData } = await client.from('settlements').select('*');
      if (sData) {
        setSettlements(sData);
        saveToStorage('settlements', sData);
      }
    } catch (err) {
      console.warn('Error loading Supabase data:', err);
    }
  }, []);

  useEffect(() => {
    loadCloudData();

    // Refetch state whenever the user focuses the browser tab or returns to the app
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadCloudData();
      }
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // Setup Supabase Realtime subscription for instant live cross-device sync
    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      try {
        channel = client
          .channel('public-db-sync')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            loadCloudData();
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      if (channel) {
        const currentClient = getSupabaseClient();
        if (currentClient) {
          currentClient.removeChannel(channel);
        }
      }
    };
  }, [loadCloudData, supabaseConfig.isConfigured]);

  // Merge trips with driver entity lookup
  const enrichedTrips = useMemo(() => {
    return trips.map((t) => {
      const drv = drivers.find((d) => d.id === t.driver_id);
      return {
        ...t,
        driver: t.driver || drv,
      };
    });
  }, [trips, drivers]);

  // Merge payments with driver entity lookup
  const enrichedPayments = useMemo(() => {
    return payments.map((p) => {
      const drv = drivers.find((d) => d.id === p.driver_id);
      return {
        ...p,
        driver: p.driver || drv,
      };
    });
  }, [payments, drivers]);

  // Current active settlement
  const currentSettlement = useMemo(() => {
    return settlements.find(
      (s) => s.vehicle_id === vehicle.id && s.settlement_month === selectedMonth
    );
  }, [settlements, vehicle.id, selectedMonth]);

  // Authoritative monthly financial report calculation
  const monthlyReport = useMemo(() => {
    return generateMonthlyReport({
      month: selectedMonth,
      vehicle,
      trips: enrichedTrips,
      payments: enrichedPayments,
      fuelPurchases,
      expenses,
      drivers,
      settlement: currentSettlement,
    });
  }, [selectedMonth, vehicle, enrichedTrips, enrichedPayments, fuelPurchases, expenses, drivers, currentSettlement]);

  // Sync offline drafts queue
  const handleSyncOfflineDrafts = async () => {
    const drafts = getOfflineDrafts();
    if (drafts.length === 0) return;

    setIsSyncingDrafts(true);
    const client = getSupabaseClient();

    try {
      for (const draft of drafts) {
        if (client) {
          const { error } = await client.from('trips').insert({
            household_id: draft.household_id || vehicle.household_id,
            vehicle_id: draft.vehicle_id || vehicle.id,
            driver_id: draft.driver_id,
            trip_date: draft.trip_date,
            start_odometer_km: draft.start_odometer_km,
            end_odometer_km: draft.end_odometer_km,
            rate_per_km_snapshot: draft.rate_per_km_snapshot,
            calculated_contribution: draft.calculated_contribution,
            status: draft.status,
            notes: draft.notes,
          });

          if (!error) {
            removeOfflineDraft(draft.id);
          }
        } else {
          // Keep locally in trips state
          setTrips((prev) => [draft, ...prev.filter((t) => t.id !== draft.id)]);
          removeOfflineDraft(draft.id);
        }
      }
      await loadCloudData();
    } catch (err) {
      console.error('Failed syncing offline drafts:', err);
    } finally {
      setIsSyncingDrafts(false);
    }
  };

  // Trip operations
  const handleSaveTrip = async (tripData: Partial<Trip>): Promise<boolean> => {
    const client = getSupabaseClient();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const newTripId = generateUuid();
    const completeTrip: Trip = {
      id: newTripId,
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      vehicle_id: ensureUuid(vehicle.id, DEFAULT_VEHICLE_ID),
      driver_id: ensureUuid(tripData.driver_id, DEFAULT_DRIVER1_ID),
      trip_date: tripData.trip_date!,
      start_odometer_km: tripData.start_odometer_km!,
      end_odometer_km: tripData.end_odometer_km ?? null,
      distance_km: tripData.distance_km || 0,
      rate_per_km_snapshot: tripData.rate_per_km_snapshot || activeRate.amount_per_km,
      calculated_contribution: tripData.calculated_contribution || 0,
      status: tripData.status || 'completed',
      notes: tripData.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (client && isOnline) {
      try {
        const { data, error } = await client
          .from('trips')
          .insert({
            id: completeTrip.id,
            household_id: completeTrip.household_id,
            vehicle_id: completeTrip.vehicle_id,
            driver_id: completeTrip.driver_id,
            trip_date: completeTrip.trip_date,
            start_odometer_km: completeTrip.start_odometer_km,
            end_odometer_km: completeTrip.end_odometer_km,
            rate_per_km_snapshot: completeTrip.rate_per_km_snapshot,
            calculated_contribution: completeTrip.calculated_contribution,
            status: completeTrip.status,
            notes: completeTrip.notes,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert notice:', error.message);
          saveOfflineDraft(completeTrip);
        } else if (data) {
          completeTrip.id = data.id;
        }
      } catch {
        saveOfflineDraft(completeTrip);
      }
    } else {
      saveOfflineDraft(completeTrip);
    }

    setTrips((prev) => {
      const updated = [completeTrip, ...prev];
      saveToStorage('trips', updated);
      return updated;
    });

    if (completeTrip.status === 'completed' && completeTrip.end_odometer_km) {
      const newOdo = Math.max(vehicle.current_odometer_km, completeTrip.end_odometer_km);
      setVehicle((v) => {
        const updated = { ...v, current_odometer_km: newOdo };
        saveToStorage('vehicle', updated);
        return updated;
      });
      if (client && isOnline) {
        client.from('vehicles').update({ current_odometer_km: newOdo }).eq('id', vehicle.id);
      }
    }

    return true;
  };

  const handleUpdateTrip = async (
    tripId: string,
    updates: Partial<Trip>,
    auditReason: string
  ): Promise<boolean> => {
    const client = getSupabaseClient();
    const oldTrip = trips.find((t) => t.id === tripId);

    setTrips((prev) => {
      const updated = prev.map((t) => (t.id === tripId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
      saveToStorage('trips', updated);
      return updated;
    });

    if (updates.end_odometer_km && updates.status === 'completed') {
      const newOdo = Math.max(vehicle.current_odometer_km, updates.end_odometer_km);
      setVehicle((v) => {
        const updated = { ...v, current_odometer_km: newOdo };
        saveToStorage('vehicle', updated);
        return updated;
      });
    }

    if (client) {
      await client.from('trips').update(updates).eq('id', tripId);
      await client.from('audit_logs').insert({
        id: generateUuid(),
        household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
        entity_type: 'trip',
        entity_id: tripId,
        action: 'update_trip',
        previous_values: oldTrip ? (oldTrip as unknown as Record<string, unknown>) : null,
        new_values: { ...updates, reason: auditReason },
      });
    }

    return true;
  };

  const handleVoidTrip = async (tripId: string, reason: string): Promise<boolean> => {
    const client = getSupabaseClient();
    const oldTrip = trips.find((t) => t.id === tripId);

    setTrips((prev) => {
      const updated = prev.map((t) => (t.id === tripId ? { ...t, status: 'void' as const, updated_at: new Date().toISOString() } : t));
      saveToStorage('trips', updated);
      return updated;
    });

    if (client) {
      await client.from('trips').update({ status: 'void' }).eq('id', tripId);
      await client.from('audit_logs').insert({
        id: generateUuid(),
        household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
        entity_type: 'trip',
        entity_id: tripId,
        action: 'void_trip',
        previous_values: oldTrip ? (oldTrip as unknown as Record<string, unknown>) : null,
        new_values: { status: 'void', reason },
      });
    }

    return true;
  };

  // Fuel & Expense operations
  const handleAddFuel = async (fuelData: Partial<FuelPurchase>): Promise<boolean> => {
    const client = getSupabaseClient();
    const newFuel: FuelPurchase = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      vehicle_id: ensureUuid(vehicle.id, DEFAULT_VEHICLE_ID),
      purchase_date: fuelData.purchase_date!,
      fuel_type: fuelData.fuel_type || 'Petrol 92 Octane',
      amount_lkr: fuelData.amount_lkr!,
      litres: fuelData.litres ?? null,
      odometer_km: fuelData.odometer_km ?? null,
      paid_by: fuelData.paid_by!,
      receipt_path: fuelData.receipt_path || null,
      notes: fuelData.notes || null,
      created_at: new Date().toISOString(),
    };

    setFuelPurchases((prev) => {
      const updated = [newFuel, ...prev];
      saveToStorage('fuel', updated);
      return updated;
    });

    if (client) {
      await client.from('fuel_purchases').insert({
        id: newFuel.id,
        household_id: newFuel.household_id,
        vehicle_id: newFuel.vehicle_id,
        purchase_date: newFuel.purchase_date,
        fuel_type: newFuel.fuel_type,
        amount_lkr: newFuel.amount_lkr,
        litres: newFuel.litres,
        odometer_km: newFuel.odometer_km,
        paid_by: newFuel.paid_by,
        receipt_path: newFuel.receipt_path,
        notes: newFuel.notes,
      });
    }

    return true;
  };

  const handleAddExpense = async (expenseData: Partial<Expense>): Promise<boolean> => {
    const client = getSupabaseClient();
    const newExpense: Expense = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      vehicle_id: ensureUuid(vehicle.id, DEFAULT_VEHICLE_ID),
      expense_date: expenseData.expense_date!,
      category: expenseData.category || 'maintenance',
      amount_lkr: expenseData.amount_lkr!,
      paid_by: expenseData.paid_by!,
      description: expenseData.description!,
      receipt_path: expenseData.receipt_path || null,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      saveToStorage('expenses', updated);
      return updated;
    });

    if (client) {
      await client.from('expenses').insert({
        id: newExpense.id,
        household_id: newExpense.household_id,
        vehicle_id: newExpense.vehicle_id,
        expense_date: newExpense.expense_date,
        category: newExpense.category,
        amount_lkr: newExpense.amount_lkr,
        paid_by: newExpense.paid_by,
        description: newExpense.description,
        receipt_path: newExpense.receipt_path,
      });
    }

    return true;
  };

  // Payment operations
  const handleAddPayment = async (paymentData: Partial<Payment>): Promise<boolean> => {
    const client = getSupabaseClient();
    const newPayment: Payment = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      driver_id: ensureUuid(paymentData.driver_id, DEFAULT_DRIVER1_ID),
      amount_lkr: paymentData.amount_lkr!,
      payment_date: paymentData.payment_date!,
      payment_method: paymentData.payment_method || 'cash',
      allocated_month: paymentData.allocated_month || selectedMonth,
      reference: paymentData.reference || null,
      notes: paymentData.notes || null,
      created_at: new Date().toISOString(),
    };

    setPayments((prev) => {
      const updated = [newPayment, ...prev];
      saveToStorage('payments', updated);
      return updated;
    });

    if (client) {
      await client.from('payments').insert({
        id: newPayment.id,
        household_id: newPayment.household_id,
        driver_id: newPayment.driver_id,
        amount_lkr: newPayment.amount_lkr,
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        allocated_month: newPayment.allocated_month,
        reference: newPayment.reference,
        notes: newPayment.notes,
      });
    }

    return true;
  };

  // Settlement operations
  const handleConfirmSettlement = async (month: string, summary: any): Promise<boolean> => {
    const client = getSupabaseClient();
    const settlementRecord: Settlement = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      vehicle_id: ensureUuid(vehicle.id, DEFAULT_VEHICLE_ID),
      settlement_month: month,
      status: 'confirmed',
      summary_snapshot: summary,
      confirmed_at: new Date().toISOString(),
    };

    setSettlements((prev) => {
      const updated = [
        settlementRecord,
        ...prev.filter((s) => !(s.vehicle_id === vehicle.id && s.settlement_month === month)),
      ];
      saveToStorage('settlements', updated);
      return updated;
    });

    if (client) {
      await client.from('settlements').upsert({
        id: settlementRecord.id,
        household_id: settlementRecord.household_id,
        vehicle_id: settlementRecord.vehicle_id,
        settlement_month: month,
        status: 'confirmed',
        summary_snapshot: summary,
        confirmed_at: new Date().toISOString(),
      });
      await client.from('audit_logs').insert({
        id: generateUuid(),
        household_id: settlementRecord.household_id,
        entity_type: 'settlement',
        entity_id: settlementRecord.id,
        action: 'confirm_settlement',
        new_values: summary,
      });
    }

    return true;
  };

  const handleAmendSettlement = async (month: string, reason: string): Promise<boolean> => {
    const client = getSupabaseClient();
    const existing = settlements.find((s) => s.settlement_month === month);

    setSettlements((prev) => {
      const updated = prev.map((s) =>
        s.settlement_month === month
          ? { ...s, status: 'amended' as const, amended_at: new Date().toISOString() }
          : s
      );
      saveToStorage('settlements', updated);
      return updated;
    });

    if (client) {
      await client
        .from('settlements')
        .update({
          status: 'amended',
          amended_at: new Date().toISOString(),
        })
        .match({ household_id: vehicle.household_id, vehicle_id: vehicle.id, settlement_month: month });

      await client.from('audit_logs').insert({
        id: generateUuid(),
        household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
        entity_type: 'settlement',
        entity_id: existing?.id || generateUuid(),
        action: 'amend_settlement',
        new_values: { month, reason },
      });
    }

    return true;
  };

  // Vehicle & Driver settings operations (Admin Only)
  const handleUpdateVehicle = async (updates: Partial<Vehicle>): Promise<boolean> => {
    if (userRole !== 'admin') {
      alert('Access Denied: Only administrators can update vehicle details.');
      return false;
    }
    const client = getSupabaseClient();
    const updatedVehicle = { ...vehicle, ...updates, updated_at: new Date().toISOString() };
    setVehicle(updatedVehicle);
    saveToStorage('vehicle', updatedVehicle);

    if (client) {
      await client.from('vehicles').upsert({
        id: ensureUuid(updatedVehicle.id, DEFAULT_VEHICLE_ID),
        household_id: ensureUuid(updatedVehicle.household_id, DEFAULT_HOUSEHOLD_ID),
        name: updatedVehicle.name,
        registration_identifier: updatedVehicle.registration_identifier,
        vehicle_type: updatedVehicle.vehicle_type,
        current_odometer_km: updatedVehicle.current_odometer_km,
        updated_at: updatedVehicle.updated_at,
      });
    }
    return true;
  };

  const handleAddDriver = async (driverData: Partial<Driver>): Promise<boolean> => {
    if (userRole !== 'admin') {
      alert('Access Denied: Only administrators can add new drivers.');
      return false;
    }
    const client = getSupabaseClient();
    const newDriver: Driver = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      display_name: driverData.display_name!,
      whatsapp_number: driverData.whatsapp_number || '',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDrivers((prev) => {
      const updated = [...prev, newDriver];
      saveToStorage('drivers', updated);
      return updated;
    });

    if (client) {
      await client.from('drivers').upsert({
        id: newDriver.id,
        household_id: newDriver.household_id,
        display_name: newDriver.display_name,
        whatsapp_number: newDriver.whatsapp_number,
        active: newDriver.active,
        created_at: newDriver.created_at,
        updated_at: newDriver.updated_at,
      });
    }
    return true;
  };

  const handleUpdateDriver = async (
    driverId: string,
    updates: Partial<Driver>
  ): Promise<boolean> => {
    if (userRole !== 'admin') {
      alert('Access Denied: Only administrators can modify driver profiles.');
      return false;
    }
    const client = getSupabaseClient();
    let updatedList: Driver[] = [];
    setDrivers((prev) => {
      updatedList = prev.map((d) => (d.id === driverId ? { ...d, ...updates, updated_at: new Date().toISOString() } : d));
      saveToStorage('drivers', updatedList);
      return updatedList;
    });

    if (client) {
      const targetDriver = updatedList.find((d) => d.id === driverId);
      if (targetDriver) {
        const { error } = await client.from('drivers').upsert({
          id: ensureUuid(targetDriver.id, generateUuid()),
          household_id: ensureUuid(targetDriver.household_id, DEFAULT_HOUSEHOLD_ID),
          display_name: targetDriver.display_name,
          whatsapp_number: targetDriver.whatsapp_number || '',
          active: targetDriver.active !== false,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.error('Failed to update driver in Supabase:', error.message);
        }
      }
    }
    return true;
  };

  const handleDeleteDriver = async (driverId: string): Promise<boolean> => {
    if (userRole !== 'admin') {
      alert('Access Denied: Only administrators can delete driver profiles.');
      return false;
    }
    const client = getSupabaseClient();
    setDrivers((prev) => {
      const updated = prev.filter((d) => d.id !== driverId);
      saveToStorage('drivers', updated);
      return updated;
    });
    if (client) {
      await client.from('drivers').delete().eq('id', driverId);
    }
    return true;
  };

  const handleSetNewRate = async (ratePerKm: number, effectiveFrom: string): Promise<boolean> => {
    if (userRole !== 'admin') {
      alert('Access Denied: Only administrators can set the contribution rate per Km.');
      return false;
    }
    const client = getSupabaseClient();
    const newRateObj: ContributionRate = {
      id: generateUuid(),
      household_id: ensureUuid(vehicle.household_id, DEFAULT_HOUSEHOLD_ID),
      vehicle_id: ensureUuid(vehicle.id, DEFAULT_VEHICLE_ID),
      amount_per_km: ratePerKm,
      effective_from: effectiveFrom,
      created_at: new Date().toISOString(),
    };

    setActiveRate(newRateObj);
    saveToStorage('rate', newRateObj);
    setRatesHistory((prev) => [newRateObj, ...prev]);

    if (client) {
      await client.from('contribution_rates').insert({
        household_id: newRateObj.household_id,
        vehicle_id: newRateObj.vehicle_id,
        amount_per_km: newRateObj.amount_per_km,
        effective_from: newRateObj.effective_from,
      });
      await client.from('audit_logs').insert({
        household_id: vehicle.household_id,
        entity_type: 'contribution_rate',
        entity_id: newRateObj.id,
        action: 'rate_change',
        new_values: { amount_per_km: ratePerKm, effective_from: effectiveFrom },
      });
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        vehicle={vehicle}
        role={userRole}
        config={supabaseConfig}
        onOpenConfig={() => setShowConfigModal(true)}
        onOpenQA={() => setShowQASuiteModal(true)}
        onSelectScreen={handleNavigateScreen}
      />



      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        {currentScreen === 'dashboard' && (
          <Dashboard
            report={monthlyReport}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onNavigate={handleNavigateScreen}
            onSelectDriverForWhatsApp={(summary) =>
              setWhatsAppModalData({ isOpen: true, summary })
            }
            recentTrips={enrichedTrips}
            recentFuel={fuelPurchases}
            recentExpenses={expenses}
            recentPayments={enrichedPayments}
          />
        )}

        {currentScreen === 'record_trip' && (
          <RecordTrip
            vehicle={vehicle}
            drivers={drivers}
            activeRate={activeRate}
            lastOdometer={vehicle.current_odometer_km}
            onSaveTrip={handleSaveTrip}
            onNavigate={handleNavigateScreen}
          />
        )}

        {currentScreen === 'trips' && (
          <TripHistory
            trips={enrichedTrips}
            drivers={drivers}
            role={userRole}
            vehicle={vehicle}
            onUpdateTrip={handleUpdateTrip}
            onVoidTrip={handleVoidTrip}
          />
        )}

        {currentScreen === 'fuel_expenses' && (
          <FuelExpenses
            vehicle={vehicle}
            role={userRole}
            fuelPurchases={fuelPurchases}
            expenses={expenses}
            onAddFuel={handleAddFuel}
            onAddExpense={handleAddExpense}
          />
        )}

        {currentScreen === 'payments' && (
          <Payments
            payments={enrichedPayments}
            drivers={drivers}
            role={userRole}
            currentMonth={selectedMonth}
            onAddPayment={handleAddPayment}
          />
        )}

        {currentScreen === 'settlements' && (
          <Settlements
            report={monthlyReport}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            role={userRole}
            onConfirmSettlement={handleConfirmSettlement}
            onAmendSettlement={handleAmendSettlement}
          />
        )}

        {currentScreen === 'reports' && (
          <Reports
            report={monthlyReport}
            selectedMonth={selectedMonth}
            vehicle={vehicle}
            trips={enrichedTrips}
            payments={enrichedPayments}
            fuelPurchases={fuelPurchases}
            expenses={expenses}
            drivers={drivers}
          />
        )}

        {(currentScreen === 'admin' || currentScreen === 'settings') && (
          <Settings
            vehicle={vehicle}
            drivers={drivers}
            activeRate={activeRate}
            ratesHistory={ratesHistory}
            role={userRole}
            onUpdateRole={handleUpdateRole}
            onUpdateVehicle={handleUpdateVehicle}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onSetNewRate={handleSetNewRate}
            onOpenSupabaseConfig={() => setShowConfigModal(true)}
            onOpenQASuite={() => setShowQASuiteModal(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onSelectScreen={handleNavigateScreen}
        pendingDraftCount={getOfflineDrafts().length}
        incompleteTripsCount={monthlyReport.incompleteTripsTotal}
      />

      {/* Supabase Connection & SQL Setup Modal */}
      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigUpdated={() => {
          refreshConfig();
          loadCloudData();
        }}
      />

      {/* QA Verification Modal */}
      <QASuiteModal
        isOpen={showQASuiteModal}
        onClose={() => setShowQASuiteModal(false)}
      />

      {/* WhatsApp Statement Modal */}
      <WhatsAppModal
        isOpen={whatsAppModalData.isOpen}
        onClose={() => setWhatsAppModalData({ isOpen: false, summary: null })}
        driverSummary={whatsAppModalData.summary}
        vehicle={vehicle}
        month={selectedMonth}
      />

      {/* Pop-Up PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}
