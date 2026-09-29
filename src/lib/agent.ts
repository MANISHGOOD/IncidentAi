import type { Incident, MemoryEntry, Runbook, MemoryMatch } from './types';

export interface InvestigationStep {
  type: 'detection' | 'log_analysis' | 'memory_search' | 'ai_recommendation' | 'engineer_action' | 'resolution' | 'memory_stored';
  title: string;
  description: string;
  actor: 'agent' | 'engineer' | 'system';
  delay: number;
}

export interface InvestigationResult {
  steps: InvestigationStep[];
  similarIncidents: MemoryMatch[];
  matchedRunbook: Runbook | null;
  recommendedRootCause: string;
  recommendedResolution: string;
  confidence: 'low' | 'medium' | 'high';
  stepsWithoutMemory: number;
  stepsWithMemory: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function overlapScore(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) common++;
  }
  return common / Math.sqrt(tokensA.size * tokensB.size);
}

export function findSimilarIncidents(
  newIncident: { service_name: string; symptoms: string; error_codes: string[] | null; title: string },
  historical: Incident[]
): MemoryMatch[] {
  const matches: MemoryMatch[] = [];

  for (const inc of historical) {
    if (inc.status !== 'resolved' || !inc.root_cause) continue;

    let score = 0;
    const matchedOn: string[] = [];

    if (inc.service_name.toLowerCase() === newIncident.service_name.toLowerCase()) {
      score += 0.35;
      matchedOn.push('Same service');
    }

    const symptomScore = overlapScore(newIncident.symptoms, inc.symptoms);
    if (symptomScore > 0.1) {
      score += symptomScore * 0.4;
      matchedOn.push('Similar symptoms');
    }

    const newCodes = newIncident.error_codes || [];
    const oldCodes = inc.error_codes || [];
    const sharedCodes = newCodes.filter((c) => oldCodes.includes(c));
    if (sharedCodes.length > 0) {
      score += 0.25;
      matchedOn.push(`Same error code${sharedCodes.length > 1 ? 's' : ''}: ${sharedCodes.join(', ')}`);
    }

    if (inc.service_name.toLowerCase() === newIncident.service_name.toLowerCase() && symptomScore > 0.15) {
      score += 0.1;
      matchedOn.push('Strong pattern match');
    }

    if (score > 0.15) {
      matches.push({ incident: inc, score: Math.min(score, 1), matchedOn });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function findMatchingRunbooks(
  newIncident: { service_name: string; symptoms: string; error_codes: string[] | null },
  runbooks: Runbook[]
): Runbook | null {
  let best: Runbook | null = null;
  let bestScore = 0;

  for (const rb of runbooks) {
    let score = 0;
    if (rb.service_name && rb.service_name.toLowerCase() === newIncident.service_name.toLowerCase()) {
      score += 0.4;
    }
    score += overlapScore(newIncident.symptoms, rb.trigger_conditions) * 0.6;
    if (score > bestScore) {
      bestScore = score;
      best = rb;
    }
  }

  return bestScore > 0.15 ? best : null;
}

export function buildInvestigation(
  newIncident: { service_name: string; symptoms: string; error_codes: string[] | null; title: string; description?: string | null },
  historical: Incident[],
  memoryEntries: MemoryEntry[],
  runbooks: Runbook[]
): InvestigationResult {
  const similar = findSimilarIncidents(newIncident, historical);
  const matchedRunbook = findMatchingRunbooks(newIncident, runbooks);
  const hasMemory = similar.length > 0;

  const steps: InvestigationStep[] = [];

  // Step 1: Detection
  steps.push({
    type: 'detection',
    title: 'Incident detected',
    description: `New incident reported: ${newIncident.title}. Service: ${newIncident.service_name}. Symptoms: ${newIncident.symptoms}`,
    actor: 'system',
    delay: 800,
  });

  // Step 2: Log analysis
  steps.push({
    type: 'log_analysis',
    title: 'Analyzing logs and metrics',
    description: `Agent retrieved application logs, APM traces, and infrastructure metrics for ${newIncident.service_name}. ${
      newIncident.error_codes?.length
        ? `Error codes detected: ${newIncident.error_codes.join(', ')}.`
        : 'No specific error codes in the alert.'
    } Checking error patterns and request flow.`,
    actor: 'agent',
    delay: 1200,
  });

  // Step 3: Memory search
  if (hasMemory) {
    const topMatch = similar[0];
    steps.push({
      type: 'memory_search',
      title: `Searched organizational memory — ${similar.length} similar incident${similar.length > 1 ? 's' : ''} found`,
      description: `Hindsight retrieved ${similar.length} historical incident${similar.length > 1 ? 's' : ''} with similar symptoms. Closest match: Incident #${topMatch.incident.incident_number} (${topMatch.incident.title}) with ${(topMatch.score * 100).toFixed(0)}% similarity. Matched on: ${topMatch.matchedOn.join(', ')}.`,
      actor: 'agent',
      delay: 1000,
    });

    // Step 4: AI recommendation with memory
    const top = similar[0];
    const memoryEntry = memoryEntries.find((m) => m.incident_id === top.incident.id);
    const rootCause = memoryEntry?.root_cause || top.incident.root_cause || 'Unknown';
    const resolution = memoryEntry?.resolution_pattern || top.incident.resolution || 'No resolution recorded';

    steps.push({
      type: 'ai_recommendation',
      title: 'AI Agent: Context-aware recommendation',
      description: `Based on organizational memory, this incident closely matches Incident #${top.incident.incident_number}. Previous root cause: ${rootCause}. Previous resolution: ${resolution}. ${
        matchedRunbook
          ? `A runbook is available: "${matchedRunbook.title}" (${matchedRunbook.estimated_time_minutes || 20} min est.).`
          : 'No runbook available for this pattern.'
      } Agent recommends verifying this root cause against current evidence before applying.`,
      actor: 'agent',
      delay: 1400,
    });

    // Step 5: Engineer action
    steps.push({
      type: 'engineer_action',
      title: 'Engineer verified and applied resolution',
      description: `Engineer reviewed AI recommendation, confirmed the root cause matches current evidence, and applied the resolution steps${matchedRunbook ? ` from the ${matchedRunbook.title}` : ''}.`,
      actor: 'engineer',
      delay: 1000,
    });

    // Step 6: Resolution
    steps.push({
      type: 'resolution',
      title: 'Incident resolved',
      description: `Resolution applied successfully. Root cause: ${rootCause}. The historical pattern from Incident #${top.incident.incident_number} was applicable to this incident.`,
      actor: 'engineer',
      delay: 900,
    });

    // Step 7: Memory stored
    steps.push({
      type: 'memory_stored',
      title: 'New memory stored in Hindsight',
      description: `Incident outcome and learnings stored in organizational memory. This incident reinforces the known pattern for ${newIncident.service_name}. Future incidents will benefit from this confirmation.`,
      actor: 'agent',
      delay: 800,
    });

    return {
      steps,
      similarIncidents: similar,
      matchedRunbook,
      recommendedRootCause: rootCause,
      recommendedResolution: resolution,
      confidence: top.score > 0.6 ? 'high' : top.score > 0.35 ? 'medium' : 'low',
      stepsWithoutMemory: 12,
      stepsWithMemory: steps.length,
    };
  }

  // No memory — generic investigation
  steps.push({
    type: 'memory_search',
    title: 'Searched organizational memory — no matches found',
    description: 'Hindsight found no similar historical incidents. The agent has no prior organizational knowledge for this symptom pattern.',
    actor: 'agent',
    delay: 1000,
  });

  steps.push({
    type: 'ai_recommendation',
    title: 'AI Agent: Generic investigation path',
    description: `No historical context available. Agent recommends a generic investigation: 1) Check service health and recent deployments, 2) Review error logs for stack traces, 3) Check infrastructure metrics (CPU, memory, connections), 4) Verify database connectivity, 5) Review recent config changes. This will take longer without prior knowledge.`,
    actor: 'agent',
    delay: 1400,
  });

  steps.push({
    type: 'engineer_action',
    title: 'Engineer investigating from scratch',
    description: 'Engineer begins manual investigation: checking logs, reviewing metrics, testing hypotheses. No prior context to guide the investigation.',
    actor: 'engineer',
    delay: 1000,
  });

  steps.push({
    type: 'engineer_action',
    title: 'Engineer testing multiple hypotheses',
    description: 'Without historical context, engineer is testing multiple potential causes. This involves checking infrastructure, reviewing code changes, and consulting team members.',
    actor: 'engineer',
    delay: 1000,
  });

  steps.push({
    type: 'resolution',
    title: 'Root cause identified after extended investigation',
    description: 'Root cause found after extended manual investigation. Resolution applied.',
    actor: 'engineer',
    delay: 900,
  });

  steps.push({
    type: 'memory_stored',
    title: 'New memory stored in Hindsight',
    description: 'This incident is the first of its kind in organizational memory. The root cause, resolution, and investigation learnings have been stored for future incidents.',
    actor: 'agent',
    delay: 800,
  });

  return {
    steps,
    similarIncidents: [],
    matchedRunbook: null,
    recommendedRootCause: 'Unknown — requires manual investigation',
    recommendedResolution: 'No historical pattern available. Generic troubleshooting required.',
    confidence: 'low',
    stepsWithoutMemory: 12,
    stepsWithMemory: steps.length,
  };
}

export function severityRank(s: string): number {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return order[s] ?? 4;
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function durationBetween(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
