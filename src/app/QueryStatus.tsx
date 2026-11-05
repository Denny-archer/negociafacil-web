import { AlertCircle, Database, LoaderCircle } from 'lucide-react';
import { formatDate } from '../domain';
import type { DashboardQuery } from './useDashboardQuery';

export default function QueryStatus({
  invalidPeriod,
  loading,
  loaded,
  error,
  scenario,
  dataBase,
  unavailable,
  retry,
}: DashboardQuery) {
  return (
    <>
      {invalidPeriod && (
        <div className="data-state data-state-error" role="alert">
          <AlertCircle size={21} />
          <div>
            <strong>Revise o período</strong>
            <p>A data de início deve ser anterior ou igual à data final.</p>
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-strip" role="status">
          <LoaderCircle className="spinning" size={15} />
          Preparando a consulta demonstrativa...
        </div>
      )}
      {error && (
        <div className="data-state data-state-error" role="alert">
          <AlertCircle size={23} />
          <div>
            <strong>Não foi possível atualizar a consulta</strong>
            <p>
              {loaded
                ? 'Os últimos dados válidos foram preservados. A data-base não foi alterada.'
                : 'A consulta está indisponível. Isso não representa uma carteira sem registros.'}
            </p>
          </div>
          <button className="button button-secondary" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}
      {(scenario === 'partial' || scenario === 'stale') && (
        <div className="data-state data-state-warning" role="status">
          <AlertCircle size={20} />
          <div>
            <strong>{scenario === 'partial' ? 'Consulta parcial' : 'Dados desatualizados'}</strong>
            <p>
              {scenario === 'partial'
                ? 'Os indicadores sem cobertura estão identificados como a homologar. Não considerar este recorte como resultado oficial completo.'
                : `A última posição disponível foi preservada: ${formatDate(
                    dataBase
                  )}. Nova sincronização pendente.`}
            </p>
          </div>
        </div>
      )}
      {unavailable && (
        <div className="data-state data-state-empty">
          <Database size={28} />
          <div>
            <strong>
              {scenario === 'denied'
                ? 'Acesso não permitido'
                : scenario === 'pending'
                ? 'Dados em homologação'
                : 'Nenhum registro neste recorte'}
            </strong>
            <p>
              {scenario === 'denied'
                ? 'Seu perfil não possui acesso a esta consulta.'
                : scenario === 'pending'
                ? 'A fonte e a regra ainda precisam ser confirmadas. Informação indisponível não é valor zero.'
                : 'A consulta foi concluída sem resultados. Ajuste os filtros para pesquisar novamente.'}
            </p>
          </div>
          <button className="button button-secondary" onClick={retry}>
            Voltar à demonstração
          </button>
        </div>
      )}
    </>
  );
}
