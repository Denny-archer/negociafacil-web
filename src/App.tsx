import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { defaultFilters, defaultSession, getCatalogs } from './domain';
import type { DashboardFilters, DemoSession, QueryContext, ViewId } from './domain';
import DashboardHeader from './app/DashboardHeader';
import DashboardSidebar from './app/DashboardSidebar';
import DashboardFilterBar from './app/DashboardFilters';
import ProfilePreview from './app/ProfilePreview';
import QueryStatus from './app/QueryStatus';
import { navigation, readView, resetViewFilters } from './app/navigation';
import { useDashboardQuery } from './app/useDashboardQuery';
import WorkspaceView from './components/WorkspaceView';
import Overview from './components/Overview';
import { DocumentContext } from './components/DocumentActions';
import RecordDialog from './features/records/RecordDialog';
import { useRecordDialog } from './features/records/useRecordDialog';
import './app-workspace.css';

export default function App() {
  const [view, setView] = useState<ViewId>(readView);
  const [filters, setFilters] = useState<DashboardFilters>({ ...defaultFilters });
  const [session, setSession] = useState<DemoSession>({ ...defaultSession });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const context = useMemo<QueryContext>(() => ({ filters, session }), [filters, session]);
  const catalogs = useMemo(() => getCatalogs(context), [context]);
  const query = useDashboardQuery(context);
  const { selected, list, close, open, drill, back } = useRecordDialog(context, setNotice);

  useEffect(() => {
    function onHash() {
      setView(readView());
      setMobileMenu(false);
      setFilters(resetViewFilters);
      close();
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [close]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(id: ViewId) {
    if (id !== view) {
      setFilters(resetViewFilters);
      setView(id);
      window.location.hash = id;
    }
    close();
    setMobileMenu(false);
  }
  function filter(key: keyof DashboardFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }
  function refresh() {
    if (query.loading) return;
    query.reload();
    setNotice(
      'Demonstração recarregada. A data-base foi mantida; não houve sincronização com o SISCAF.'
    );
  }

  return (
    <DocumentContext.Provider value={{ context, dataBase: query.dataBase }}>
      <div className="app">
        <DashboardHeader mobileMenu={mobileMenu} toggleMenu={() => setMobileMenu((value) => !value)} />
        <div className="dashboard-shell">
          <DashboardSidebar
            mobileMenu={mobileMenu}
            view={view}
            navigate={navigate}
            closeMenu={() => setMobileMenu(false)}
          />
          <main className="main-content" id="main-content">
            <ProfilePreview session={session} setSession={setSession} />
            <DashboardFilterBar
              filters={filters}
              catalogs={catalogs}
              view={view}
              dataBase={query.dataBase}
              loading={query.loading}
              filter={filter}
              refresh={refresh}
              onClear={() => setFilters({ ...defaultFilters })}
            />
            <QueryStatus {...query} />
            {query.allowContent &&
              (view === 'overview' ? (
                <Overview context={context} onDrill={drill} onNavigate={navigate} />
              ) : (
                <WorkspaceView
                  key={view}
                  view={view}
                  context={context}
                  onOpen={open}
                  onDrill={drill}
                  onNavigate={navigate}
                />
              ))}
          </main>
        </div>
        <footer className="page-footer">
          <span>CREFITO-11 · NegociaFácil</span>
          <span>Protótipo de consulta · dados fictícios · sem conexão com o SISCAF/CRA21</span>
          <span>Data-base preservada em cada documento</span>
        </footer>
        {notice && (
          <div className="toast" role="status">
            <ShieldCheck size={18} />
            {notice}
          </div>
        )}

        <RecordDialog
          selected={selected}
          list={list}
          context={context}
          open={open}
          close={close}
          back={back}
        />
        <span className="sr-only" aria-live="polite">
          Tela atual: {navigation.find((item) => item.id === view)?.label}. Perfil demonstrativo:{' '}
          {session.profile}.
        </span>
      </div>
    </DocumentContext.Provider>
  );
}
