import { Menu } from 'lucide-react';

export default function DashboardHeader({
  mobileMenu,
  toggleMenu,
}: {
  mobileMenu: boolean;
  toggleMenu: () => void;
}) {
  return (
    <header className="page-header">
      <div className="page-brand">
        <h1>
          CREFITO-11 <span>|</span> NegociaFácil
        </h1>
        <p>Dashboard de Cobrança e Negociação</p>
      </div>
      <p className="header-description">
        Visão integrada da carteira,
        <br />
        recuperação e acompanhamento operacional.
      </p>
      <span className="demo-badge">
        <span />
        Dados demonstrativos
      </span>
      <button
        className="mobile-toggle icon-button"
        aria-label="Abrir menu"
        aria-expanded={mobileMenu}
        onClick={toggleMenu}
      >
        <Menu size={23} />
      </button>
    </header>
  );
}
