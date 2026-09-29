import { useEffect, useState } from 'react';
import { BookOpen, Clock, Server, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { Runbook } from '@/lib/types';
import { fetchRunbooks } from '@/lib/db';

export function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRunbooks();
        setRunbooks(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-sky-300" />
          Runbooks
        </h1>
        <p className="text-sm text-[#8ab4c0] mt-1">Known resolution playbooks — the AI agent matches these to incoming incidents</p>
      </div>

      {loading ? (
        <div className="ocean-card p-8 text-center text-[#5a8a9e]">Loading runbooks...</div>
      ) : runbooks.length === 0 ? (
        <div className="ocean-card p-8 text-center text-[#5a8a9e]">No runbooks available.</div>
      ) : (
        <div className="space-y-3">
          {runbooks.map((rb) => {
            const isOpen = expanded === rb.id;
            return (
              <div key={rb.id} className="ocean-card ocean-card-hover overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : rb.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Zap className="w-4 h-4 text-[#00d4e0] shrink-0" />
                      <h3 className="text-sm font-semibold text-white">{rb.title}</h3>
                    </div>
                    <p className="text-sm text-[#8ab4c0] mt-1">{rb.trigger_conditions}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#5a8a9e]">
                      {rb.service_name && (
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {rb.service_name}
                        </span>
                      )}
                      {rb.estimated_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{rb.estimated_time_minutes} min
                        </span>
                      )}
                      <span>{rb.steps.length} steps</span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[#5a8a9e] shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#5a8a9e] shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#1a4d63]/50 space-y-2.5 animate-fade-in-up">
                    <div className="text-xs uppercase tracking-wide text-[#5a8a9e] pt-2">Resolution Steps</div>
                    {rb.steps.map((step) => (
                      <div key={step.step} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                          {step.step}
                        </span>
                        <span className="text-sm text-[#b0d4dc] pt-0.5">{step.description}</span>
                      </div>
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
