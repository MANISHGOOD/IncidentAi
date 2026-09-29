import { useEffect, useState, useMemo } from 'react';
import { Brain, Search, Tag, Server, Clock, Lightbulb } from 'lucide-react';
import type { MemoryEntry } from '@/lib/types';
import { fetchMemoryEntries } from '@/lib/db';
import { timeAgo } from '@/lib/agent';

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  incident_memory: { label: 'Incident Memory', color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  investigation_memory: { label: 'Investigation Memory', color: 'text-yellow-200', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  organizational_memory: { label: 'Organizational Memory', color: 'text-[#00d4e0]', bg: 'bg-[#00d4e0]/10', border: 'border-[#00d4e0]/30' },
};

export function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMemoryEntries();
        setEntries(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.key_learnings.toLowerCase().includes(q) ||
          (e.root_cause?.toLowerCase().includes(q) ?? false) ||
          (e.resolution_pattern?.toLowerCase().includes(q) ?? false) ||
          (e.service_name?.toLowerCase().includes(q) ?? false) ||
          (e.tags?.some((t) => t.includes(q)) ?? false)
        );
      }
      return true;
    });
  }, [entries, search, categoryFilter]);

  const categories = ['all', 'incident_memory', 'investigation_memory', 'organizational_memory'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-[#00d4e0]" />
          Organizational Memory
        </h1>
        <p className="text-sm text-[#8ab4c0] mt-1">Accumulated knowledge from past incidents — the AI agent draws from this during investigations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {categories.slice(1).map((cat) => {
          const config = categoryConfig[cat];
          const count = entries.filter((e) => e.category === cat).length;
          return (
            <div key={cat} className={`ocean-card p-4 ${config.bg} ${config.border}`}>
              <div className={`text-xs uppercase tracking-wide ${config.color} mb-1`}>{config.label}</div>
              <div className="text-2xl font-bold text-white">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="ocean-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a8a9e]" />
          <input
            type="text"
            placeholder="Search memory by learnings, root cause, service, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ocean-input w-full pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === c
                  ? 'bg-[#0d7d8a]/30 text-[#00d4e0] border border-[#00d4e0]/30'
                  : 'bg-[#0a3a52]/40 text-[#8ab4c0] border border-transparent hover:border-[#1a4d63]'
              }`}
            >
              {c === 'all' ? 'All' : categoryConfig[c]?.label || c}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.slice(0, 15).map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              className="px-2.5 py-1 rounded-full text-xs bg-[#00d4e0]/8 text-[#00d4e0] border border-[#00d4e0]/20 hover:bg-[#00d4e0]/15 transition-all"
            >
              <Tag className="w-3 h-3 inline mr-1" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Memory Entries */}
      {loading ? (
        <div className="ocean-card p-8 text-center text-[#5a8a9e]">Loading memory...</div>
      ) : filtered.length === 0 ? (
        <div className="ocean-card p-8 text-center text-[#5a8a9e]">No memory entries match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry) => {
            const config = categoryConfig[entry.category] || categoryConfig.incident_memory;
            return (
              <div key={entry.id} className={`ocean-card ocean-card-hover p-4 border ${config.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bg} ${config.color} border ${config.border}`}>
                    {config.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#5a8a9e]">
                    <Clock className="w-3 h-3" />
                    {timeAgo(entry.created_at)}
                  </span>
                </div>

                {entry.service_name && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8ab4c0] mb-2">
                    <Server className="w-3 h-3" />
                    {entry.service_name}
                  </div>
                )}

                <p className="text-sm text-[#b0d4dc] mb-3">{entry.key_learnings}</p>

                {entry.root_cause && (
                  <div className="mb-2">
                    <span className="text-xs text-[#5a8a9e] uppercase tracking-wide">Root Cause</span>
                    <p className="text-sm text-[#b0d4dc] mt-0.5">{entry.root_cause}</p>
                  </div>
                )}

                {entry.resolution_pattern && (
                  <div className="mb-2">
                    <span className="text-xs text-[#5a8a9e] uppercase tracking-wide">Resolution</span>
                    <p className="text-sm text-[#b0d4dc] mt-0.5">{entry.resolution_pattern}</p>
                  </div>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#1a4d63]/50">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[#0a3a52]/60 text-[#8ab4c0] border border-[#1a4d63]/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
