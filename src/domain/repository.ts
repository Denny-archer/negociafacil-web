/**
 * API pública do domínio demonstrativo.
 * A interface consulta este módulo; a construção de linhas, os filtros e
 * os indicadores vivem em arquivos distintos para permitir manutenção isolada.
 */
import { SOURCE_DATE } from './fixtures';
import { entityKinds } from './rows';
import { getCatalogs, getRow, queryRows } from './queries';
import { getMetrics } from './metrics';
import type { DashboardRepository, EntityKind, EntityRow } from './types';

export { defaultFilters, defaultSession, defaultContext, DEMO_INACTIVITY_DAYS } from './defaults';
export { money, number, formatDate } from './formatters';
export { entityKinds, statusByKind } from './rows';
export { queryRows, filterRows, getRow, getCatalogs } from './queries';
export { getMetrics, getSeries } from './metrics';

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 160));
export const dashboardRepository: DashboardRepository = {
  async getSnapshot(context) { await pause(); return { rows: Object.fromEntries(entityKinds.map(kind => [kind, queryRows(kind, context)])) as Record<EntityKind, EntityRow[]>, dataBase: SOURCE_DATE, availability: { source: 'demo', officialApi: 'pending', officialStatusMapping: 'pending', amountBands: 'pending', ageBands: 'pending', historicalStock: 'pending', cartorialDeadlineRule: 'pending', institutionalGoals: 'pending' }, dataAvailability: { state: 'available', source: 'Demonstração local', asOf: SOURCE_DATE, message: 'Dados sintéticos disponíveis; integração e regras oficiais aguardam homologação.', lastSuccess: SOURCE_DATE } }; },
  async getDetails(ref, context) { await pause(); return getRow(ref, context); },
  async getHistory(ref, context) { await pause(); return getRow(ref, context)?.history ?? []; },
  async getCatalogs(context) { await pause(); return getCatalogs(context); },
  async getIndicators(view, context) { await pause(); return getMetrics(view, context); },
};
