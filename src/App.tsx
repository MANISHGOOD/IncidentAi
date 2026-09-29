import { useEffect, useState } from 'react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { IncidentDetailPage } from '@/pages/IncidentDetailPage';
import { NewIncidentPage } from '@/pages/NewIncidentPage';
import { MemoryPage } from '@/pages/MemoryPage';
import { RunbooksPage } from '@/pages/RunbooksPage';
import { fetchStats } from '@/lib/db';

type View = { page: Page } | { page: 'incident-detail'; incidentId: string };

function App() {
  const [view, setView] = useState<View>({ page: 'dashboard' });
  const [activeCount, setActiveCount] = useState(0);
  const [memoryCount, setMemoryCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const stats = await fetchStats();
        setActiveCount(stats.activeIncidents);
        setMemoryCount(stats.memoryEntries);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentSidebarPage: Page =
    view.page === 'incident-detail' ? 'incidents' : view.page;

  const handleNavigate = (page: Page) => setView({ page });

  const handleSelectIncident = (id: string) => setView({ page: 'incident-detail', incidentId: id });

  const handleBack = () => setView({ page: 'incidents' });

  const refreshStats = async () => {
    try {
      const stats = await fetchStats();
      setActiveCount(stats.activeIncidents);
      setMemoryCount(stats.memoryEntries);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        current={currentSidebarPage}
        onNavigate={handleNavigate}
        activeCount={activeCount}
        memoryCount={memoryCount}
      />
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1400px]">
        {view.page === 'dashboard' && (
          <DashboardPage onNavigate={handleNavigate} onSelectIncident={handleSelectIncident} />
        )}
        {view.page === 'incidents' && <IncidentsPage onSelectIncident={handleSelectIncident} />}
        {view.page === 'incident-detail' && (
          <IncidentDetailPage incidentId={view.incidentId} onBack={handleBack} />
        )}
        {view.page === 'new-incident' && (
          <NewIncidentPage
            onIncidentCreated={(id) => {
              refreshStats();
              handleSelectIncident(id);
            }}
          />
        )}
        {view.page === 'memory' && <MemoryPage />}
        {view.page === 'runbooks' && <RunbooksPage />}
      </main>
    </div>
  );
}

export default App;
