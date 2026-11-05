import { ShieldCheck } from 'lucide-react';
import type { ViewId } from '../domain';
import type { Navigate } from '../features/workspace/contracts';
import { navigation } from './navigation';

function Brand() {
  return (
    <div className="brand-mark">
      <svg viewBox="0 0 43 43" aria-hidden="true">
        <path d="M33 7A18 18 0 1 0 33 36" fill="none" stroke="#325d75" strokeWidth="2.6" />
        <path d="M30 12A12 12 0 1 0 30 31" fill="none" stroke="#5ba898" strokeWidth="2.6" />
        <path d="M27 17a6 6 0 1 0 0 9" fill="none" stroke="#325d75" strokeWidth="2.6" />
      </svg>
      <div>
        <strong>CREFITO-11</strong>
        <span>
          CONSELHO REGIONAL DE
          <br />
          FISIOTERAPIA E TERAPIA
          <br />
          OCUPACIONAL DA 11ª REGIÃO
        </span>
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileMenu: boolean;
  view: ViewId;
  navigate: Navigate;
  closeMenu: () => void;
}

export default function DashboardSidebar({ mobileMenu, view, navigate, closeMenu }: SidebarProps) {
  return (
    <>
      {mobileMenu && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={closeMenu} />}
      <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
        <div className="sidebar-caption">PAINEL DE GESTÃO</div>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: NavIcon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <NavIcon size={18} />
              <span>{label}</span>
              {view === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Brand />
          <div className="sidebar-footer">
            <ShieldCheck size={12} />
            Ambiente de demonstração
          </div>
        </div>
      </aside>
    </>
  );
}
