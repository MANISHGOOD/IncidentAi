import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, CheckCircle, Clock, Zap, Target, BookOpen, Lightbulb, User, Bot, Radio, Save } from 'lucide-react';
import type { Incident, IncidentEvent, MemoryEntry } from '@/lib/types';
import { fetchIncident, fetchIncidentEvents, fetchMemoryEntries } from '@/lib/db';
import { SeverityBadge, StatusBadge, ConfidenceBadge } from '@/components/Badges';
import { timeAgo, durationBetween } from '@/lib/agent';

const eventTypeConfig: Record<string, { icon: typeof Bot; color: string; bg: string; border: string; label: string }> = {
  detection: { icon: Radio, color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Detection' },
  log_analysis: { icon: Target, color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', label: 'Log Analysis' },
  memory_search: { icon: Brain, color: 'text-[#00d4e0]', bg: 'bg-[#00d4e0]/10', border: 'border-[#00d4e0]/30', label: 'Memory Search' },
  ai_recommendation: { icon: Lightbulb, color: 'text-yellow-200', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'AI Recommendation' },
  engineer_action: { icon: User, color: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/30', label: 'Engineer Action' },
  resolution: { icon: CheckCircle, color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Resolution' },
  memory_stored: { icon: Save, color: 'text-[#00d4e0]', bg: 'bg-[#00d4e0]/10', border: 'border-[#00d4e0]/30', label: 'Memory Stored' },
};

export function IncidentDetailPage({ incidentId, onBack }: { incidentId: string; onBack: () => void }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [inc, evts, mems] = await Promise.all([
          fetchIncident(incidentId),
          fetchIncidentEvents(incidentId),
          fetchMemoryEntries(),
        ]);
        setIncident(inc);
        setEvents(evts);
        setMemoryEntries(mems.filter((m) => m.incident_id === incidentId));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [incidentId]);

  if (loading) {
    return <div className="ocean-card p-8 text-center text-[#5a8a9e]">Loading incident...</div>;
  }

  if (!incident) {
    return (
      <div className="ocean-card p-8 text-center">
        <p className="text-[#8ab4c0]">Incident not found.</p>
        <button onClick={onBack} className="ocean-btn-secondary mt-4">Back to Incidents</button>
      </div>
    );
  }

  const relatedMemory = memoryEntries.find((m) => m.incident_id === incident.id);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#8ab4c0] hover:text-[#00d4e0] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </button>

      {/* Incident Header */}
      <div className="ocean-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono text-[#5a8a9e]">#{incident.incident_number}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              {incident.confidence && <ConfidenceBadge confidence={incident.confidence} />}
            </div>
            <h1 className="text-xl font-bold text-white">{incident.title}</h1>
            <p className="text-sm text-[#8ab4c0] mt-2">{incident.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-[#5a8a9e] flex-wrap">
              <span>Service: <span className="text-[#b0d4dc]">{incident.service_name}</span></span>
              <span>Environment: <span className="text-[#b0d4dc]">{incident.environment}</span></span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(incident.created_at)}</span>
              {incident.resolved_at && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <CheckCircle className="w-3 h-3" />
                  Resolved in {durationBetween(incident.created_at, incident.resolved_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="mt-4 pt-4 border-t border-[#1a4d63]/50">
          <div className="text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Symptoms</div>
          <p className="text-sm text-[#b0d4dc]">{incident.symptoms}</p>
          {incident.error_codes && incident.error_codes.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {incident.error_codes.map((code) => (
                <span key={code} className="px-2 py-0.5 rounded text-xs font-mono bg-red-500/15 text-red-300 border border-red-500/30">
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investigation Timeline */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00d4e0]" />
            AI Investigation Timeline
          </h2>
          {events.length === 0 ? (
            <div className="ocean-card p-6 text-center text-[#5a8a9e]">
              No investigation events yet. The AI agent has not processed this incident.
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[#00d4e0]/40 via-[#1a4d63] to-transparent" />

              <div className="space-y-4">
                {events.map((evt, idx) => {
                  const config = eventTypeConfig[evt.event_type] || eventTypeConfig.detection;
                  const Icon = config.icon;
                  return (
                    <div key={evt.id} className="relative pl-14 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                      {/* Timeline dot */}
                      <div className={`absolute left-3 top-1 w-5 h-5 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>
                      {/* Event card */}
                      <div className="ocean-card ocean-card-hover p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                          <span className="text-xs text-[#5a8a9e]">— {evt.actor}</span>
                        </div>
                        <h4 className="text-sm font-medium text-white">{evt.title}</h4>
                        <p className="text-sm text-[#8ab4c0] mt-1">{evt.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Root Cause, Resolution, Memory */}
        <div className="space-y-4">
          {incident.root_cause && (
            <div className="ocean-card p-4 border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-300" />
                <h3 className="text-sm font-semibold text-white">Root Cause</h3>
              </div>
              <p className="text-sm text-[#b0d4dc]">{incident.root_cause}</p>
            </div>
          )}

          {incident.resolution && (
            <div className="ocean-card p-4 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-semibold text-white">Resolution</h3>
              </div>
              <p className="text-sm text-[#b0d4dc]">{incident.resolution}</p>
              {incident.outcome && (
                <div className="mt-2 pt-2 border-t border-[#1a4d63]/50">
                  <span className="text-xs text-[#5a8a9e]">Outcome: </span>
                  <span className={`text-xs font-medium ${incident.outcome === 'successful' ? 'text-emerald-300' : 'text-yellow-200'}`}>
                    {incident.outcome}
                  </span>
                </div>
              )}
            </div>
          )}

          {relatedMemory && (
            <div className="ocean-card p-4 border-[#00d4e0]/20 ocean-glow">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-[#00d4e0]" />
                <h3 className="text-sm font-semibold text-white">Stored in Memory</h3>
              </div>
              <p className="text-sm text-[#b0d4dc]">{relatedMemory.key_learnings}</p>
              {relatedMemory.tags && relatedMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {relatedMemory.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[#00d4e0]/10 text-[#00d4e0] border border-[#00d4e0]/20">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!incident.root_cause && (
            <div className="ocean-card p-4 border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-orange-300" />
                <h3 className="text-sm font-semibold text-white">Awaiting Investigation</h3>
              </div>
              <p className="text-sm text-[#8ab4c0]">
                This incident is currently being investigated. The AI agent will search organizational memory for similar past incidents and recommend a resolution path.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
