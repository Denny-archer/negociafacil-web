import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  Gavel,
  Handshake,
  House,
  Layers3,
  Megaphone,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardFilters, ViewId } from '../domain';
import { defaultFilters } from '../domain';

export const navigation: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Visão Geral', icon: House },
  { id: 'delinquency', label: 'Inadimplência', icon: Layers3 },
  { id: 'collection', label: 'Cobrança', icon: Megaphone },
  { id: 'negotiation', label: 'Negociação', icon: Handshake },
  { id: 'active-debt', label: 'Dívida Ativa', icon: FileText },
  { id: 'protest', label: 'Protesto', icon: Gavel },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'demands', label: 'Demandas', icon: ClipboardList },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
];

export function resolveView(hash: string): ViewId {
  const id = hash === 'service' ? 'demands' : hash === 'exports' ? 'reports' : hash;
  return navigation.find((item) => item.id === id)?.id ?? 'overview';
}

export function readView(): ViewId {
  const original = window.location.hash.slice(1);
  const result = resolveView(original);
  if (original && original !== result)
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${result}`
    );
  return result;
}

export function resetViewFilters(filters: DashboardFilters): DashboardFilters {
  const { status, stage, category, priority } = defaultFilters;
  return { ...filters, status, stage, category, priority };
}
