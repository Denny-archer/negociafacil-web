import { money, number } from './formatters';
import { DEMO_INACTIVITY_DAYS } from './defaults';
import { allRows, dateBase, sum } from './rows';
import { filterRows, queryRows } from './queries';
import type { EntityRow, Metric, QueryContext, SeriesPoint, ViewId } from './types';

function metric(
  id: string,
  label: string,
  rows: EntityRow[],
  unit: string,
  definition: string,
  value = number(rows.length),
  tone = 'blue'
): Metric {
  return {
    id,
    label,
    rows,
    unit,
    definition,
    value,
    tone,
    caption: 'Dados sintéticos · população consultável',
    definitionInfo: {
      id,
      unit,
      calculation: definition,
      population: rows.map(row => ({ ...row.ref })),
      source: 'Demonstração local',
      homologation: 'demo'
    }
  };
}

function pending(id: string, label: string, definition: string): Metric {
  return {
    id,
    label,
    value: 'Pendente',
    caption: 'Aguardando homologação',
    tone: 'orange',
    rows: [],
    unit: 'regra',
    definition,
    pending: true,
    definitionInfo: {
      id,
      unit: 'regra',
      calculation: definition,
      population: [],
      source: 'Fonte oficial e regra aguardam homologação',
      homologation: 'pending'
    }
  };
}

