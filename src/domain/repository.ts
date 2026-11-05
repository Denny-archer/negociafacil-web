
/**
 * API pública do domínio demonstrativo.
 * A interface consulta este módulo; a construção de linhas, os filtros e
 * os indicadores vivem em arquivos distintos para permitir manutenção isolada.
 */

import { SOURCE_DATE } from './fixtures';
import { entityKinds } from './rows';
import { getCatalogs, getRow, queryRows } from './queries';
import { getMetrics } from './metrics';

import type {
  DashboardRepository,
  EntityKind,
  EntityRow,
} from './types';

// Exportações das configurações padrão
export {
  defaultFilters,
  defaultSession,
  defaultContext,
  DEMO_INACTIVITY_DAYS,
} from './defaults';

// Exportações dos formatadores
export {
  money,
  number,
  formatDate,
} from './formatters';

// Exportações das entidades
export {
  entityKinds,
  statusByKind,
} from './rows';

// Exportações das consultas
export {
  queryRows,
  filterRows,
  getRow,
  getCatalogs,
} from './queries';

// Exportações dos indicadores
export {
  getMetrics,
  getSeries,
} from './metrics';

// Simulação de latência do repositório demonstrativo
const pause = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 160));

// Implementação do repositório do dashboard
export const dashboardRepository: DashboardRepository = {
  // Consulta os dados e a disponibilidade da fonte
  async getSnapshot(context) {
    await pause();

    return {
      rows: Object.fromEntries(
        entityKinds.map((kind) => [
          kind,
          queryRows(kind, context),
        ]),
      ) as Record<EntityKind, EntityRow[]>,

      dataBase: SOURCE_DATE,

      availability: {
        source: 'demo',
        officialApi: 'pending',
        officialStatusMapping: 'pending',
        amountBands: 'pending',
        ageBands: 'pending',
        historicalStock: 'pending',
        cartorialDeadlineRule: 'pending',
        institutionalGoals: 'pending',
      },

      dataAvailability: {
        state: 'available',
        source: 'Demonstração local',
        asOf: SOURCE_DATE,
        message:
          'Dados sintéticos disponíveis; integração e regras oficiais aguardam homologação.',
        lastSuccess: SOURCE_DATE,
      },
    };
  },

  // Consulta os detalhes de uma entidade
  async getDetails(ref, context) {
    await pause();

    return getRow(ref, context);
  },

  // Consulta o histórico de uma entidade
  async getHistory(ref, context) {
    await pause();

    return getRow(ref, context)?.history ?? [];
  },

  // Consulta os catálogos de filtros
  async getCatalogs(context) {
    await pause();

    return getCatalogs(context);
  },

  // Consulta os indicadores de uma visão
  async getIndicators(view, context) {
    await pause();

    return getMetrics(view, context);
  },
};
