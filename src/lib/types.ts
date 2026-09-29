export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type ServiceStatus = 'operational' | 'degraded' | 'down';
export type Confidence = 'low' | 'medium' | 'high';
export type Actor = 'agent' | 'engineer' | 'system';

export type EventType =
  | 'detection'
  | 'log_analysis'
  | 'memory_search'
  | 'ai_recommendation'
  | 'engineer_action'
  | 'resolution'
  | 'memory_stored';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  tier: string;
  owner: string | null;
  status: ServiceStatus;
  created_at: string;
}

export interface Incident {
  id: string;
  incident_number: number;
  service_id: string | null;
  service_name: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: IncidentStatus;
  symptoms: string;
  error_codes: string[] | null;
  environment: string;
  root_cause: string | null;
  resolution: string | null;
  outcome: string | null;
  confidence: Confidence | null;
  similar_incident_id: string | null;
  investigation_steps: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  actor: Actor;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  incident_id: string | null;
  service_name: string | null;
  category: string;
  key_learnings: string;
  root_cause: string | null;
  resolution_pattern: string | null;
  outcome: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface Runbook {
  id: string;
  title: string;
  service_name: string | null;
  trigger_conditions: string;
  steps: RunbookStep[];
  estimated_time_minutes: number | null;
  created_at: string;
}

export interface RunbookStep {
  step: number;
  description: string;
}

export interface MemoryMatch {
  incident: Incident;
  score: number;
  matchedOn: string[];
}
