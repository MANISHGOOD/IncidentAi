import { useEffect, useState } from 'react';
import { AlertTriangle, Brain, BookOpen, CheckCircle, TrendingUp, Zap, ArrowRight, Clock } from 'lucide-react';
import type { Incident } from '@/lib/types';
import { fetchIncidents, fetchStats } from '@/lib/db';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { timeAgo, severityRank } from '@/lib/agent';
import type { Page } from '@/components/Sidebar';

export function DashboardPage({ onNavigate, onSelectIncident }: { onNavigate: (p: Page) => void; onSelectIncident: (id: string) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState({ activeIncidents: 0, resolvedIncidents: 0, memoryEntries: 0, runbooks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [incs, st] = await Promise.all([fetchIncidents(), fetchStats()]);
        setIncidents(incs);
        setStats(st);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved').sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const recentResolved = incidents.filter((i) => i.status === 'resolved').slice(0, 5);

  const statCards = [
    { label: 'Active Incidents', value: stats.activeIncidents, icon: AlertTriangle, color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { label: 'Resolved', value: stats.resolvedIncidents, icon: CheckCircle, color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { label: 'Memory Entries', value: stats.memoryEntries, icon: Brain, color: 'text-[#00d4e0]', bg: 'bg-[#00d4e0]/10', border: 'border-[#00d4e0]/30' },
    { label: 'Runbooks', value: stats.runbooks, icon: BookOpen, color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">NOC Dashboard</h1>
        <p className="text-sm text-[#8ab4c0] mt-1">Real-time incident overview with organizational memory insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`ocean-card ocean-card-hover p-5 ${s.bg} ${s.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '—' : s.value}</div>
              <div className="text-xs text-[#8ab4c0] mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Incidents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-300" />
              Active Incidents
            </h2>
            <button onClick={() => onNavigate('new-incident')} className="ocean-btn-primary text-sm flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              New Incident
            </button>
          </div>

          {loading ? (
            <div className="ocean-card p-8 text-center text-[#5a8a9e]">Loading incidents...</div>
          ) : activeIncidents.length === 0 ? (
            <div className="ocean-card p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-[#8ab4c0]">All systems operational. No active incidents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="ocean-card ocean-card-hover p-4 w-full text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-[#5a8a9e]">#{inc.incident_number}</span>
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                      </div>
                      <h3 className="text-white font-medium truncate group-hover:text-[#00d4e0] transition-colors">{inc.title}</h3>
                      <p className="text-sm text-[#8ab4c0] mt-1 truncate">{inc.service_name} — {inc.symptoms}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#5a8a9e] shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(inc.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Resolved + Memory Impact */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-300" />
            Recently Resolved
          </h2>
          {loading ? (
            <div className="ocean-card p-6 text-center text-[#5a8a9e]">Loading...</div>
          ) : (
            <div className="space-y-2">
              {recentResolved.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="ocean-card ocean-card-hover p-3 w-full text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-[#5a8a9e]">#{inc.incident_number}</span>
                  </div>
                  <p className="text-sm text-[#b0d4dc] truncate group-hover:text-[#00d4e0] transition-colors">{inc.title}</p>
                  <p className="text-xs text-[#5a8a9e] mt-0.5">{inc.root_cause?.slice(0, 60)}...</p>
                </button>
              ))}
            </div>
          )}

          {/* Memory Impact Card */}
          <div className="ocean-card p-5 border-[#00d4e0]/20 ocean-glow">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-[#00d4e0]" />
              <h3 className="text-sm font-semibold text-white">Memory Impact</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8ab4c0]">Avg. steps without memory</span>
                  <span className="text-orange-300 font-mono">12</span>
                </div>
                <div className="h-2 bg-[#0a3a52] rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500/60 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8ab4c0]">Avg. steps with memory</span>
                  <span className="text-emerald-300 font-mono">5</span>
                </div>
                <div className="h-2 bg-[#0a3a52] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="pt-2 border-t border-[#1a4d63]/50">
                <div className="flex items-center gap-1.5 text-xs text-[#00d4e0]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-medium">58% faster resolution</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => onNavigate('memory')} className="ocean-card ocean-card-hover p-4 w-full text-left flex items-center justify-between group">
            <div>
              <div className="text-sm text-white font-medium">Browse Memory</div>
              <div className="text-xs text-[#5a8a9e] mt-0.5">Organizational knowledge base</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#5a8a9e] group-hover:text-[#00d4e0] transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
