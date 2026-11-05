import { ArrowRight, Clock3, Info, LockKeyhole, Settings2, ShieldCheck } from 'lucide-react';
import { SOURCE_DATE } from '../../domain';
import type { QueryContext } from '../../domain';
import { date } from '../records/formatting';
import type { Navigate } from '../workspace/contracts';

export default function Settings({
  context,
  onNavigate,
}: {
  context: QueryContext;
  onNavigate: Navigate;
}) {
  if (!context.session.admin)
    return (
      <section className="ws-panel ws-admin-locked">
        <span>
          <LockKeyhole size={29} />
        </span>
        <h2>Acesso administrativo restrito</h2>
        <p>
          Esta área exige o perfil administrativo da prévia. Equipe, Chefia e Gestão continuam
          consultando as telas autorizadas.
        </p>
        <button className="ws-outline-button" onClick={() => onNavigate('overview')}>
          Voltar à Visão Geral <ArrowRight size={14} />
        </button>
        <small>A seleção de perfis nesta demonstração não representa autenticação de produção.</small>
      </section>
    );
  return (
    <div className="ws-settings-grid">
      <section className="ws-panel">
        <div className="ws-section-heading">
          <h2>Parâmetros administrativos</h2>
          <Settings2 size={18} />
        </div>
        {[
          'Matriz de usuários e permissões',
          'Antecedência dos alertas preventivos',
          'Intervalo de inatividade',
          'Periodicidade de atualização',
          'Filtros e indicadores autorizados',
          'Metas institucionais',
        ].map((label) => (
          <div className="ws-setting-row" key={label}>
            <span>{label}</span>
            <span className="ws-pending">A homologar</span>
          </div>
        ))}
        <div className="ws-note">
          <LockKeyhole size={16} />
          <p>
            Parâmetros exibidos para consulta. Alterações e trilha de auditoria dependem da implementação
            e autorização institucionais.
          </p>
        </div>
      </section>
      <section className="ws-panel">
        <div className="ws-section-heading">
          <h2>Fonte e sincronização</h2>
          <ShieldCheck size={18} />
        </div>
        <div className="ws-setting-row">
          <span>Fonte desta prévia</span>
          <strong>Demonstração local</strong>
        </div>
        <div className="ws-setting-row">
          <span>Data-base dos dados</span>
          <strong>{date(SOURCE_DATE)}</strong>
        </div>
        <div className="ws-setting-row">
          <span>Integração SISCAF / CRA21</span>
          <span className="ws-pending">Não conectada</span>
        </div>
        <div className="ws-setting-row">
          <span>Última sincronização oficial</span>
          <span className="ws-missing">Não disponível</span>
        </div>
        <div className="ws-setting-row">
          <span>Diagnóstico de atualização</span>
          <strong>Prévia estática</strong>
        </div>
        <h3 className="ws-log-heading">Log demonstrativo</h3>
        <div className="ws-log">
          <Clock3 size={15} />
          <span>
            <strong>Base de demonstração carregada</strong>
            <small>{date(SOURCE_DATE)} · dados sintéticos para validação de interface.</small>
          </span>
        </div>
        <div className="ws-note">
          <Info size={16} />
          <p>Nenhuma chave, senha ou credencial é configurada nesta tela.</p>
        </div>
      </section>
    </div>
  );
}
