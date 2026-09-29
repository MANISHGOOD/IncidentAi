import { createClient } from '@supabase/supabase-js';
import type { Incident, MemoryEntry, Runbook, Service } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').order('name');
  if (error) throw error;
  return data as Service[];
}

export async function fetchIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Incident[];
}

export async function fetchIncident(id: string): Promise<Incident | null> {
  const { data, error } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Incident | null;
}

export async function fetchIncidentEvents(incidentId: string) {
  const { data, error } = await supabase
    .from('incident_events')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchMemoryEntries(): Promise<MemoryEntry[]> {
  const { data, error } = await supabase.from('memory_entries').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as MemoryEntry[];
}

export async function fetchRunbooks(): Promise<Runbook[]> {
  const { data, error } = await supabase.from('runbooks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Runbook[];
}

export async function fetchStats() {
  const { count: activeCount } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['investigating', 'identified', 'monitoring']);

  const { count: resolvedCount } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved');

  const { count: memoryCount } = await supabase
    .from('memory_entries')
    .select('*', { count: 'exact', head: true });

  const { count: runbookCount } = await supabase
    .from('runbooks')
    .select('*', { count: 'exact', head: true });

  return {
    activeIncidents: activeCount || 0,
    resolvedIncidents: resolvedCount || 0,
    memoryEntries: memoryCount || 0,
    runbooks: runbookCount || 0,
  };
}

export async function createIncident(input: {
  service_name: string;
  title: string;
  description?: string;
  severity: string;
  symptoms: string;
  error_codes: string[];
  environment: string;
}) {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      ...input,
      status: 'investigating',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Incident;
}

export async function addIncidentEvent(input: {
  incident_id: string;
  event_type: string;
  title: string;
  description: string;
  actor: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('incident_events').insert(input);
  if (error) throw error;
}

export async function resolveIncident(
  id: string,
  resolution: { root_cause: string; resolution: string; outcome: string; confidence: string; similar_incident_id?: string | null }
) {
  const { data, error } = await supabase
    .from('incidents')
    .update({
      ...resolution,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Incident;
}

export async function storeMemory(input: {
  incident_id?: string | null;
  service_name?: string | null;
  category: string;
  key_learnings: string;
  root_cause?: string | null;
  resolution_pattern?: string | null;
  outcome?: string | null;
  tags?: string[];
}) {
  const { error } = await supabase.from('memory_entries').insert(input);
  if (error) throw error;
}