export function getMetrics(view: ViewId, context: QueryContext): Metric[] {
  const debts = queryRows('debt', context);
  const overdue = debts.filter(
    row =>
      row.amountCents > 0 &&
      String(row.values.dueDate) < dateBase &&
      !row.status.startsWith('Suspenso')
  );
  const payments = queryRows('payment', context);
  const recognized = payments.filter(row => row.values.recognizedAt !== null);
  const agreements = queryRows('agreement', context);
  const activeDebts = queryRows('activeDebt', context);
  const protests = queryRows('protest', context);
  const demands = queryRows('demand', context);
  const openDemands = demands.filter(row => !row.values.closedAt);
  const lateAgreements = agreements.filter(row =>
    [
      'Em atraso',
      'Primeira parcela vencida sem pagamento',
      'Acordo inadimplente'
    ].includes(row.status)
  );
  const currentAgreements = agreements.filter(row => row.values.firstInstallmentPaid === 1 && [
    'Primeira parcela paga',
    'Acordo vigente / adimplente',
    'Em atraso',
    'Acordo inadimplente',
    'Regularização em andamento'
  ].includes(row.status));
  const agreementIds = new Set(agreements.map(row => row.ref.id));
  const agreementPayments = filterRows(allRows.payment, {
    ...context,
    filters: {
      ...context.filters,
      status: 'all',
      stage: 'all'
    }
  }).filter(row => row.values.recognizedAt !== null && agreementIds.has(String(row.values.agreementId)));
  const openProtests = protests.filter(row => row.status !== 'Encerrado');
  const peopleIds = new Set(overdue.map(row => row.personId));
  const people = [...peopleIds].map(id => {
    const canonical = allRows.person.find(row => row.ref.id === id)!;
    const selected = overdue.filter(row => row.personId === id), first = selected[0];
    return {
      ...canonical,
      exercise: first.exercise,
      eventDate: first.eventDate,
      owner: first.owner,
      sector: first.sector,
      priority: first.priority,
      stage: null,
      values: {
        ...canonical.values,
        ...first.values,
        registrationStatus: canonical.status
      },
      amountCents: sum(selected, 'amountCents'),
      receivedCents: sum(selected, 'receivedCents'),
      subtitle: 'Pessoa com débitos vencidos no recorte · contagem distinta'
    };
  });
  const denominator = new Set(debts.map(row => row.personId)).size;
  const population = [...new Set(debts.map(row => row.personId))].map(id => {
    const canonical = allRows.person.find(row => row.ref.id === id)!;
    const selected = debts.filter(row => row.personId === id);
    const first = selected[0];
    return {
      ...canonical,
      exercise: first.exercise,
      eventDate: first.eventDate,
      owner: first.owner,
      sector: first.sector,
      priority: first.priority,
      stage: null,
      values: {
        ...canonical.values,
        ...first.values,
        registrationStatus: canonical.status
      },
      amountCents: sum(selected, 'amountCents'),
      receivedCents: sum(selected, 'receivedCents'),
      subtitle: 'Pessoa com débitos no recorte · contagem distinta; não é universo oficial de inscritos'
    };
  });

  if (view === 'overview')
    return [
      metric(
        'population',
        'Pessoas na base demonstrativa',
        population,
        'pessoas',
        'Pessoas distintas que possuem débitos no recorte; denominador demonstrativo, não é o universo oficial de inscritos.'
      ),
      metric(
        'overdue-people',
        'Profissionais / empresas inadimplentes',
        people,
        'pessoas',
        'Pessoas distintas com saldo positivo vencido; suspensos por inconsistência excluídos no cenário demo.'
      ),
      metric(
        'overdue-rate',
        'Percentual de inadimplência',
        people,
        'percentual',
        `Denominador: ${denominator} pessoas distintas com débitos no recorte; não é o universo oficial de inscritos.`,
        `${denominator ? (people.length / denominator * 100).toFixed(1).replace('.', ',') : '0'}%`
      ),
      metric(
        'open-amount',
        'Valor total em aberto',
        debts.filter(row => row.amountCents > 0),
        'reais',
        'Saldo dos débitos, sem somar novamente valores de acordos, DA ou títulos.',
        money(sum(debts, 'amountCents')),
        'green'
      ),
      metric(
        'recovered',
        'Valor recuperado no período',
        recognized,
        'reais',
        'Soma líquida dos eventos reconhecidos, incluindo estornos; período pela data de reconhecimento.',
        money(sum(recognized, 'receivedCents')),
        'green'
      ),
      metric(
        'current-agreements',
        'Acordos em acompanhamento',
        currentAgreements,
        'acordos',
        'Acordos com primeira parcela paga e acompanhamento material; nomenclatura demo.'
      ),
      metric(
        'late-agreements',
        'Acordos inadimplentes',
        lateAgreements,
        'acordos',
        'Atraso fornecido pelo cenário, incluindo primeira parcela vencida sem pagamento.',
        number(lateAgreements.length),
        'orange'
      ),
      pending('old-debts', 'Débitos antigos', 'O marco de antiguidade e as faixas ainda precisam ser homologados.'),
      metric(
        'open-protests',
        'Protestos em andamento',
        openProtests,
        'títulos',
        'Títulos não encerrados; confirmação de remessa não equivale a protesto lavrado.'
      ),
      metric(
        'open-demands',
        'Demandas pendentes',
        openDemands,
        'demandas',
        'Demandas sem data de encerramento; regularização financeira não encerra a demanda.'
      ),
      metric(
        'late-demands',
        'Demandas vencidas',
        openDemands.filter(row => row.alerts.includes('Vencido')),
        'demandas',
        'Demandas abertas com prazo fornecido anterior à data-base fixa do cenário.',
        undefined,
        'orange'
      ),
      pending('goal', 'Meta institucional', 'Nenhuma meta institucional homologada foi fornecida.')
    ];

  if (view === 'delinquency')
    return [
      metric(
        'overdue',
        'Pessoas inadimplentes',
        people,
        'pessoas',
        'Pessoas distintas que compõem os débitos vencidos.'
      ),
      metric(
        'balance',
        'Valor vencido em aberto',
        overdue,
        'reais',
        'Saldo positivo vencido sem suspensos por inconsistência no cenário demo.',
        money(sum(overdue, 'amountCents')),
        'green'
      ),
      pending('old', 'Débitos antigos / faixas', 'Critérios de idade e faixa de valor aguardam homologação.')
    ];

  if (view === 'collection') {
    const collections = queryRows('collection', context);
    const campaigns = queryRows('campaign', context);
    return [
      metric(
        'collection-cases',
        'Casos em cobrança',
        collections,
        'casos',
        'Processos de cobrança, distintos dos débitos e pessoas.'
      ),
      metric(
        'active-campaigns',
        'Campanhas ativas',
        campaigns.filter(row => row.status === 'Ativa'),
        'campanhas',
        'Campanhas com status Ativa fornecido no cenário.'
      ),
      metric(
        'closed-campaigns',
        'Campanhas encerradas',
        campaigns.filter(row => row.status === 'Encerrada'),
        'campanhas',
        'Campanhas encerradas preservam sua população inicial e resultados.'
      )
    ];
  }

  if (view === 'negotiation')
    return [
      metric(
        'agreements',
        'Acordos registrados',
        agreements,
        'acordos',
        'Instrumentos distintos, incluindo anteriores; não são pessoas distintas.'
      ),
      metric(
        'current',
        'Acordos vigentes / acompanhamento',
        currentAgreements,
        'acordos',
        'A primeira parcela paga é distinguida da mera assinatura.'
      ),
      metric(
        'first-paid',
        'Primeira parcela paga',
        agreements.filter(row => row.values.firstInstallmentPaid === 1),
        'acordos',
        'Primeira parcela integralmente paga no cenário.'
      ),
      metric(
        'first-unpaid',
        'Primeira parcela vencida sem pagamento',
        agreements.filter(row => row.values.firstInstallmentOverdue === 1),
        'acordos',
        'Primeira parcela existente, vencida e sem quitação.'
      ),
      metric(
        'late',
        'Acordos em atraso',
        lateAgreements,
        'acordos',
        'Status de atraso fornecido no cenário demo.'
      ),
      metric(
        'broken',
        'Rompidos / inativados',
        agreements.filter(row => row.status === 'Rompido / Inativado'),
        'acordos',
        'Terminologia provisória a conciliar com SISCAF.'
      ),
      metric(
        'renegotiations',
        'Renegociações',
        agreements.filter(row => Number(row.values.renegotiationCount) > 0),
        'acordos',
        'Vínculo explícito com instrumento anterior.'
      ),
      metric(
        'repeat',
        'Renegociados mais de uma vez',
        agreements.filter(row => Number(row.values.renegotiationCount) > 1),
        'acordos',
        'Mais de um instrumento anterior vinculado no cenário.'
      ),
      metric(
        'negotiated',
        'Valor negociado',
        agreements,
        'reais',
        'Soma por instrumento; inclui históricos, não representa saldo único da carteira.',
        money(agreements.reduce((total, row) => total + Number(row.values.negotiatedAmountCents), 0)),
        'green'
      ),
      metric(
        'recovered-agreement',
        'Recuperado por negociação',
        agreementPayments,
        'reais',
        'Eventos reconhecidos ligados aos instrumentos do recorte, pela data do recebimento.',
        money(sum(agreementPayments, 'receivedCents')),
        'green'
      )
    ];

  if (view === 'active-debt')
    return [
      metric(
        'eligible',
        'Elegíveis para inscrição',
        activeDebts.filter(row => row.status === 'Elegível para inscrição'),
        'casos',
        'Elegibilidade é fornecida pelo cenário; não calculada sem regra oficial.'
      ),
      metric(
        'registered',
        'Inscrições realizadas',
        activeDebts.filter(row => row.values.inscriptionBatchId !== null),
        'casos',
        'Inscrição e lote distintos da mera elegibilidade.'
      ),
      metric(
        'terms-generated',
        'Termos gerados',
        activeDebts.filter(row => row.values.termGeneratedAt !== null),
        'Termos',
        'Documento gerado, independentemente do envio.'
      ),
      metric(
        'terms-sent',
        'Termos enviados',
        activeDebts.filter(row => row.values.termSentAt !== null),
        'Termos',
        'Envio comprovado no cenário, distinto da geração.'
      ),
      metric(
        'cda',
        'CDAs geradas',
        activeDebts.filter(row => row.values.cdaGeneratedAt !== null),
        'CDAs',
        'CDA não comprova envio para protesto.'
      ),
      metric(
        'deadline',
        'Prazo transcorrido',
        activeDebts.filter(row => row.alerts.includes('Vencido')),
        'casos',
        'Prazo explicitamente fornecido no cenário, sem presumir calendário oficial.'
      )
    ];

  if (view === 'protest')
    return [
      metric(
        'notification',
        'Em intimação',
        protests.filter(row => ['Em intimação', 'Prazo cartorial em curso'].includes(row.status)),
        'títulos',
        'Andamento informado; prazo somente quando fornecido.'
      ),
      metric(
        'paid-before',
        'Pagos antes do protesto',
        protests.filter(row => row.status === 'Retornado — Pago'),
        'títulos',
        'Retorno PAGO, sem inferir encerramento cartorial.'
      ),
      metric(
        'protested',
        'Protestados',
        protests.filter(row => row.status === 'Retornado — Protestado'),
        'títulos',
        'Somente retorno que comprova protesto efetivo.'
      ),
      metric(
        'returned',
        'Devolvidos',
        protests.filter(row => row.status === 'Retornado — Devolvido sem custas'),
        'títulos',
        'Retorno de devolução com motivo.'
      ),
      metric(
        'awaiting',
        'Aguardando retorno',
        protests.filter(row => row.values.remittanceStatus === 'CONFIRMADO' && row.values.returnStatus === null),
        'títulos',
        'CONFIRMADO sem retorno não é PROTESTADO.'
      ),
      metric(
        'post',
        'Pendências pós-protesto',
        protests.filter(row => row.values.financialRegularized === 1 && row.values.cartorialRegularized === 0),
        'títulos',
        'Baixa financeira não elimina anuência/regularização cartorial.',
        undefined,
        'orange'
      )
    ];

  if (view === 'payments')
    return [
      metric(
        'received',
        'Recebido líquido no período',
        recognized,
        'reais',
        'Eventos reconhecidos por sua data; inclui estornos.',
        money(sum(recognized, 'receivedCents')),
        'green'
      ),
      metric(
        'recognized-count',
        'Pagamentos reconhecidos',
        recognized.filter(row => row.receivedCents > 0),
        'pagamentos',
        'Eventos positivos, não quantidade de pessoas.'
      ),
      metric(
        'pending',
        'Aguardando confirmação / compensação',
        payments.filter(row => !row.values.recognizedAt && !row.values.exception),
        'pagamentos',
        'Informado/localizado não equivale a reconhecido.'
      ),
      metric(
        'posting',
        'Baixa pendente',
        payments.filter(row => row.values.postingStatus === 'Baixa pendente'),
        'pagamentos',
        'Estado financeiro separado do estado da baixa.'
      ),
      metric(
        'exceptions',
        'Exceções de conciliação',
        payments.filter(row => !!row.values.exception),
        'pagamentos',
        'Exceções permanecem visíveis mesmo com valor reconhecido zero.',
        undefined,
        'orange'
      )
    ];

  if (view === 'demands')
    return [
      metric(
        'open',
        'Demandas abertas',
        openDemands,
        'demandas',
        'Ausência de encerramento formal, sem depender do saldo financeiro.'
      ),
      metric(
        'today',
        'Para hoje',
        openDemands.filter(row => row.alerts.includes('Hoje')),
        'demandas',
        'Prazo fornecido igual à data-base.'
      ),
      metric(
        'late',
        'Vencidas',
        openDemands.filter(row => row.alerts.includes('Vencido')),
        'demandas',
        'Prazo fornecido anterior à data-base.',
        undefined,
        'orange'
      ),
      metric(
        'no-owner',
        'Sem responsável',
        openDemands.filter(row => row.alerts.includes('Sem responsável')),
        'demandas',
        'Campo de atribuição vazio.'
      ),
      metric(
        'no-action',
        'Sem próxima ação',
        openDemands.filter(row => row.alerts.includes('Sem próxima ação')),
        'demandas',
        'Sem próxima ação nem justificativa de espera.'
      ),
      metric(
        'inactive',
        'Sem movimentação',
        openDemands.filter(row => row.alerts.includes('Sem movimentação')),
        'demandas',
        `Parâmetro demonstrativo de ${DEMO_INACTIVITY_DAYS} dias; regra oficial pendente.`
      )
    ];

  return [];
}

/** Recuperação = eventos reconhecidos agrupados por mês. Não há histórico de estoque nesta fonte demo. */
export function getSeries(context: QueryContext, mode: 'people' | 'money'): SeriesPoint[] {
  if (mode === 'people')
    return [];

  const grouped = new Map<string, number>();
  queryRows('payment', context)
    .filter(row => row.values.recognizedAt !== null)
    .forEach(row => {
      const month = String(row.values.recognizedAt).slice(0, 7);
      grouped.set(month, (grouped.get(month) ?? 0) + row.receivedCents);
    });

  return [...grouped]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([label, cents]) => ({
      label,
      first: cents / 100,
      second: 0,
      rate: 0
    }));
}
