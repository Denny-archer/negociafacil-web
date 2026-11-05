
import type {
  DashboardFilters,
  QueryContext,
} from './types';

// Configurações padrão dos filtros do dashboard
export const defaultFilters: DashboardFilters = {
  from: '',
  to: '',
  exercise: 'all',
  personType: 'all',
  debtType: 'all',
  status: 'all',
  stage: 'all',
  owner: 'all',
  sector: 'all',
  campaign: 'all',
  agreement: 'all',
  activeDebt: 'all',
  protest: 'all',
  amountBand: 'all',
  ageBand: 'all',
  priority: 'all',
  category: 'all',
  region: 'all',
};

// Configuração padrão da sessão do usuário
export const defaultSession = {
  profile: 'Chefia' as const,
  admin: false,
  userId: 'demo-denilson',
  sector: 'Negociação',
};

// Contexto padrão utilizado nas consultas do dashboard
export const defaultContext: QueryContext = {
  filters: defaultFilters,
  session: defaultSession,
};

// Quantidade de dias considerada para inatividade
export const DEMO_INACTIVITY_DAYS = 15;
