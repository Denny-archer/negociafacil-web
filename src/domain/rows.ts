import { fixtures, SOURCE_DATE } from './fixtures';
import { DEMO_INACTIVITY_DAYS } from './defaults';
import { formatDate, money } from './formatters';
import type { EntityKind, EntityRef, EntityRow, OperationalFields, SourceEntity } from './types';

export const dateBase = SOURCE_DATE.slice(0, 10);

export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const present = (value: string | undefined) => !!value && value !== 'all';
const person = (id: string) => fixtures.people.find(item => item.id === id)!;
const debtsFor = (ids: string[]) => fixtures.debts.filter(debt => ids.includes(debt.id));
export const sum = (rows: EntityRow[], key: 'amountCents' | 'receivedCents') => rows.reduce((total, row) => total + row[key], 0);
const linked = (kind: EntityKind, ids: string[]): EntityRef[] => ids.map(id => ({ kind, id }));

function baseRow(
  kind: EntityKind,
  entity: SourceEntity,
  personId: string | null,
  eventDate: string,
  operation?: OperationalFields
): EntityRow {
  const p = personId ? person(personId) : null;
  return {
    ref: { kind, id: entity.id },
    title: p?.name ?? entity.id,
    subtitle: p ? p.registrations.map(registration => registration.number).join(' · ') : entity.id,
    personId,
    personType: p?.personType ?? null,
    exercise: null,
    status: entity.status,
    statusRaw: entity.statusRaw,
    stage: null,
    owner: operation?.ownerName ?? null,
    sector: operation?.sector ?? null,
    nextAction: operation?.nextAction ?? null,
    deadline: operation?.deadline ?? null,
    lastMovement: operation?.lastMovement ?? eventDate,
    eventDate,
    amountCents: 0,
    receivedCents: 0,
    priority: operation?.priority ?? null,
    category: p?.category ?? null,
    alerts: [],
    values: {
      ownerId: operation?.ownerId ?? null,
      region: p?.region ?? null,
      registrationStatus: p?.status ?? null,
      deadlineSource: operation?.deadlineSource ?? null,
      closedAt: entity.status === 'Encerrado' ? operation?.lastMovement ?? eventDate : null
    },
    links: p ? [{ kind: 'person', id: p.id }] : [],
    history: [...entity.history],
    provenance: entity.provenance
  };
}

function debtFields(row: EntityRow, debtIds: string[]): void {
  const debts = debtsFor(debtIds);
  const exercises = [...new Set(debts.map(debt => debt.exercise))];
  row.exercise = exercises.length === 1 ? exercises[0] : null;
  row.values.exercises = exercises.join(', ');
  row.values.debtType = [...new Set(debts.map(debt => debt.debtType))].join(', ');
  row.values.debtIds = debtIds.join(', ');
  row.links.push(...linked('debt', debtIds));
}

function alertsFor(row: EntityRow): string[] {
  if (row.values.closedAt || row.ref.kind === 'person' || row.ref.kind === 'campaign') return [];
  const alerts: string[] = [];
  if (row.deadline && row.deadline < dateBase) alerts.push('Vencido');
  if (row.deadline === dateBase) alerts.push('Hoje');
  if (row.deadline && row.deadline > dateBase) alerts.push('A vencer');
  if (!row.owner) alerts.push('Sem responsável');
  if (!row.nextAction && !row.values.waitReason) alerts.push('Sem próxima ação');
  const elapsed = (new Date(`${dateBase}T12:00:00Z`).getTime() - new Date(`${row.lastMovement.slice(0, 10)}T12:00:00Z`).getTime()) / 86400000;
  if (elapsed >= DEMO_INACTIVITY_DAYS) alerts.push('Sem movimentação');
  if (row.values.firstInstallmentOverdue === 1) alerts.push('Primeira parcela não paga');
  if (row.ref.kind === 'protest' && row.values.returnStatus === null && row.values.remittanceStatus === 'CONFIRMADO') alerts.push('Retorno pendente');
  if (row.ref.kind === 'protest' && row.values.financialRegularized === 1 && row.values.cartorialRegularized === 0) alerts.push('Pendência cartorial');
  if (row.ref.kind === 'payment' && row.values.exception) alerts.push('Conferência financeira');
  return alerts;
}

