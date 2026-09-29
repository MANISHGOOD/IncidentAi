import { useState, useRef } from 'react';
import { Brain, Bot, Send, Radio, Target, Lightbulb, User, CheckCircle, Save, AlertTriangle, BookOpen, TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import type { Incident, MemoryEntry, Runbook } from '@/lib/types';
import { fetchIncidents, fetchMemoryEntries, fetchRunbooks, createIncident, addIncidentEvent, resolveIncident, storeMemory } from '@/lib/db';
import { buildInvestigation, type InvestigationStep } from '@/lib/agent';
import { SeverityBadge, ConfidenceBadge } from '@/components/Badges';

const eventIconMap: Record<string, typeof Bot> = {
  detection: Radio,
  log_analysis: Target,
  memory_search: Brain,
  ai_recommendation: Lightbulb,
  engineer_action: User,
  resolution: CheckCircle,
  memory_stored: Save,
};

const eventColorMap: Record<string, string> = {
  detection: 'text-orange-300',
  log_analysis: 'text-sky-300',
  memory_search: 'text-[#00d4e0]',
  ai_recommendation: 'text-yellow-200',
  engineer_action: 'text-teal-300',
  resolution: 'text-emerald-300',
  memory_stored: 'text-[#00d4e0]',
};

interface VisibleStep extends InvestigationStep {
  visible: boolean;
}

export function NewIncidentPage({ onIncidentCreated }: { onIncidentCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    service_name: '',
    title: '',
    description: '',
    symptoms: '',
    error_codes: '',
    severity: 'high' as string,
  });
  const [phase, setPhase] = useState<'input' | 'investigating' | 'done'>('input');
  const [visibleSteps, setVisibleSteps] = useState<VisibleStep[]>([]);
  const [result, setResult] = useState<ReturnType<typeof buildInvestigation> | null>(null);
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const handleSubmit = async () => {
    if (!form.service_name || !form.title || !form.symptoms) {
      setError('Service name, title, and symptoms are required.');
      return;
    }

    setError(null);
    setPhase('investigating');
    setVisibleSteps([]);
    setResult(null);

    try {
      const [historical, memoryEntries, runbooks] = await Promise.all([
        fetchIncidents(),
        fetchMemoryEntries(),
        fetchRunbooks(),
      ]);

      const errorCodes = form.error_codes
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const investigation = buildInvestigation(
        {
          service_name: form.service_name,
          title: form.title,
          description: form.description || null,
          symptoms: form.symptoms,
          error_codes: errorCodes.length > 0 ? errorCodes : null,
        },
        historical,
        memoryEntries,
        runbooks
      );

      setResult(investigation);

      // Create the incident in the database
      const inc = await createIncident({
        service_name: form.service_name,
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
        symptoms: form.symptoms,
        error_codes: errorCodes,
        environment: 'production',
      });
      setCreatedIncident(inc);

      // Reveal steps progressively
      let cumulativeDelay = 0;
      const steps: VisibleStep[] = investigation.steps.map((s) => ({
        ...s,
        visible: false,
      }));
      setVisibleSteps([...steps]);

      investigation.steps.forEach((step, idx) => {
        cumulativeDelay += step.delay;
        const timer = setTimeout(() => {
          setVisibleSteps((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], visible: true };
            return next;
          });

          // Store event in database
          addIncidentEvent({
            incident_id: inc.id,
            event_type: step.type,
            title: step.title,
            description: step.description,
            actor: step.actor,
          }).catch(console.error);
        }, cumulativeDelay);
        timersRef.current.push(timer);
      });

      // After all steps, finalize
      const finalTimer = setTimeout(async () => {
        if (investigation.similarIncidents.length > 0) {
          const top = investigation.similarIncidents[0];
          await resolveIncident(inc.id, {
            root_cause: investigation.recommendedRootCause,
            resolution: investigation.recommendedResolution,
            outcome: 'successful',
            confidence: investigation.confidence,
            similar_incident_id: top.incident.id,
          });

          await storeMemory({
            incident_id: inc.id,
            service_name: form.service_name,
            category: 'incident_memory',
            key_learnings: `Resolved: ${investigation.recommendedRootCause} | Fix: ${investigation.recommendedResolution}`,
            root_cause: investigation.recommendedRootCause,
            resolution_pattern: investigation.recommendedResolution,
            outcome: 'successful',
            tags: top.incident.error_codes || ['general'],
          });
        } else {
          await resolveIncident(inc.id, {
            root_cause: investigation.recommendedRootCause,
            resolution: investigation.recommendedResolution,
            outcome: 'partial',
            confidence: 'low',
          });

          await storeMemory({
            incident_id: inc.id,
            service_name: form.service_name,
            category: 'incident_memory',
            key_learnings: `First occurrence: ${investigation.recommendedRootCause} | Investigated from scratch without historical context.`,
            root_cause: investigation.recommendedRootCause,
            resolution_pattern: investigation.recommendedResolution,
            outcome: 'partial',
            tags: ['first-occurrence'],
          });
        }
        setPhase('done');
      }, cumulativeDelay + 500);
      timersRef.current.push(finalTimer);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to run investigation');
      setPhase('input');
    }
  };

  const handleReset = () => {
    clearTimers();
    setPhase('input');
    setVisibleSteps([]);
    setResult(null);
    setCreatedIncident(null);
    setForm({ service_name: '', title: '', description: '', symptoms: '', error_codes: '', severity: 'high' });
  };

  const exampleScenarios = [
    { label: 'Payment API 503', service: 'Payment API', title: 'Payment API returning HTTP 503', symptoms: 'HTTP 503 Service Unavailable, connection timeouts, high response times', codes: '503', severity: 'high' },
    { label: 'Auth Timeout', service: 'Auth Service', title: 'Authentication service timeout on login', symptoms: 'HTTP 504 Gateway Timeout, login page unresponsive, session creation failing', codes: '504', severity: 'critical' },
    { label: 'Queue Backlog', service: 'Notification Service', title: 'Notification queue backlog growing', symptoms: 'Queue backlog, delayed notifications, consumer lag, high queue depth', codes: '200', severity: 'medium' },
    { label: 'Search 500', service: 'Search Service', title: 'Search service returning 500 errors', symptoms: 'HTTP 500 Internal Server Error, Elasticsearch cluster red, shard allocation failures', codes: '500', severity: 'high' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Report New Incident</h1>
        <p className="text-sm text-[#8ab4c0] mt-1">The AI agent will investigate using organizational memory from past incidents</p>
      </div>

      {phase === 'input' && (
        <>
          {/* Quick scenario buttons */}
          <div className="ocean-card p-4">
            <div className="text-xs uppercase tracking-wide text-[#5a8a9e] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00d4e0]" />
              Quick Scenarios
            </div>
            <div className="flex flex-wrap gap-2">
              {exampleScenarios.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setForm({ service_name: s.service, title: s.title, description: '', symptoms: s.symptoms, error_codes: s.codes, severity: s.severity })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0a3a52]/50 text-[#b0d4dc] border border-[#1a4d63]/60 hover:border-[#00d4e0]/40 hover:text-[#00d4e0] transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="ocean-card p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Service Name</label>
                <input
                  type="text"
                  value={form.service_name}
                  onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                  placeholder="e.g. Payment API"
                  className="ocean-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="ocean-input w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Payment API returning HTTP 503"
                className="ocean-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Symptoms</label>
              <textarea
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                placeholder="Describe what's happening: error codes, response times, affected functionality..."
                rows={3}
                className="ocean-input w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Error Codes (comma-separated)</label>
                <input
                  type="text"
                  value={form.error_codes}
                  onChange={(e) => setForm({ ...form, error_codes: e.target.value })}
                  placeholder="e.g. 503, 504"
                  className="ocean-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#5a8a9e] mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional context"
                  className="ocean-input w-full"
                />
              </div>
            </div>

            <button onClick={handleSubmit} className="ocean-btn-primary w-full flex items-center justify-center gap-2 py-3">
              <Send className="w-4 h-4" />
              Launch AI Investigation
            </button>
          </div>
        </>
      )}

      {(phase === 'investigating' || phase === 'done') && (
        <div className="space-y-6">
          {/* Incident Summary */}
          <div className="ocean-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <SeverityBadge severity={form.severity as 'low' | 'medium' | 'high' | 'critical'} />
              <span className="text-xs text-[#5a8a9e]">{form.service_name}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{form.title}</h2>
            <p className="text-sm text-[#8ab4c0] mt-1">{form.symptoms}</p>
          </div>

          {/* Agent Investigation Timeline */}
          <div className="ocean-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0d7d8a] to-[#0a6373] flex items-center justify-center ocean-glow">
                <Bot className="w-4 h-4 text-[#00d4e0]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">IncidentMind Agent</h3>
                <p className="text-xs text-[#5a8a9e]">
                  {phase === 'investigating' ? 'Investigating...' : 'Investigation complete'}
                </p>
              </div>
              {phase === 'investigating' && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#00d4e0] typing-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[#00d4e0]/40 via-[#1a4d63] to-transparent" />
              <div className="space-y-3">
                {visibleSteps.map((step, idx) => {
                  const Icon = eventIconMap[step.type] || Radio;
                  const color = eventColorMap[step.type] || 'text-[#8ab4c0]';
                  return (
                    <div
                      key={idx}
                      className={`relative pl-12 transition-all duration-500 ${
                        step.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden'
                      }`}
                    >
                      <div className={`absolute left-2 top-1 w-5 h-5 rounded-full bg-[#0a3a52] border border-[#1a4d63] flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                      </div>
                      <div className="ocean-card ocean-card-hover p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${color}`}>{step.title}</span>
                          <span className="text-[10px] text-[#5a8a9e] uppercase">{step.actor}</span>
                        </div>
                        <p className="text-sm text-[#b0d4dc]">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results */}
          {phase === 'done' && result && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Similar Incidents */}
              {result.similarIncidents.length > 0 && (
                <div className="ocean-card p-5 border-[#00d4e0]/20 ocean-glow">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-[#00d4e0]" />
                    <h3 className="text-sm font-semibold text-white">
                      Organizational Memory Matches — {result.similarIncidents.length} similar incident{result.similarIncidents.length > 1 ? 's' : ''} found
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {result.similarIncidents.map((match, idx) => (
                      <div key={match.incident.id} className="p-3 rounded-lg bg-[#0a3a52]/40 border border-[#1a4d63]/50">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            #{match.incident.incident_number} — {match.incident.title}
                          </span>
                          <span className="text-xs font-mono text-[#00d4e0]">{(match.score * 100).toFixed(0)}% match</span>
                        </div>
                        <p className="text-xs text-[#8ab4c0] mb-1.5">{match.incident.root_cause}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.matchedOn.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded text-[10px] bg-[#00d4e0]/10 text-[#00d4e0] border border-[#00d4e0]/20">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="ocean-card p-5 border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-200" />
                  <h3 className="text-sm font-semibold text-white">AI Agent Recommendation</h3>
                  <ConfidenceBadge confidence={result.confidence} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#5a8a9e] mb-1">Likely Root Cause</div>
                    <p className="text-sm text-[#b0d4dc]">{result.recommendedRootCause}</p>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#5a8a9e] mb-1">Recommended Resolution</div>
                    <p className="text-sm text-[#b0d4dc]">{result.recommendedResolution}</p>
                  </div>
                </div>
              </div>

              {/* Runbook */}
              {result.matchedRunbook && (
                <div className="ocean-card p-5 border-sky-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-sky-300" />
                    <h3 className="text-sm font-semibold text-white">Matched Runbook: {result.matchedRunbook.title}</h3>
                    {result.matchedRunbook.estimated_time_minutes && (
                      <span className="text-xs text-[#5a8a9e]">~{result.matchedRunbook.estimated_time_minutes} min</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {result.matchedRunbook.steps.map((step) => (
                      <div key={step.step} className="flex items-start gap-2.5 text-sm">
                        <span className="w-5 h-5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {step.step}
                        </span>
                        <span className="text-[#b0d4dc]">{step.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison */}
              <div className="ocean-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Investigation Efficiency</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-orange-300" />
                      <span className="text-xs text-orange-300 uppercase tracking-wide">Without Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{result.stepsWithoutMemory}</div>
                    <div className="text-xs text-[#5a8a9e] mt-1">investigation steps</div>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-300" />
                      <span className="text-xs text-emerald-300 uppercase tracking-wide">With Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{result.stepsWithMemory}</div>
                    <div className="text-xs text-[#5a8a9e] mt-1">investigation steps</div>
                  </div>
                </div>
                {result.similarIncidents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1a4d63]/50 text-center">
                    <span className="text-sm text-[#00d4e0] font-medium">
                      {Math.round((1 - result.stepsWithMemory / result.stepsWithoutMemory) * 100)}% faster resolution with organizational memory
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {createdIncident && (
                  <button
                    onClick={() => onIncidentCreated(createdIncident.id)}
                    className="ocean-btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    View Incident Details
                  </button>
                )}
                <button onClick={handleReset} className="ocean-btn-secondary flex items-center justify-center gap-2">
                  Report Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
