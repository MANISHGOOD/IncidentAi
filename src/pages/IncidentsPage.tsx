import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { Incident, Severity, IncidentStatus } from '@/lib/types';
import { fetchIncidents } from '@/lib/db';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { timeAgo, severityRank, durationBetween } from '@/lib/agent';

export function IncidentsPage({ onSelectIncident }: { onSelectIncident: (id: string) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchIncidents();
        setIncidents(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter === 'active' && inc.status === 'resolved') return false;
      if (statusFilter === 'resolved' && inc.status !== 'resolved') return false;
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inc.title.toLowerCase().includes(q) ||
          inc.service_name.toLowerCase().includes(q) ||
          inc.symptoms.toLowerCase().includes(q) ||
          (inc.root_cause?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [incidents, search, statusFilter, severityFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Incidents</h1>
        <p className="text-sm text-[#8ab4c0] mt-1">All production incidents — past and present</p>
      </div>

      {/* Filters */}
      <div className="ocean-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a8a9e]" />
          <input
            type="text"
            placeholder="Search incidents, services, root causes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ocean-input w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-[#0d7d8a]/30 text-[#00d4e0] border border-[#00d4e0]/30'
                  : 'bg-[#0a3a52]/40 text-[#8ab4c0] border border-transparent hover:border-[#1a4d63]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                severityFilter === s
                  ? 'bg-[#0d7d8a]/30 text-[#00d4e0] border border-[#00d4e0]/30'
                  : 'bg-[#0a3a52]/40 text-[#8ab4c0] border border-transparent hover:border-[#1a4d63]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="ocean-card p-8 text-center text-[#5a8a9e]">Loading incidents...</div>
      ) : filtered.length === 0 ? (
        <div className="ocean-card p-8 text-center">
          <Filter className="w-8 h-8 text-[#5a8a9e] mx-auto mb-3" />
          <p className="text-[#8ab4c0]">No incidents match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <button
              key={inc.id}
              onClick={() => onSelectIncident(inc.id)}
              className="ocean-card ocean-card-hover p-4 w-full text-left group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono text-[#5a8a9e]">#{inc.incident_number}</span>
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <h3 className="text-white font-medium group-hover:text-[#00d4e0] transition-colors">{inc.title}</h3>
                  <p className="text-sm text-[#8ab4c0] mt-1">{inc.service_name} — {inc.symptoms}</p>
                  {inc.root_cause && (
                    <p className="text-xs text-[#5a8a9e] mt-2 truncate">
                      <span className="text-[#8ab4c0]">Root cause:</span> {inc.root_cause}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#5a8a9e]">
                    <Clock className="w-3.5 h-3.5" />
                    {timeAgo(inc.created_at)}
                  </div>
                  {inc.status === 'resolved' && inc.resolved_at && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {durationBetween(inc.created_at, inc.resolved_at)}
                    </div>
                  )}
                  {inc.status !== 'resolved' && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Active
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
