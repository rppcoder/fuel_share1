-- ==============================================================================
-- FuelShare PWA — Master Database Migration (Supabase PostgreSQL)
-- Migration: 20261022000000_fuelshare_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HOUSEHOLDS
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. HOUSEHOLD MEMBERS
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (household_id, user_id)
);

-- 4. VEHICLES (Shared Three-Wheelers / Tuk-Tuks)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  registration_identifier VARCHAR(40) NOT NULL,
  vehicle_type VARCHAR(40) NOT NULL DEFAULT 'three_wheeler',
  current_odometer_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (current_odometer_km >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. DRIVERS
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  whatsapp_number VARCHAR(30),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CONTRIBUTION RATES
CREATE TABLE IF NOT EXISTS public.contribution_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  amount_per_km NUMERIC(10, 2) NOT NULL CHECK (amount_per_km > 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_odometer_km NUMERIC(10, 2) NOT NULL CHECK (start_odometer_km >= 0),
  end_odometer_km NUMERIC(10, 2) CHECK (end_odometer_km IS NULL OR end_odometer_km >= start_odometer_km),
  distance_km NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_odometer_km IS NOT NULL AND end_odometer_km >= start_odometer_km 
      THEN end_odometer_km - start_odometer_km 
      ELSE 0 
    END
  ) STORED,
  rate_per_km_snapshot NUMERIC(10, 2) NOT NULL CHECK (rate_per_km_snapshot >= 0),
  calculated_contribution NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (calculated_contribution >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'incomplete', 'completed', 'void')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_completed_trip CHECK (
    status != 'completed' OR (end_odometer_km IS NOT NULL AND end_odometer_km >= start_odometer_km)
  )
);

-- 8. FUEL PURCHASES (Actual petrol / fuel expenditure)
CREATE TABLE IF NOT EXISTS public.fuel_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fuel_type VARCHAR(40) NOT NULL DEFAULT 'Petrol 92 Octane',
  amount_lkr NUMERIC(10, 2) NOT NULL CHECK (amount_lkr > 0),
  litres NUMERIC(8, 2) CHECK (litres IS NULL OR litres > 0),
  odometer_km NUMERIC(10, 2) CHECK (odometer_km IS NULL OR odometer_km >= 0),
  paid_by VARCHAR(100) NOT NULL,
  receipt_path TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. EXPENSES (Maintenance, spare parts, tyre repair, servicing, etc.)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('maintenance', 'tyres', 'insurance', 'revenue_license', 'service', 'spare_parts', 'other')),
  amount_lkr NUMERIC(10, 2) NOT NULL CHECK (amount_lkr > 0),
  paid_by VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  receipt_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. PAYMENTS (Driver cash/bank deposits allocated to monthly contributions)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  amount_lkr NUMERIC(10, 2) NOT NULL CHECK (amount_lkr > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'ez_cash', 'other')),
  allocated_month VARCHAR(7) NOT NULL, -- Format 'YYYY-MM'
  reference VARCHAR(100),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. SETTLEMENTS (Monthly audit lock and snapshot)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  settlement_month VARCHAR(7) NOT NULL, -- Format 'YYYY-MM'
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'amended')),
  summary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  amended_at TIMESTAMPTZ,
  UNIQUE (household_id, vehicle_id, settlement_month)
);

-- 12. AUDIT LOGS (Immutable historical ledger of financial updates/voids)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(30) NOT NULL, -- 'create', 'update', 'void', 'confirm_settlement', 'rate_change'
  previous_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR FAST REPORTING AND MONTHLY SETTLEMENTS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_household_date ON public.trips(household_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_household_date ON public.fuel_purchases(household_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON public.expenses(household_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_payments_household_month ON public.payments(household_id, allocated_month);
CREATE INDEX IF NOT EXISTS idx_audit_logs_household ON public.audit_logs(household_id, created_at DESC);

-- ==============================================================================
-- DATABASE HELPER FUNCTIONS
-- ==============================================================================

-- Function to check if current user is an active member of a household
CREATE OR REPLACE FUNCTION public.is_household_member(h_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = h_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Function to check if current user is an admin of a household
CREATE OR REPLACE FUNCTION public.is_household_admin(h_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = h_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- Function to automatically update vehicle current_odometer_km when completed trip is recorded
CREATE OR REPLACE FUNCTION public.fn_update_vehicle_odometer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.end_odometer_km IS NOT NULL THEN
    UPDATE public.vehicles
    SET current_odometer_km = GREATEST(current_odometer_km, NEW.end_odometer_km),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_odometer ON public.trips;
CREATE TRIGGER trg_trip_odometer
AFTER INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.fn_update_vehicle_odometer();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Households Policies
CREATE POLICY "Members can view their households"
  ON public.households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create a household"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Household Members Policies
CREATE POLICY "Members can view members in their household"
  ON public.household_members FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins can manage household members"
  ON public.household_members FOR ALL
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- Self insert allowed when creating first admin for household
CREATE POLICY "Users can add self as initial admin"
  ON public.household_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Vehicles Policies
CREATE POLICY "Members can view vehicles"
  ON public.vehicles FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 4. Drivers Policies
CREATE POLICY "Members can view drivers"
  ON public.drivers FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins can manage drivers"
  ON public.drivers FOR ALL
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 5. Contribution Rates Policies
CREATE POLICY "Members can view rates"
  ON public.contribution_rates FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins can insert rates"
  ON public.contribution_rates FOR INSERT
  WITH CHECK (public.is_household_admin(household_id));

-- 6. Trips Policies
CREATE POLICY "Members can view trips"
  ON public.trips FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can insert trips"
  ON public.trips FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Authorized members or admins can update trips"
  ON public.trips FOR UPDATE
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

-- 7. Fuel Purchases Policies
CREATE POLICY "Members can view fuel purchases"
  ON public.fuel_purchases FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can record fuel purchases"
  ON public.fuel_purchases FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Admins can modify fuel purchases"
  ON public.fuel_purchases FOR UPDATE
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 8. Expenses Policies
CREATE POLICY "Members can view expenses"
  ON public.expenses FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can record expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Admins can modify expenses"
  ON public.expenses FOR UPDATE
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 9. Payments Policies
CREATE POLICY "Members can view payments"
  ON public.payments FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins or members can record payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Admins can modify payments"
  ON public.payments FOR UPDATE
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 10. Settlements Policies
CREATE POLICY "Members can view settlements"
  ON public.settlements FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Admins can confirm or amend settlements"
  ON public.settlements FOR ALL
  USING (public.is_household_admin(household_id))
  WITH CHECK (public.is_household_admin(household_id));

-- 11. Audit Logs Policies
CREATE POLICY "Members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can append audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

-- ==============================================================================
-- STORAGE CONFIGURATION (Receipt Photos)
-- ==============================================================================
-- Note: Create private bucket 'fuelshare-receipts' in Supabase Storage UI or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('fuelshare-receipts', 'fuelshare-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated members can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fuelshare-receipts');

CREATE POLICY "Authenticated members can read receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fuelshare-receipts');
