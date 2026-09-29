import { Activity, AlertTriangle, Brain, BookOpen, LayoutDashboard, Plus } from 'lucide-react';

export type Page = 'dashboard' | 'incidents' | 'new-incident' | 'memory' | 'runbooks';

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
  activeCount: number;
  memoryCount: number;
}

export function Sidebar({ current, onNavigate, activeCount, memoryCount }: SidebarProps) {
  const items: { id: Page; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badge: activeCount },
    { id: 'new-incident', label: 'New Incident', icon: Plus },
    { id: 'memory', label: 'Memory', icon: Brain, badge: memoryCount },
    { id: 'runbooks', label: 'Runbooks', icon: BookOpen },
  ];

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-[#1a4d63]/60 bg-[#04293f]/80 backdrop-blur-md flex flex-col">
      <div className="px-5 py-5 border-b border-[#1a4d63]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0d7d8a] to-[#0a6373] flex items-center justify-center ocean-glow">
            <Activity className="w-5 h-5 text-[#00d4e0]" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">IncidentMind</div>
            <div className="text-[10px] text-[#5a8a9e] uppercase tracking-widest">AI Incident Response</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-[#0d7d8a]/30 to-transparent text-[#00d4e0] border border-[#00d4e0]/20'
                  : 'text-[#8ab4c0] hover:bg-[#0a3a52]/50 hover:text-[#b0d4dc] border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#00d4e0]' : ''}`} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  active ? 'bg-[#00d4e0]/20 text-[#00d4e0]' : 'bg-[#1a4d63]/60 text-[#8ab4c0]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#1a4d63]/50">
        <div className="flex items-center gap-2 text-xs text-[#5a8a9e]">
          <Brain className="w-3.5 h-3.5 text-[#0d7d8a]" />
          <span>Powered by Hindsight Memory</span>
        </div>
      </div>
    </aside>
  );
}
