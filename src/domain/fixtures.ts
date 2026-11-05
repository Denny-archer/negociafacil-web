import type { DomainData, OperationalFields, Provenance, SourceEntity, TimelineEvent } from './types';

export const SOURCE_DATE = '2026-10-07T12:00:00-03:00';
export const demandStatuses = [
  'Novo / A iniciar',
  'Em análise',
  'Em execução',
  'Aguardando profissional',
  'Aguardando outro setor',
  'Aguardando sistema / suporte',
  'Aguardando prazo / evento',
  'Regularização em andamento',
  'Escalado / Encaminhado',
  'Suspenso',
  'Resolvido / Concluído',
  'Encerrado sem solução pelo setor'
];
export const agreementStatuses = [
  'Em negociação',
  'Em formalização',
  'Termo assinado / aguardando primeira parcela',
  'Primeira parcela paga',
  'Acordo vigente / adimplente',
  'Em atraso',
  'Primeira parcela vencida sem pagamento',
  'Acordo inadimplente',
  'Rompido / Inativado',
  'Em renegociação',
  'Renegociado',
  'Quitado',
  'Regularização em andamento'
];
export const activeDebtStatuses = [
  'Elegível para inscrição',
  'Inscrito em Dívida Ativa',
  'Termo / CDA gerados',
  'Notificação enviada',
  'Prazo pós-notificação em curso',
  'Prazo encerrado sem regularização',
  'Aguardando medida subsequente',
  'Encaminhado para medida subsequente',
  'CDA atualizada',
  'Cancelado',
  'Regularizado',
  'Encerrado'
];
export const protestStatuses = [
  'Aguardando remessa',
  'Remetido ao CRA21',
  'Confirmado pelo CRA21',
  'Em intimação',
  'Prazo cartorial em curso',
  'Pagamento no cartório — aguardando compensação',
  'Retornado — Pago',
  'Retornado — Protestado',
  'Retornado — Devolvido sem custas',
  'Retornado — Protesto cancelado',
  'Regularização pós-protesto em andamento',
  'Aguardando Carta de Anuência',
  'Aguardando baixa/cancelamento',
  'Encerrado'
];
export const paymentStatuses = [
  'Pagamento informado',
  'Aguardando confirmação',
  'Pagamento localizado',
  'Aguardando compensação',
  'Pagamento confirmado',
  'Baixa pendente',
  'Baixa realizada',
  'Pagamento não localizado',
  'Divergência identificada',
  'Em conferência pelo Financeiro',
  'Regularização complementar pendente',
  'Regularizado',
  'Encerrado'
];
export const collectionStatuses = [
  'A iniciar',
  'Em cobrança amigável',
  'Aguardando retorno',
  'Notificação a enviar',
  'Notificação enviada',
  'Prazo de 10 dias em curso',
  'Prazo encerrado sem regularização',
  'Negociação iniciada',
  'Regularização em andamento',
  'Regularizado',
  'Encaminhado para Dívida Ativa',
  'Notificado sobre a Dívida Ativa',
  'Prazo pós-notificação em curso',
  'Suspenso por inconsistência',
  'Encerrado'
];
export const sectors = ['Negociação', 'Financeiro', 'Jurídico'];
export const owners = [
  {
    id: 'demo-denilson',
    name: 'Denilson · Demo'
  },
  {
    id: 'demo-ana',
    name: 'Ana · Demo'
  },
  {
    id: 'demo-bruno',
    name: 'Bruno · Demo'
  }
];

