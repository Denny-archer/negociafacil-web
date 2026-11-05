import type { EntityKind, ViewId } from '../../domain';

export const referenceDateLabels: Record<ViewId, string> = {
  overview:
    'A data de referência varia por indicador: vencimento do débito, reconhecimento do pagamento ou evento do processo.',
  delinquency: 'Vencimento original do débito.',
  collection: 'Envio da notificação ou início da cobrança; campanhas usam a data de início.',
  negotiation: 'Formalização ou início do acordo.',
  'active-debt': 'Primeiro evento da inscrição em Dívida Ativa.',
  protest: 'Remessa ou primeiro evento do título.',
  payments: 'Reconhecimento financeiro; quando pendente, data informada do pagamento.',
  demands: 'Última movimentação da demanda.',
  reports:
    'A data do processo selecionado; o eixo temporal de cada relatório está indicado na distribuição mensal.',
  settings: 'Data-base da demonstração e informações de atualização disponíveis.',
};

export const views: Record<
  ViewId,
  { title: string; subtitle: string; eyebrow: string; kind: EntityKind }
> = {
  overview: {
    title: 'Visão Geral',
    subtitle: 'Carteira, resultados e ações que exigem atenção.',
    eyebrow: 'Gestão integrada',
    kind: 'debt',
  },
  delinquency: {
    title: 'Inadimplência',
    subtitle: 'Entenda o estoque em aberto e as populações que compõem cada indicador.',
    eyebrow: 'Composição da carteira',
    kind: 'debt',
  },
  collection: {
    title: 'Cobrança',
    subtitle: 'Acompanhe campanhas, populações alcançadas e resultados da cobrança.',
    eyebrow: 'Carteiras e campanhas',
    kind: 'collection',
  },
  negotiation: {
    title: 'Negociação',
    subtitle: 'Da primeira parcela ao desfecho: vigência, atrasos e renegociações.',
    eyebrow: 'Ciclo dos acordos',
    kind: 'agreement',
  },
  'active-debt': {
    title: 'Dívida Ativa',
    subtitle: 'Elegibilidade, inscrição, documentos e encaminhamentos de cada caso.',
    eyebrow: 'Acompanhamento de créditos',
    kind: 'activeDebt',
  },
  protest: {
    title: 'Protesto',
    subtitle: 'Remessa, andamento, retorno e providências cartoriais pendentes.',
    eyebrow: 'Títulos e retornos',
    kind: 'protest',
  },
  payments: {
    title: 'Pagamentos',
    subtitle: 'Reconhecimento financeiro, compensação, baixa e exceções de conciliação.',
    eyebrow: 'Arrecadação e conciliação',
    kind: 'payment',
  },
  demands: {
    title: 'Demandas',
    subtitle: 'Status, próxima ação, responsável e prazo de cada pendência do setor.',
    eyebrow: 'Carteira operacional',
    kind: 'demand',
  },
  reports: {
    title: 'Relatórios',
    subtitle: 'Compare períodos, investigue resultados e documente a análise em PDF.',
    eyebrow: 'Análise gerencial',
    kind: 'debt',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Parâmetros administrativos, fontes e informações da visualização.',
    eyebrow: 'Administração do painel',
    kind: 'person',
  },
};