function createRows(): Record<EntityKind, EntityRow[]> {
  const rows: Record<EntityKind, EntityRow[]> = {
    person: [],
    debt: [],
    collection: [],
    campaign: [],
    agreement: [],
    activeDebt: [],
    protest: [],
    payment: [],
    demand: []
  };
  fixtures.people.forEach(p => {
    const row = baseRow('person', p, p.id, p.createdAt);
    row.values.registrationCount = p.registrations.length;
    row.values.registrations = p.registrations.map(registration => registration.number).join(', ');
    const debts = fixtures.debts.filter(debt => debt.personId === p.id);
    row.amountCents = debts.reduce((total, debt) => total + debt.openAmountCents, 0);
    row.receivedCents = fixtures.payments.filter(payment => payment.personId === p.id).reduce((total, payment) => total + payment.recognizedCents, 0);
    row.links = [
      ...linked('debt', debts.map(debt => debt.id)),
      ...linked('agreement', fixtures.agreements.filter(item => item.personId === p.id).map(item => item.id)),
      ...linked('activeDebt', fixtures.activeDebts.filter(item => item.personId === p.id).map(item => item.id)),
      ...linked('protest', fixtures.protests.filter(item => item.personId === p.id).map(item => item.id)),
      ...linked('payment', fixtures.payments.filter(item => item.personId === p.id).map(item => item.id)),
      ...linked('demand', fixtures.demands.filter(item => item.personId === p.id).map(item => item.id))
    ];
    rows.person.push(row);
  });

  fixtures.debts.forEach(debt => {
    const row = baseRow('debt', debt, debt.personId, debt.dueDate, debt);
    row.subtitle = `${debt.id} · ${debt.debtType} ${debt.exercise}`;
    row.exercise = debt.exercise;
    row.stage = debt.stage;
    row.amountCents = debt.openAmountCents;
    row.receivedCents = fixtures.payments.filter(payment => payment.debtId === debt.id).reduce((total, payment) => total + payment.recognizedCents, 0);
    row.values = {
      ...row.values,
      debtType: debt.debtType,
      dueDate: debt.dueDate,
      originalAmountCents: debt.originalAmountCents,
      openAmountCents: debt.openAmountCents,
      agreementStatuses: debt.agreementIds.map(id => fixtures.agreements.find(item => item.id === id)?.status ?? '').join(', '),
      activeDebtStatuses: debt.activeDebtIds.map(id => fixtures.activeDebts.find(item => item.id === id)?.status ?? '').join(', '),
      protestStatuses: debt.protestIds.map(id => fixtures.protests.find(item => item.id === id)?.status ?? '').join(', '),
      closedAt: ['Quitado', 'Substituído por acordo'].includes(debt.status) ? debt.lastMovement : null
    };
    row.links.push(
      ...linked('agreement', debt.agreementIds),
      ...linked('activeDebt', debt.activeDebtIds),
      ...linked('protest', debt.protestIds),
      ...linked('campaign', fixtures.participations.filter(item => item.debtIds.includes(debt.id)).map(item => item.campaignId))
    );
    rows.debt.push(row);
  });

  fixtures.collections.forEach(collection => {
    const row = baseRow('collection', collection, collection.personId, collection.noticeSentAt ?? collection.history[0].date, collection);
    debtFields(row, collection.debtIds);
    row.stage = collection.stage;
    row.amountCents = debtsFor(collection.debtIds).reduce((total, debt) => total + debt.openAmountCents, 0);
    const participation = fixtures.participations.find(item => item.collectionId === collection.id);
    const attributedPayments = fixtures.payments.filter(payment => participation?.paymentIds.includes(payment.id) && payment.attributionReliable);
    row.receivedCents = attributedPayments.reduce((total, payment) => total + payment.recognizedCents, 0);
    row.values = {
      ...row.values,
      campaignId: collection.campaignId,
      campaignName: fixtures.campaigns.find(campaign => campaign.id === collection.campaignId)?.name ?? null,
      noticeSentAt: collection.noticeSentAt,
      noticeDeadline: collection.noticeDeadline,
      suspendedReason: collection.suspendedReason
    };
    if (collection.campaignId) row.links.push({ kind: 'campaign', id: collection.campaignId });
    rows.collection.push(row);
  });

  fixtures.campaigns.forEach(campaign => {
    const row = baseRow('campaign', campaign, null, campaign.startedAt, campaign);
    row.title = campaign.name;
    row.subtitle = campaign.description;
    const participants = fixtures.participations.filter(item => item.campaignId === campaign.id);
    const paymentIds = participants.flatMap(item => item.paymentIds);
    const payments = fixtures.payments.filter(payment => paymentIds.includes(payment.id));
    const currentDebts = debtsFor([...new Set(participants.flatMap(item => item.debtIds))]);
    const initialPeople = new Set(participants.map(item => item.personId)).size;
    const paidPeople = new Set(payments.filter(payment => payment.recognizedCents > 0).map(payment => payment.personId)).size;
    const remainingPeople = new Set(
      currentDebts
        .filter(debt => debt.openAmountCents > 0 && debt.dueDate < dateBase && !debt.status.startsWith('Suspenso'))
        .map(debt => debt.personId)
    ).size;
    row.amountCents = currentDebts.reduce((total, debt) => total + debt.openAmountCents, 0);
    row.receivedCents = payments.reduce((total, payment) => total + payment.recognizedCents, 0);
    row.values = {
      ...row.values,
      initialPeople,
      initialAmountCents: participants.reduce((total, item) => total + item.initialAmountCents, 0),
      reachedPeople: participants.filter(item => item.contacted).length,
      negotiatedPeople: new Set(participants.filter(item => item.agreementIds.length).map(item => item.personId)).size,
      paidPeople,
      remainingPeople,
      recoveredCents: row.receivedCents,
      remainingCents: row.amountCents,
      conversionRate: initialPeople ? paidPeople / initialPeople * 100 : 0,
      startedAt: campaign.startedAt,
      endedAt: campaign.endedAt,
      initialPopulationSource: 'Snapshot sintético de participação',
      attributionRule: 'Pagamentos vinculados explicitamente à participação demo'
    };
    row.values.personTypes = [...new Set(participants.map(item => person(item.personId).personType))].join(', ');
    row.values.categories = [...new Set(participants.map(item => person(item.personId).category))].join(', ');
    row.values.region = [...new Set(participants.map(item => person(item.personId).region))].join(', ');
    row.values.exercises = [...new Set(currentDebts.map(item => item.exercise))].join(', ');
    row.values.debtType = [...new Set(currentDebts.map(item => item.debtType))].join(', ');
    row.links.push(
      ...linked('collection', participants.map(item => item.collectionId)),
      ...linked('debt', currentDebts.map(item => item.id)),
      ...linked('agreement', participants.flatMap(item => item.agreementIds)),
      ...linked('activeDebt', [...new Set(currentDebts.flatMap(item => item.activeDebtIds))]),
      ...linked('protest', [...new Set(currentDebts.flatMap(item => item.protestIds))])
    );
    rows.campaign.push(row);
  });

  fixtures.agreements.forEach(agreement => {
    const row = baseRow('agreement', agreement, agreement.personId, agreement.formalizedAt ?? agreement.history[0].date, agreement);
    debtFields(row, agreement.debtIds);
    const installments = fixtures.installments.filter(item => item.agreementId === agreement.id);
    const first = installments.find(item => item.number === 1);
    const payments = fixtures.payments.filter(payment => payment.agreementId === agreement.id);
    row.subtitle = `${agreement.id} · ${installments.length} parcelas`;
    row.amountCents = agreement.negotiatedAmountCents;
    row.receivedCents = payments.reduce((total, item) => total + item.recognizedCents, 0);
    row.stage = agreement.formalizedAt ? 'Após formalização' : 'Formalização';
    row.values = {
      ...row.values,
      negotiatedAmountCents: agreement.negotiatedAmountCents,
      outstandingCents: installments.length ? installments.reduce((total, item) => total + item.amountCents - item.paidCents, 0) : null,
      formalizedAt: agreement.formalizedAt,
      firstInstallmentDue: first?.dueDate ?? null,
      firstInstallmentPaid: first ? Number(first.paidCents >= first.amountCents) : null,
      firstInstallmentOverdue: first ? Number(first.dueDate < dateBase && first.paidCents < first.amountCents) : null,
      firstInstallmentStatus: !first
        ? 'Sem parcelas disponíveis'
        : first.paidCents >= first.amountCents
          ? 'Paga'
          : first.dueDate < dateBase
            ? 'Vencida sem pagamento'
            : 'Aguardando vencimento',
      installmentCount: installments.length,
      installmentSchedule: installments
        .map(item => `Parcela ${item.number}: ${formatDate(item.dueDate)} · ${money(item.amountCents)} · pago ${money(item.paidCents)}`)
        .join('\n'),
      installmentsPaid: installments.filter(item => item.paidCents >= item.amountCents).length,
      installmentsOverdue: installments.filter(item => item.dueDate < dateBase && item.paidCents < item.amountCents).length,
      previousAgreementId: agreement.previousAgreementId,
      renegotiationCount: agreement.renegotiationCount,
      closedAt: agreement.status === 'Quitado' ? agreement.lastMovement : null
    };
    if (agreement.previousAgreementId) row.links.push({ kind: 'agreement', id: agreement.previousAgreementId });
    row.links.push(...linked('payment', payments.map(item => item.id)));
    rows.agreement.push(row);
  });

  fixtures.activeDebts.forEach(activeDebt => {
    const row = baseRow('activeDebt', activeDebt, activeDebt.personId, activeDebt.history[0].date, activeDebt);
    debtFields(row, activeDebt.debtIds);
    const documents = fixtures.documents.filter(item => activeDebt.documentIds.includes(item.id));
    const term = documents.find(item => item.type === 'Termo');
    const cda = documents.find(item => item.type === 'CDA');
    row.subtitle = `${activeDebt.id} · ${cda?.number ?? 'CDA não gerada'}`;
    row.amountCents = debtsFor(activeDebt.debtIds).reduce((total, debt) => total + debt.openAmountCents, 0);
    row.stage = activeDebt.status;
    row.values = {
      ...row.values,
      eligibleAmountCents: activeDebt.eligibleAmountCents,
      inscriptionBatchId: activeDebt.inscriptionBatchId,
      termNumber: term?.number ?? null,
      termGeneratedAt: term?.generatedAt ?? null,
      termSentAt: term?.sentAt ?? null,
      cdaNumber: cda?.number ?? null,
      cdaGeneratedAt: cda?.generatedAt ?? null,
      cdaSentAt: cda?.sentAt ?? null,
      cdaUpdatedAt: cda?.updatedAt ?? null,
      cancelledAt: cda?.cancelledAt ?? null,
      notifiedAt: activeDebt.notifiedAt,
      subsequentMeasures: activeDebt.subsequentMeasures.join(', ') || null,
      impediment: activeDebt.impediment,
      documentEvidence: documents.map(item => item.evidence).join('\n') || null
    };
    row.links.push(...linked('protest', fixtures.protests.filter(item => item.activeDebtId === activeDebt.id).map(item => item.id)));
    rows.activeDebt.push(row);
  });

  fixtures.protests.forEach(protest => {
    const row = baseRow('protest', protest, protest.personId, protest.remittanceDate ?? protest.history[0].date, protest);
    debtFields(row, protest.debtIds);
    row.amountCents = protest.amountCents;
    row.stage = protest.status;
    const cda = fixtures.documents.find(item => item.activeDebtId === protest.activeDebtId && item.type === 'CDA');
    row.subtitle = `${protest.titleNumber} · ${protest.protocol ?? 'Sem protocolo'}`;
    row.receivedCents = fixtures.payments.filter(payment => payment.protestId === protest.id).reduce((total, item) => total + item.recognizedCents, 0);
    row.values = {
      ...row.values,
      titleNumber: protest.titleNumber,
      cdaNumber: cda?.number ?? null,
      cartorio: protest.cartorio,
      protocol: protest.protocol,
      remittanceStatus: protest.remittanceStatus,
      returnStatus: protest.returnStatus,
      remittanceDate: protest.remittanceDate,
      confirmationDate: protest.confirmationDate,
      movementCode: protest.movementCode,
      movementDescription: protest.movementDescription,
      movementDate: protest.movementDate,
      returnDate: protest.returnDate,
      returnReason: protest.returnReason,
      cartorialDeadline: protest.cartorialDeadline,
      cartorialDeadlineSource: protest.cartorialDeadlineSource,
      daysRemaining: protest.cartorialDeadline
        ? Math.round(
            (new Date(`${protest.cartorialDeadline}T12:00:00Z`).getTime() -
              new Date(`${dateBase}T12:00:00Z`).getTime()) / 86400000
          )
        : null,
      financialRegularized: Number(protest.financialRegularized),
      cartorialRegularized: Number(protest.cartorialRegularized),
      consentIssuedAt: protest.consentIssuedAt,
      consentSentAt: protest.consentSentAt
    };
    row.links.push(
      { kind: 'activeDebt', id: protest.activeDebtId },
      ...linked(
        'payment',
        fixtures.payments
          .filter(item => item.protestId === protest.id)
          .map(item => item.id)
      )
    );
    rows.protest.push(row);
  });

  fixtures.payments.forEach(payment => {
    const row = baseRow('payment', payment, payment.personId, payment.recognizedAt ?? payment.occurredAt, payment);
    if (payment.debtId) debtFields(row, [payment.debtId]);
    row.subtitle = `${payment.id} · ${payment.method}`;
    row.amountCents = payment.amountCents;
    row.receivedCents = payment.recognizedCents;
    row.stage = payment.postingStatus;
    row.values = {
      ...row.values,
      informedAt: payment.occurredAt,
      recognizedAt: payment.recognizedAt,
      settlementAt: payment.settlementAt,
      postingAt: payment.postingAt,
      financialStatus: payment.financialStatus,
      postingStatus: payment.postingStatus,
      paymentMethod: payment.method,
      exception: payment.exception,
      strategy: payment.attributionReliable ? payment.strategy : null,
      attributionReliable: Number(payment.attributionReliable),
      seriesMonth: (payment.recognizedAt ?? payment.occurredAt).slice(0, 7),
      proofIsConfirmation: 0,
      agreementId: payment.agreementId,
      installmentId: payment.installmentId,
      activeDebtId: payment.activeDebtId,
      protestId: payment.protestId
    };
    if (payment.agreementId) row.links.push({ kind: 'agreement', id: payment.agreementId });
    if (payment.activeDebtId) row.links.push({ kind: 'activeDebt', id: payment.activeDebtId });
    if (payment.protestId) row.links.push({ kind: 'protest', id: payment.protestId });
    row.links.push(...linked('campaign', fixtures.participations.filter(item => item.paymentIds.includes(payment.id)).map(item => item.campaignId)));
    rows.payment.push(row);
  });

  fixtures.demands.forEach(demand => {
    const row = baseRow('demand', demand, demand.personId, demand.lastMovement, demand);
    row.subtitle = `${demand.id} · ${demand.subject}`;
    row.category = demand.category;
    row.values = {
      ...row.values,
      subject: demand.subject,
      description: demand.description,
      actionPerformed: demand.actionPerformed,
      result: demand.result,
      closedAt: demand.closedAt,
      closureReason: demand.closureReason,
      waitReason: demand.waitReason,
      evidence: demand.evidence
    };
    row.links.push(...demand.links);
    rows.demand.push(row);
  });

  Object.values(rows).flat().forEach(row => { row.alerts = alertsFor(row); });
  return rows;
}

export const allRows = createRows();
export const entityKinds: EntityKind[] = [
  'person',
  'debt',
  'collection',
  'campaign',
  'agreement',
  'activeDebt',
  'protest',
  'payment',
  'demand'
];
export const statusByKind = Object.fromEntries(
  entityKinds.map(kind => [
    kind,
    [...new Set(allRows[kind].map(row => row.status))].map(value => ({
      value,
      label: value
    }))
  ])
) as Record<EntityKind, { value: string; label: string }[]>;
export const statusesPerKind = Object.fromEntries(
  entityKinds.map(kind => [
    kind,
    new Set(allRows[kind].flatMap(row => [row.status, row.statusRaw ?? '']))
  ])
) as Record<EntityKind, Set<string>>;
export const stagesPerKind = Object.fromEntries(
  entityKinds.map(kind => [
    kind,
    new Set(
      allRows[kind]
        .map(row => row.stage)
        .filter((stage): stage is string => stage !== null)
    )
  ])
) as Record<EntityKind, Set<string>>;
