import type { Severity, IncidentStatus } from '@/lib/types';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/40', dot: 'bg-red-400' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40', dot: 'bg-orange-400' },
    medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-200', border: 'border-yellow-500/40', dot: 'bg-yellow-400' },
    low: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/40', dot: 'bg-sky-400' },
  };
  const c = config[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {severity.toUpperCase()}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config: Record<IncidentStatus, { bg: string; text: string; border: string; label: string; pulse?: boolean }> = {
    investigating: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/40', label: 'Investigating', pulse: true },
    identified: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/40', label: 'Identified' },
    monitoring: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/40', label: 'Monitoring' },
    resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40', label: 'Resolved' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      {c.pulse && <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`} />}
      {c.label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  const config: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40' },
    medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-200', border: 'border-yellow-500/40' },
    low: { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-500/40' },
  };
  const c = config[confidence] || config.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      {confidence} confidence
    </span>
  );
}

export function ServiceStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: 'bg-emerald-400',
    degraded: 'bg-yellow-400',
    down: 'bg-red-400',
  };
  return (
    <span className="relative inline-flex">
      <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      {status !== 'operational' && (
        <span className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${colors[status]} animate-pulse-ring`} />
      )}
    </span>
  );
}
