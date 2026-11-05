import type { DashboardFilters, QueryContext } from './types';

export const defaultFilters: DashboardFilters = { from: '', to: '', exercise: 'all', personType: 'all', debtType: 'all', status: 'all', stage: 'all', owner: 'all', sector: 'all', campaign: 'all', agreement: 'all', activeDebt: 'all', protest: 'all', amountBand: 'all', ageBand: 'all', priority: 'all', category: 'all', region: 'all' };
export const defaultSession = { profile: 'Chefia' as const, admin: false, userId: 'demo-denilson', sector: 'Negociação' };
export const defaultContext: QueryContext = { filters: defaultFilters, session: defaultSession };
export const DEMO_INACTIVITY_DAYS = 15;
