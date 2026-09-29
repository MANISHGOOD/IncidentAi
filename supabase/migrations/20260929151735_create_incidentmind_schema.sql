/*
# IncidentMind Schema — Initial Migration

## Purpose
Creates the full data model for IncidentMind, an AI incident-response agent that
remembers how a company solved previous production incidents and uses that
accumulated knowledge (organizational memory) to help resolve future incidents faster.

## New Tables
1. `services` — catalog of monitored services (e.g. Payment API, Auth Service)
2. `incidents` — production incidents with severity, status, symptoms, root cause, resolution, outcome
3. `incident_events` — timeline events for each incident (detection, investigation steps, resolution actions, AI agent actions)
4. `memory_entries` — organizational memory entries: lessons learned, recurring patterns, remediation patterns
5. `runbooks` — known resolution playbooks linked to services and symptom patterns

## Security
- All tables use RLS enabled.
- This is a single-tenant demo app (no sign-in), so policies allow anon + authenticated full CRUD (data is intentionally shared/public).
*/

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tier text NOT NULL DEFAULT 'critical',
  owner text,
  status text NOT NULL DEFAULT 'operational',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number integer GENERATED ALWAYS AS IDENTITY UNIQUE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'investigating',
  symptoms text NOT NULL,
  error_codes text[],
  environment text NOT NULL DEFAULT 'production',
  root_cause text,
  resolution text,
  outcome text,
  confidence text,
  similar_incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  investigation_steps integer DEFAULT 0,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- incident_events (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  actor text NOT NULL DEFAULT 'agent',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- memory_entries (organizational memory)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  service_name text,
  category text NOT NULL,
  key_learnings text NOT NULL,
  root_cause text,
  resolution_pattern text,
  outcome text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- runbooks
-- ============================================================
CREATE TABLE IF NOT EXISTS runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  service_name text,
  trigger_conditions text NOT NULL,
  steps jsonb NOT NULL,
  estimated_time_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_name);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incident_events_incident ON incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_memory_entries_service ON memory_entries(service_name);

-- ============================================================
-- RLS — single-tenant demo, data is intentionally shared
-- ============================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;

-- services policies
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE TO anon, authenticated USING (true);

-- incidents policies
DROP POLICY IF EXISTS "anon_select_incidents" ON incidents;
CREATE POLICY "anon_select_incidents" ON incidents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_incidents" ON incidents;
CREATE POLICY "anon_insert_incidents" ON incidents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_incidents" ON incidents;
CREATE POLICY "anon_update_incidents" ON incidents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_incidents" ON incidents;
CREATE POLICY "anon_delete_incidents" ON incidents FOR DELETE TO anon, authenticated USING (true);

-- incident_events policies
DROP POLICY IF EXISTS "anon_select_incident_events" ON incident_events;
CREATE POLICY "anon_select_incident_events" ON incident_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_incident_events" ON incident_events;
CREATE POLICY "anon_insert_incident_events" ON incident_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_incident_events" ON incident_events;
CREATE POLICY "anon_update_incident_events" ON incident_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_incident_events" ON incident_events;
CREATE POLICY "anon_delete_incident_events" ON incident_events FOR DELETE TO anon, authenticated USING (true);

-- memory_entries policies
DROP POLICY IF EXISTS "anon_select_memory_entries" ON memory_entries;
CREATE POLICY "anon_select_memory_entries" ON memory_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_memory_entries" ON memory_entries;
CREATE POLICY "anon_insert_memory_entries" ON memory_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_memory_entries" ON memory_entries;
CREATE POLICY "anon_update_memory_entries" ON memory_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_memory_entries" ON memory_entries;
CREATE POLICY "anon_delete_memory_entries" ON memory_entries FOR DELETE TO anon, authenticated USING (true);

-- runbooks policies
DROP POLICY IF EXISTS "anon_select_runbooks" ON runbooks;
CREATE POLICY "anon_select_runbooks" ON runbooks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_runbooks" ON runbooks;
CREATE POLICY "anon_insert_runbooks" ON runbooks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_runbooks" ON runbooks;
CREATE POLICY "anon_update_runbooks" ON runbooks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_runbooks" ON runbooks;
CREATE POLICY "anon_delete_runbooks" ON runbooks FOR DELETE TO anon, authenticated USING (true);

-- updated_at trigger for incidents
DROP TRIGGER IF EXISTS trg_incidents_updated_at ON incidents;
CREATE TRIGGER trg_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();