export function demoDay(offset: number): string {
  const date = new Date(SOURCE_DATE);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function provenance(id: string, entity: string): Provenance {
  return {
    system: 'Demonstração local',
    sourceId: id,
    entity,
    updatedAt: SOURCE_DATE,
    validation: 'demo',
    rule: 'Cenário sintético; nomenclatura e regras oficiais aguardam homologação.'
  };
}
function event(date: string, title: string, description = 'Evento sintético; sem transmissão ou validação em sistema oficial.'): TimelineEvent {
  return {
    date,
    title,
    description
  };
}
function base(id: string, status: string, entity: string, date = demoDay(-12)): SourceEntity {
  return {
    id,
    status,
    statusRaw: `DEMO:${status}`,
    provenance: provenance(id, entity),
    history: [event(date, status)]
  };
}
function operational(index: number, sector = sectors[index % sectors.length]): OperationalFields {
  const owner = index % 11 === 0 ? null : owners[index % owners.length];
  return {
    ownerId: owner?.id ?? null,
    ownerName: owner?.name ?? null,
    sector,
    nextAction: index % 13 === 0 ? null : 'Conferir informação e próxima providência no cenário demo',
    deadline: index % 9 === 0 ? null : demoDay((index % 9) - 4),
    deadlineSource: 'Data fornecida no cenário demo; não é prazo calculado do SISCAF.',
    lastMovement: demoDay(-(index % 28)),
    priority: index % 9 === 0 ? 'Urgente-Crítica' : index % 4 === 0 ? 'Alta' : 'Normal'
  };
}

function createFixtures(): DomainData {
  const data: DomainData = {
    people: [],
    debts: [],
    collections: [],
    campaigns: [],
    participations: [],
    agreements: [],
    installments: [],
    activeDebts: [],
    documents: [],
    protests: [],
    payments: [],
    demands: []
  };
  for (let index = 0; index < 168; index += 1) {
    const personType = index % 4 === 0 ? 'PJ' : 'PF';
    const id = `P-DEMO-${String(index + 1).padStart(3, '0')}`;
    const category = personType === 'PJ' ? 'Empresa' : index % 3 === 0 ? 'Terapia Ocupacional' : 'Fisioterapia';
    data.people.push({
      ...base(id, index % 17 === 0 ? 'Inativo' : 'Ativo', 'Pessoa', demoDay(-240)),
      name: `${personType === 'PJ' ? 'Empresa' : 'Profissional'} Demo ${index + 1}`,
      personType,
      category,
      region: ['DF', 'GO', 'TO', 'MT'][index % 4],
      createdAt: demoDay(-240),
      registrations: Array.from(
        { length: index % 7 === 0 ? 2 : 1 },
        (_, registration) => ({
          id: `R-DEMO-${index + 1}-${registration + 1}`,
          number: `${personType}-DEMO-${index + 1001}-${registration + 1}`,
          category
        })
      )
    });
    for (let debtIndex = 0; debtIndex < 2; debtIndex += 1) {
      const sequence = index * 2 + debtIndex;
      const debtId = `D-DEMO-${String(sequence + 1).padStart(3, '0')}`;
      const status = [
        'Vencido / Inadimplente',
        'Pagamento parcial',
        'Quitado',
        'Suspenso por inconsistência',
        'Em aberto a vencer',
        'Substituído por acordo'
      ][sequence % 6];
      const exercise = [2020, 2022, 2024, 2025, 2026][sequence % 5];
      const amount = 24_000 + ((sequence * 7919) % 480_000);
      const dueDate = status === 'Em aberto a vencer'
        ? demoDay(20 + sequence % 30)
        : `${exercise}-03-${String(1 + sequence % 28).padStart(2, '0')}`;
      data.debts.push({
        ...base(debtId, status, 'Débito', dueDate),
        ...operational(sequence),
        personId: id,
        registrationId: data.people[index].registrations[debtIndex % data.people[index].registrations.length].id,
        exercise,
        debtType: sequence % 5 === 0 ? 'Taxa' : 'Anuidade',
        originalAmountCents: amount,
        openAmountCents: ['Quitado', 'Substituído por acordo'].includes(status)
          ? 0
          : status === 'Pagamento parcial' ? Math.floor(amount / 2) : amount,
        dueDate,
        stage: [
          'Cobrança amigável',
          'Notificação',
          'Dívida Ativa',
          'Protesto',
          'Análise de inconsistência'
        ][sequence % 5],
        agreementIds: [],
        activeDebtIds: [],
        protestIds: []
      });
    }
  }

  const campaignStates = ['Planejada', 'Em preparação', 'Ativa', 'Encerrada', 'Suspensa/Cancelada'];
  campaignStates.forEach((status, index) => data.campaigns.push({
    ...base(`CAMP-DEMO-${index + 1}`, status, 'Campanha', demoDay(-75 + index * 9)),
    ...operational(index, 'Negociação'),
    name: `Campanha Demo ${index + 1}`,
    description: 'População inicial preservada no cenário; participação não duplica saldo da carteira.',
    startedAt: demoDay(-75 + index * 9),
    endedAt: status === 'Encerrada' ? demoDay(-15) : null
  }));
  data.people.forEach((person, index) => {
    const debtIds = data.debts.filter(debt => debt.personId === person.id).map(debt => debt.id);
    const campaign = data.campaigns[index % data.campaigns.length];
    const collectionId = `COB-DEMO-${index + 1}`;
    const status = collectionStatuses[index % collectionStatuses.length];
    data.collections.push({
      ...base(collectionId, status, 'Cobrança'),
      ...operational(index, 'Negociação'),
      personId: person.id,
      debtIds,
      campaignId: campaign.id,
      stage: [
        'Cobrança amigável',
        'Notificação extrajudicial',
        'Dívida Ativa',
        'Medida subsequente'
      ][index % 4],
      noticeSentAt: index % 4 === 1 ? demoDay(-12) : null,
      noticeDeadline: index % 4 === 1 ? demoDay(-2) : null,
      suspendedReason: status === 'Suspenso por inconsistência' ? 'Identificação do crédito em conferência — cenário demo' : null
    });
    data.participations.push({
      id: `PART-DEMO-${index + 1}`,
      campaignId: campaign.id,
      personId: person.id,
      collectionId,
      debtIds,
      initialAmountCents: debtIds.reduce((sum, debtId) => sum + data.debts.find(debt => debt.id === debtId)!.originalAmountCents, 0),
      contacted: index % 3 !== 0,
      agreementIds: [],
      paymentIds: []
    });
  });

  for (let index = 0; index < 65; index += 1) {
    const person = data.people[index];
    const status = agreementStatuses[index % agreementStatuses.length];
    const id = `AC-DEMO-${String(index + 1).padStart(3, '0')}`;
    const debt = data.debts[index * 2];
    const amount = debt.originalAmountCents;
    const formalizedAt = ['Em negociação', 'Em formalização'].includes(status) ? null : demoDay(-45);
    const previousAgreementId = ['Em renegociação', 'Renegociado'].includes(status) ? `AC-DEMO-HIST-${index + 1}` : null;
    data.agreements.push({
      ...base(id, status, 'Acordo', formalizedAt ?? demoDay(-8)),
      ...operational(index, 'Negociação'),
      personId: person.id,
      debtIds: [debt.id],
      formalizedAt,
      negotiatedAmountCents: amount,
      previousAgreementId,
      renegotiationCount: previousAgreementId ? 1 : 0
    });
    debt.agreementIds.push(id);
    data.participations[index].agreementIds.push(id);
    for (let parcelIndex = 0; parcelIndex < 3; parcelIndex += 1) {
      const installmentId = `PAR-DEMO-${index + 1}-${parcelIndex + 1}`;
      const parcelAmount = Math.floor(amount / 3) + (parcelIndex < amount % 3 ? 1 : 0);
      const paid = status === 'Quitado' || (parcelIndex === 0 && [
        'Primeira parcela paga',
        'Acordo vigente / adimplente',
        'Em atraso',
        'Acordo inadimplente',
        'Regularização em andamento'
      ].includes(status));
      const dueDate = ['Em negociação', 'Em formalização', 'Termo assinado / aguardando primeira parcela'].includes(status)
        ? demoDay(5 + parcelIndex * 30)
        : demoDay(-25 + parcelIndex * (['Em atraso', 'Acordo inadimplente'].includes(status) ? 18 : 30));
      const paymentId = `PG-PAR-DEMO-${index + 1}-${parcelIndex + 1}`;
      data.installments.push({
        id: installmentId,
        agreementId: id,
        number: parcelIndex + 1,
        dueDate,
        amountCents: parcelAmount,
        paidCents: paid ? parcelAmount : 0,
        paymentIds: paid ? [paymentId] : []
      });
      if (paid) {
        data.payments.push({
          ...base(paymentId, 'Baixa realizada', 'Pagamento', demoDay(-30 + parcelIndex * 5)),
          ...operational(index, 'Financeiro'),
          personId: person.id,
          debtId: debt.id,
          agreementId: id,
          installmentId,
          activeDebtId: null,
          protestId: null,
          amountCents: parcelAmount,
          recognizedCents: parcelAmount,
          occurredAt: demoDay(-30 + parcelIndex * 5),
          recognizedAt: demoDay(-29 + parcelIndex * 5),
          settlementAt: demoDay(-29 + parcelIndex * 5),
          postingAt: demoDay(-28 + parcelIndex * 5),
          method: ['Boleto', 'PIX', 'Cartão'][index % 3],
          financialStatus: 'Pagamento confirmado',
          postingStatus: 'Baixa realizada',
          exception: null,
          attributionReliable: true,
          strategy: 'Negociação'
        });
        data.participations[index].paymentIds.push(paymentId);
      }
    }
  }
  // A mesma pessoa pode possuir acordo anterior e atual, sem sobrescrever o histórico.
  const previous = data.agreements[0];
  data.agreements.push({
    ...previous,
    ...base('AC-DEMO-HIST-001', 'Rompido / Inativado', 'Acordo', demoDay(-110)),
    formalizedAt: demoDay(-180),
    negotiatedAmountCents: 42_000,
    previousAgreementId: 'AC-DEMO-HIST-BASE-001',
    renegotiationCount: 1
  });
  data.agreements[0].previousAgreementId = 'AC-DEMO-HIST-001';
  data.agreements[0].renegotiationCount = 2;
  const historical = data.agreements.filter(agreement => agreement.previousAgreementId && agreement.previousAgreementId !== 'AC-DEMO-HIST-001').map(agreement => ({
    ...agreement,
    ...base(agreement.previousAgreementId!, 'Rompido / Inativado', 'Acordo', demoDay(-110)),
    formalizedAt: demoDay(-180),
    previousAgreementId: null,
    renegotiationCount: 0
  }));
  data.agreements.push(...historical);

  for (let index = 0; index < 48; index += 1) {
    const person = data.people[index + 24];
    const debt = data.debts[(index + 24) * 2];
    const status = activeDebtStatuses[index % activeDebtStatuses.length];
    const id = `DA-DEMO-${String(index + 1).padStart(3, '0')}`;
    const eligibleOnly = status === 'Elegível para inscrição';
    const sent = !eligibleOnly && !['Inscrito em Dívida Ativa', 'Termo / CDA gerados'].includes(status);
    const documentIds: string[] = [];
    if (!eligibleOnly) ['Termo', 'CDA'].forEach((type, documentIndex) => {
      const documentId = `DOC-DEMO-${index + 1}-${documentIndex + 1}`;
      documentIds.push(documentId);
      data.documents.push({
        ...base(documentId, status === 'Cancelado' ? 'Cancelado' : sent ? 'Enviado' : 'Gerado', type, demoDay(-25)),
        activeDebtId: id,
        type: type as 'Termo' | 'CDA',
        number: `${type}-DEMO-${index + 1}`,
        generatedAt: demoDay(-25),
        sentAt: sent ? demoDay(-18) : null,
        updatedAt: status === 'CDA atualizada' ? demoDay(-2) : null,
        cancelledAt: status === 'Cancelado' ? demoDay(-3) : null,
        evidence: `Protocolo demonstrativo DOC-${index + 1}-${documentIndex + 1}`
      });
    });
    data.activeDebts.push({
      ...base(id, status, 'Dívida Ativa', demoDay(-25)),
      ...operational(index, 'Jurídico'),
      personId: person.id,
      debtIds: [debt.id],
      eligibleAmountCents: debt.originalAmountCents,
      inscriptionBatchId: eligibleOnly ? null : `LOTE-DEMO-${1 + Math.floor(index / 6)}`,
      documentIds,
      notifiedAt: sent ? demoDay(-18) : null,
      deadline: sent && status !== 'Encerrado' ? demoDay(index % 3 === 0 ? -8 : 2) : null,
      deadlineSource: sent ? 'Prazo fornecido no cenário demo; calendário oficial ainda pendente.' : null,
      subsequentMeasures: status === 'Encaminhado para medida subsequente' ? [index % 2 ? 'CADIN' : 'Protesto'] : [],
      impediment: index % 13 === 0 ? 'Conferência cadastral demonstrativa' : null
    });
    debt.activeDebtIds.push(id);
  }

  for (let index = 0; index < 28; index += 1) {
    const activeDebt = data.activeDebts.filter(item => item.documentIds.length > 0)[index];
    const status = protestStatuses[index % protestStatuses.length];
    const id = `PR-DEMO-${String(index + 1).padStart(3, '0')}`;
    const returned = status.startsWith('Retornado') || index % 14 >= 10;
    const paid = [
      'Retornado — Pago',
      'Regularização pós-protesto em andamento',
      'Aguardando Carta de Anuência',
      'Aguardando baixa/cancelamento',
      'Encerrado'
    ].includes(status);
    const closed = status === 'Encerrado';
    const suppliedDeadline = ['Em intimação', 'Prazo cartorial em curso'].includes(status) ? demoDay(index % 2 ? 0 : 2) : null;
    const title = {
      ...base(id, status, 'Protesto', demoDay(-16)),
      ...operational(index, 'Jurídico'),
      personId: activeDebt.personId,
      debtIds: activeDebt.debtIds,
      activeDebtId: activeDebt.id,
      titleNumber: `TIT-DEMO-${index + 1}`,
      amountCents: activeDebt.eligibleAmountCents,
      remittanceStatus: index % 14 === 0 ? 'AGUARDANDO' : index % 14 === 1 ? 'REMETIDO' : 'CONFIRMADO',
      returnStatus: returned
        ? (paid
          ? 'PAGO'
          : status.includes('Devolvido')
            ? 'DEVOLVIDO SEM CUSTAS'
            : status.includes('cancelado') ? 'PROTESTO CANCELADO' : 'PROTESTADO')
        : null,
      cartorio: index % 14 < 2 ? null : `Cartório Demo ${1 + index % 3}`,
      protocol: index % 14 < 2 ? null : `PROTO-DEMO-${index + 1}`,
      remittanceDate: index % 14 === 0 ? null : demoDay(-16),
      confirmationDate: index % 14 < 2 ? null : demoDay(-15),
      movementCode: index % 14 === 2 ? 'AA — Demo' : returned ? 'RET — Demo' : null,
      movementDescription: status,
      movementDate: demoDay(-(index % 5)),
      returnDate: returned ? demoDay(-5) : null,
      returnReason: status.includes('Devolvido') ? 'Motivo de devolução fornecido no cenário demo' : null,
      cartorialDeadline: suppliedDeadline,
      cartorialDeadlineSource: suppliedDeadline ? 'Demo fornecido; não calculado por regra cartorial.' : null,
      deadline: suppliedDeadline,
      deadlineSource: suppliedDeadline ? 'Demo fornecido' : null,
      financialRegularized: paid,
      cartorialRegularized: closed,
      consentIssuedAt: status === 'Aguardando baixa/cancelamento' || closed ? demoDay(-3) : null,
      consentSentAt: closed ? demoDay(-2) : null
    };
    data.protests.push(title);
    data.debts.find(debt => debt.id === title.debtIds[0])!.protestIds.push(id);
    if (paid) {
      const paymentId = `PG-PR-DEMO-${index + 1}`;
      data.payments.push({
        ...base(paymentId, closed ? 'Encerrado' : 'Regularização complementar pendente', 'Pagamento', demoDay(-5)),
        ...operational(index, 'Financeiro'),
        personId: title.personId,
        debtId: title.debtIds[0],
        agreementId: null,
        installmentId: null,
        activeDebtId: activeDebt.id,
        protestId: id,
        amountCents: title.amountCents,
        recognizedCents: title.amountCents,
        occurredAt: demoDay(-6),
        recognizedAt: demoDay(-5),
        settlementAt: demoDay(-5),
        postingAt: demoDay(-4),
        method: 'Boleto',
        financialStatus: 'Pagamento confirmado',
        postingStatus: 'Baixa realizada',
        exception: closed ? null : 'Pagamento reconhecido; efeito cartorial ainda pendente.',
        attributionReliable: true,
        strategy: 'Protesto/cartório'
      });
      const debt = data.debts.find(item => item.id === title.debtIds[0])!;
      debt.openAmountCents = 0;
      debt.status = 'Quitado';
      debt.statusRaw = 'DEMO:Quitado';
    }
  }

  paymentStatuses.forEach((status, index) => {
    const person = data.people[index + 95];
    const recognized = [
      'Pagamento confirmado',
      'Baixa pendente',
      'Baixa realizada',
      'Regularização complementar pendente',
      'Regularizado',
      'Encerrado'
    ].includes(status);
    const posted = [
      'Baixa realizada',
      'Regularização complementar pendente',
      'Regularizado',
      'Encerrado'
    ].includes(status);
    data.payments.push({
      ...base(`PG-EXC-DEMO-${index + 1}`, status, 'Pagamento', demoDay(-index)),
      ...operational(index, 'Financeiro'),
      personId: person.id,
      debtId: data.debts[(index + 95) * 2].id,
      agreementId: null,
      installmentId: null,
      activeDebtId: null,
      protestId: null,
      amountCents: 18_000 + index * 4321,
      recognizedCents: recognized ? 18_000 + index * 4321 : 0,
      occurredAt: demoDay(-index),
      recognizedAt: recognized ? demoDay(-index) : null,
      settlementAt: recognized ? demoDay(-index) : null,
      postingAt: posted ? demoDay(-index + 1) : null,
      method: ['PIX', 'Boleto', 'Cartão'][index % 3],
      financialStatus: recognized ? 'Pagamento confirmado' : status,
      postingStatus: posted ? 'Baixa realizada' : 'Baixa pendente',
      exception: [
          'Pagamento não localizado',
          'Divergência identificada',
          'Em conferência pelo Financeiro'
        ].includes(status)
        ? 'Exceção demonstrativa que exige conferência da fonte financeira.'
        : null,
      attributionReliable: false,
      strategy: null
    });
  });
  data.payments.push({
    ...data.payments[data.payments.length - 1],
    ...base('PG-ESTORNO-DEMO-001', 'Estorno reconhecido', 'Pagamento', demoDay(-3)),
    amountCents: -12_000,
    recognizedCents: -12_000,
    occurredAt: demoDay(-3),
    recognizedAt: demoDay(-3),
    settlementAt: demoDay(-3),
    postingAt: demoDay(-2),
    financialStatus: 'Estorno reconhecido',
    postingStatus: 'Baixa revisada',
    exception: 'Estorno sintético para conferir o cálculo líquido.',
    attributionReliable: false,
    strategy: null
  });

  for (let index = 0; index < 96; index += 1) {
    const status = demandStatuses[index % demandStatuses.length];
    const person = data.people[(index + 24) % data.people.length];
    const closed = ['Resolvido / Concluído', 'Encerrado sem solução pelo setor'].includes(status);
    const waiting = status.startsWith('Aguardando');
    const linkedProtest = data.protests.find(title => title.personId === person.id);
    const links = linkedProtest
      ? [{
        kind: 'protest' as const,
        id: linkedProtest.id
      }]
      : [{
        kind: 'debt' as const,
        id: data.debts[((index + 24) % data.people.length) * 2].id
      }];
    data.demands.push({
      ...base(`DEM-DEMO-${String(index + 1).padStart(3, '0')}`, status, 'Demanda', demoDay(-(index % 28))),
      ...operational(index),
      personId: person.id,
      subject: linkedProtest?.financialRegularized && !linkedProtest.cartorialRegularized
        ? 'Pagamento reconhecido com pendência cartorial'
        : `Pendência demonstrativa ${index + 1}`,
      description: 'Caso sintético para validar filas, responsáveis, prazos e conclusão sem alterar sistemas oficiais.',
      category: ['Acordo', 'Pagamento', 'Dívida Ativa', 'Protesto', 'Cadastro', 'Integração'][index % 6],
      actionPerformed: index % 3 === 0 ? null : 'Conferência demonstrativa realizada',
      result: index % 3 === 0 ? null : 'Informações do cenário consultadas',
      links,
      closedAt: closed ? demoDay(-2) : null,
      closureReason: closed
        ? status === 'Encerrado sem solução pelo setor'
          ? 'Encaminhado ao setor competente — exemplo demonstrativo.'
          : 'Providência concluída no cenário demonstrativo.'
        : null,
      waitReason: waiting ? 'Aguarda evento ou retorno identificado neste cenário demo.' : null,
      evidence: index % 4 === 0 ? null : `PROTO-DEMANDA-DEMO-${index + 1}`,
      nextAction: closed
        ? null
        : index % 13 === 0 ? null : 'Conferir pendência e registrar próxima providência na fonte oficial',
      deadline: closed ? null : index % 9 === 0 ? null : demoDay((index % 11) - 4)
    });
  }
  // Fronteira: pagamento reconhecido não encerra a demanda nem o efeito cartorial.
  const pendingPostProtest = data.protests.find(title => title.status === 'Aguardando Carta de Anuência')!;
  data.demands[0].personId = pendingPostProtest.personId;
  data.demands[0].subject = 'Carta de Anuência pendente após pagamento reconhecido';
  data.demands[0].links = [{
    kind: 'protest',
    id: pendingPostProtest.id
  }];
  data.demands[0].nextAction = 'Conferir autorização e emissão da Carta de Anuência';
  data.demands[0].deadline = demoDay(0);
  data.demands[0].sector = 'Negociação';
  data.demands[0].ownerId = 'demo-denilson';
  data.demands[0].ownerName = 'Denilson · Demo';
  return data;
}

export const fixtures = createFixtures();
