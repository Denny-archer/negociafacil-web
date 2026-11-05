'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Executa os mesmos módulos da aplicação. A transpilação apenas resolve o
// carregamento CommonJS do node:test; os tipos são verificados pelo build.
const root = path.resolve(__dirname, '..');
const cache = path.join(root, 'node_modules', '.cache', 'negociafacil-tests');
fs.mkdirSync(cache, { recursive: true });
fs.writeFileSync(path.join(cache, 'package.json'), '{"type":"commonjs"}\n');
function compile(relative) {
  const source = path.join(root, 'src', relative);
  const target = path.join(cache, relative.replace(/\.ts$/, '.js'));
  const result = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    fileName: source,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      sourceMap: false,
    },
  });
  const errors = (result.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, result.outputText);
}
function compileDirectory(relative) {
  for (const entry of fs.readdirSync(path.join(root, 'src', relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) compileDirectory(child);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) compile(child);
  }
}
compileDirectory('domain');
compile('documents.ts');
compileDirectory(path.join('features', 'documents'));
compile('app/navigation.ts');
compile('features/records/formatting.ts');
compile('features/workspace/recordsMath.ts');
compile('features/reports/reportData.ts');

const domain = require(path.join(cache, 'domain', 'index.js'));
const documents = require(path.join(cache, 'documents.js'));
const { fixtures, SOURCE_DATE, defaultContext, entityKinds, queryRows, filterRows, getRow, getMetrics, getSeries, getCatalogs, dashboardRepository, money } = domain;
const { buildDocumentSnapshot, buildPrintHtml, escapeHtml } = documents;
const { resolveView, resetViewFilters } = require(path.join(cache, 'app', 'navigation.js'));
const { comparisonPeriod, getReportData, reportChoices } = require(path.join(cache, 'features', 'reports', 'reportData.js'));

test('contratos de consulta expõem disponibilidade, origem e definição do indicador', async () => {
  const selected = { filters: { ...defaultContext.filters }, session: { ...defaultContext.session } };
  const state = await dashboardRepository.getSnapshot(selected);
  assert.equal(state.dataAvailability.state, 'available');
  assert.equal(state.dataAvailability.asOf, SOURCE_DATE);
  assert.match(state.dataAvailability.source, /Demonstração/);
  for (const indicator of await dashboardRepository.getIndicators('overview', selected)) {
    assert.equal(indicator.definitionInfo.id, indicator.id);
    assert.equal(indicator.definitionInfo.unit, indicator.unit);
    assert.deepEqual(indicator.definitionInfo.population, indicator.rows.map(row => row.ref));
    assert.equal(indicator.definitionInfo.homologation, indicator.pending ? 'pending' : 'demo');
  }
});

test('pessoas contadas nos indicadores preservam identidade e origem cadastrais', () => {
  const selected = { filters: { ...defaultContext.filters }, session: { ...defaultContext.session } };
  for (const row of getMetrics('overview', selected).find(item => item.id === 'overdue-people').rows) {
    const canonical = getRow(row.ref, selected);
    assert.equal(row.status, canonical.status);
    assert.equal(row.provenance.sourceId, row.ref.id);
    assert.equal(row.stage, null);
  }
});
const dateBase = SOURCE_DATE.slice(0, 10);
const context = (filters = {}, session = {}, search) => ({ filters: { ...defaultContext.filters, ...filters }, session: { ...defaultContext.session, ...session }, ...(search === undefined ? {} : { search }) });
const refs = rows => rows.map(row => row.ref.kind + ':' + row.ref.id).sort();
const ids = rows => rows.map(row => row.ref.id).sort();
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
function metric(view, id, selectedContext = context()) {
  const result = getMetrics(view, selectedContext).find(item => item.id === id);
  assert.ok(result, 'Indicador ausente: ' + view + '/' + id);
  return result;
}
function snapshot(records, overrides = {}) {
  return buildDocumentSnapshot({ title: 'Consulta de homologação', records, context: context(), dataBase: SOURCE_DATE, mode: 'detailed', ...overrides });
}

test('pessoas, registros e processos coexistem sem substituir identificadores', () => {
  const multiple = fixtures.people.find(person => person.registrations.length > 1);
  assert.ok(multiple, 'O cenário deve conter uma pessoa com mais de um registro.');
  const linked = fixtures.people.find(person => fixtures.agreements.some(item => item.personId === person.id) && fixtures.activeDebts.some(item => item.personId === person.id) && fixtures.protests.some(item => item.personId === person.id) && fixtures.demands.some(item => item.personId === person.id));
  assert.ok(linked, 'O cenário deve exercitar processos simultâneos.');
  const row = getRow({ kind: 'person', id: linked.id }, context());
  for (const kind of ['debt', 'agreement', 'activeDebt', 'protest', 'demand']) assert.ok(row.links.some(ref => ref.kind === kind), kind);
  const open = fixtures.debts.filter(debt => debt.personId === linked.id).reduce((total, debt) => total + debt.openAmountCents, 0);
  assert.equal(row.amountCents, open, 'Saldo da pessoa não soma novamente seus acordos, DA ou títulos.');
});

test('inadimplência conta pessoas distintas e saldo somente dos débitos elegíveis do recorte', () => {
  const eligible = fixtures.debts.filter(debt => debt.openAmountCents > 0 && debt.dueDate < dateBase && !debt.status.startsWith('Suspenso'));
  const expectedPeople = [...new Set(eligible.map(debt => debt.personId))].sort();
  assert.deepEqual(ids(metric('overview', 'overdue-people').rows), expectedPeople);
  assert.equal(metric('delinquency', 'balance').value, money(eligible.reduce((total, debt) => total + debt.openAmountCents, 0)));
  const selected = context({ personType: 'PJ' });
  assert.ok(metric('overview', 'overdue-people', selected).rows.every(row => row.personType === 'PJ'));
  assert.equal(metric('overview', 'open-amount', selected).value, money(sum(queryRows('debt', selected), 'amountCents')));
});

test('recuperação inclui estornos e exclui comprovantes ou valores sem reconhecimento', () => {
  const recognized = fixtures.payments.filter(payment => payment.recognizedAt !== null);
  const reversals = recognized.filter(payment => payment.recognizedCents < 0);
  assert.ok(reversals.length, 'O cenário precisa de estorno para testar recuperação líquida.');
  const received = metric('payments', 'received');
  assert.deepEqual(ids(received.rows), recognized.map(payment => payment.id).sort());
  assert.equal(received.value, money(recognized.reduce((total, payment) => total + payment.recognizedCents, 0)));
  const informed = queryRows('payment', context()).filter(row => row.values.recognizedAt === null);
  assert.ok(informed.length);
  assert.ok(informed.every(row => row.receivedCents === 0 && row.values.proofIsConfirmation === 0));
  assert.ok(informed.every(row => !received.rows.some(item => item.ref.id === row.ref.id)));
  assert.ok(queryRows('payment', context()).every(row => !['Negociação', 'Protesto/cartório'].includes(row.values.paymentMethod)), 'Origem da recuperação não é meio de pagamento.');
});

test('série de recuperação reconcilia eventos reconhecidos por mês sem criar estoque histórico', () => {
  const expected = new Map();
  for (const payment of fixtures.payments.filter(item => item.recognizedAt !== null)) {
    const month = payment.recognizedAt.slice(0, 7);
    expected.set(month, (expected.get(month) || 0) + payment.recognizedCents);
  }
  const series = getSeries(context(), 'money');
  assert.deepEqual(series.map(point => [point.label, Math.round(point.first * 100)]), [...expected.entries()].sort(([a], [b]) => a.localeCompare(b)));
  assert.deepEqual(getSeries(context(), 'people'), [], 'Não inventa série histórica de estoque ausente.');
});

test('formalização não substitui primeira parcela paga e parcelas conciliam com o acordo', () => {
  const awaiting = fixtures.agreements.filter(agreement => agreement.status === 'Termo assinado / aguardando primeira parcela');
  assert.ok(awaiting.length);
  const current = new Set(ids(metric('negotiation', 'current').rows));
  for (const agreement of awaiting) {
    assert.ok(agreement.formalizedAt);
    assert.ok(!current.has(agreement.id));
    const row = getRow({ kind: 'agreement', id: agreement.id }, context());
    assert.equal(row.values.firstInstallmentPaid, 0);
  }
  for (const agreement of fixtures.agreements) {
    const row = getRow({ kind: 'agreement', id: agreement.id }, context());
    const installments = fixtures.installments.filter(item => item.agreementId === agreement.id);
    assert.equal(row.amountCents, agreement.negotiatedAmountCents);
    assert.equal(row.values.installmentCount, installments.length);
    if (installments.length) {
      assert.equal(sum(installments, 'amountCents'), agreement.negotiatedAmountCents);
      assert.equal(row.values.outstandingCents, installments.reduce((total, item) => total + item.amountCents - item.paidCents, 0));
    } else assert.equal(row.values.outstandingCents, null, 'Histórico sem parcelas não recebe saldo zero presumido.');
  }
});

test('renegociações preservam cadeia existente da mesma pessoa', () => {
  const repeated = fixtures.agreements.filter(item => item.renegotiationCount > 1);
  assert.ok(repeated.length);
  for (const agreement of fixtures.agreements.filter(item => item.previousAgreementId)) {
    const previous = fixtures.agreements.find(item => item.id === agreement.previousAgreementId);
    assert.ok(previous, 'Acordo anterior precisa existir: ' + agreement.previousAgreementId);
    assert.equal(previous.personId, agreement.personId);
    assert.notEqual(previous.id, agreement.id);
  }
  assert.deepEqual(ids(metric('negotiation', 'repeat').rows), repeated.map(item => item.id).sort());
});

test('termo gerado sem envio não inicia prazo pós-notificação', () => {
  const generatedOnly = fixtures.documents.filter(document => document.type === 'Termo' && document.sentAt === null);
  assert.ok(generatedOnly.length);
  const sent = new Set(ids(metric('active-debt', 'terms-sent').rows));
  for (const document of generatedOnly) {
    const row = getRow({ kind: 'activeDebt', id: document.activeDebtId }, context());
    assert.equal(row.values.termGeneratedAt, document.generatedAt);
    assert.equal(row.values.termSentAt, null);
    assert.equal(row.deadline, null);
    assert.ok(!sent.has(row.ref.id));
  }
});

test('remessa confirmada sem retorno não conta como protesto lavrado', () => {
  const waiting = fixtures.protests.filter(title => title.remittanceStatus === 'CONFIRMADO' && title.returnStatus === null);
  assert.ok(waiting.length);
  assert.deepEqual(ids(metric('protest', 'awaiting').rows), waiting.map(title => title.id).sort());
  const protested = new Set(ids(metric('protest', 'protested').rows));
  assert.ok(waiting.every(title => !protested.has(title.id)));
  assert.ok(metric('protest', 'protested').rows.every(row => row.values.returnStatus === 'PROTESTADO'));
  assert.ok(queryRows('protest', context()).filter(row => !row.values.cartorialDeadline).every(row => row.values.daysRemaining === null), 'Prazo ausente não é inferido.');
});

test('baixa financeira não encerra regularização cartorial nem demanda aberta', () => {
  const pending = fixtures.protests.filter(title => title.financialRegularized && !title.cartorialRegularized);
  assert.ok(pending.length);
  assert.deepEqual(ids(metric('protest', 'post').rows), pending.map(title => title.id).sort());
  const demands = fixtures.demands.filter(demand => !demand.closedAt && demand.links.some(ref => ref.kind === 'protest' && pending.some(title => title.id === ref.id)));
  assert.ok(demands.length);
  const open = new Set(ids(metric('demands', 'open').rows));
  assert.ok(demands.every(demand => open.has(demand.id)));
  for (const title of pending) assert.ok(getRow({ kind: 'protest', id: title.id }, context()).alerts.includes('Pendência cartorial'));
});

test('Demandas preservam os 12 estados, encerramento e alertas independentes', () => {
  const expected = ['Novo / A iniciar', 'Em análise', 'Em execução', 'Aguardando profissional', 'Aguardando outro setor', 'Aguardando sistema / suporte', 'Aguardando prazo / evento', 'Regularização em andamento', 'Escalado / Encaminhado', 'Suspenso', 'Resolvido / Concluído', 'Encerrado sem solução pelo setor'];
  assert.deepEqual([...new Set(fixtures.demands.map(item => item.status))].sort(), expected.sort());
  for (const demand of fixtures.demands) {
    const row = getRow({ kind: 'demand', id: demand.id }, context());
    assert.equal(row.status, demand.status);
    assert.equal(row.priority, demand.priority);
    assert.equal(row.values.closedAt, demand.closedAt);
    if (demand.closedAt) {
      assert.ok(demand.closureReason);
      assert.deepEqual(row.alerts, []);
    } else if (!demand.nextAction && !demand.waitReason) assert.ok(row.alerts.includes('Sem próxima ação'));
    else assert.ok(!row.alerts.includes('Sem próxima ação'));
  }
  assert.ok(queryRows('demand', context()).some(row => row.alerts.length > 1), 'Alertas devem coexistir sem substituir o estado.');
});

test('relógio da operação e data-base permanecem ligados à fonte demonstrativa', async () => {
  const originalDate = global.Date;
  const before = queryRows('demand', context()).map(row => [row.ref.id, row.alerts]);
  const mockedNow = '2040-05-09T03:00:00.000Z';
  global.Date = class extends originalDate {
    constructor(...args) { super(...(args.length ? args : [mockedNow])); }
    static now() { return new originalDate(mockedNow).getTime(); }
  };
  try {
    const source = await dashboardRepository.getSnapshot(context());
    assert.equal(source.dataBase, SOURCE_DATE);
    assert.deepEqual(source.rows.demand.map(row => [row.ref.id, row.alerts]), before);
    const doc = snapshot(source.rows.debt);
    assert.equal(doc.dataBase, new originalDate(SOURCE_DATE).toISOString());
    assert.equal(doc.generatedAt, mockedNow, 'Geração do documento é outra data.');
  } finally { global.Date = originalDate; }
});

test('período de evento e exercício do débito são filtros independentes e inclusivos', () => {
  const event = fixtures.payments.find(payment => payment.recognizedAt && payment.debtId && String(fixtures.debts.find(debt => debt.id === payment.debtId).exercise) !== payment.recognizedAt.slice(0, 4));
  assert.ok(event, 'O cenário precisa de recebimento de exercício anterior.');
  const debt = fixtures.debts.find(item => item.id === event.debtId);
  const day = event.recognizedAt.slice(0, 10);
  const selected = context({ from: day, to: day, exercise: String(debt.exercise) });
  assert.ok(queryRows('payment', selected).some(row => row.ref.id === event.id));
  assert.ok(queryRows('payment', selected).every(row => row.eventDate.slice(0, 10) === day));
  const otherExercise = String(debt.exercise + 1);
  assert.ok(!queryRows('payment', context({ from: day, to: day, exercise: otherExercise })).some(row => row.ref.id === event.id));
  assert.equal(queryRows('payment', context({ from: '2099-12-31', to: '2000-01-01' })).length, 0);
});

test('estados de outro domínio não anulam recebimentos e estados desconhecidos não são aceitos', () => {
  const agreementStatus = 'Termo assinado / aguardando primeira parcela';
  assert.ok(queryRows('agreement', context()).some(row => row.status === agreementStatus));
  assert.ok(queryRows('agreement', context({ status: agreementStatus })).every(row => row.status === agreementStatus));
  assert.deepEqual(ids(queryRows('payment', context({ status: agreementStatus }))), ids(queryRows('payment', context())));
  for (const kind of entityKinds) assert.equal(queryRows(kind, context({ status: '__estado_inexistente__' })).length, 0);
});

test('relacionamentos com/sem acordo, DA e protesto respeitam entidades e vínculos', () => {
  const debts = queryRows('debt', context());
  for (const [field, kind] of [['agreement', 'agreement'], ['activeDebt', 'activeDebt'], ['protest', 'protest']]) {
    const yes = queryRows('debt', context({ [field]: 'with' }));
    const no = queryRows('debt', context({ [field]: 'without' }));
    assert.deepEqual(ids(yes), ids(debts.filter(row => row.links.some(ref => ref.kind === kind))));
    assert.deepEqual(ids(no), ids(debts.filter(row => !row.links.some(ref => ref.kind === kind))));
    assert.equal(yes.length + no.length, debts.length);
  }
});

test('campanhas segmentam a população e os recebimentos sem duplicar o saldo de pessoas', () => {
  const selected = context({ personType: 'PF' });
  const people = new Set(fixtures.people.filter(person => person.personType === 'PF').map(person => person.id));
  for (const campaign of queryRows('campaign', selected)) {
    const participants = fixtures.participations.filter(item => item.campaignId === campaign.ref.id && people.has(item.personId));
    assert.equal(campaign.values.initialPeople, new Set(participants.map(item => item.personId)).size);
    assert.equal(campaign.values.initialAmountCents, participants.reduce((total, item) => total + item.initialAmountCents, 0));
    const paymentIds = new Set(participants.flatMap(item => item.paymentIds));
    const recovered = fixtures.payments.filter(payment => paymentIds.has(payment.id) && payment.attributionReliable).reduce((total, payment) => total + payment.recognizedCents, 0);
    assert.equal(campaign.receivedCents, recovered);
    assert.equal(campaign.values.recoveredCents, recovered);
    assert.ok(Number.isFinite(campaign.values.conversionRate));
  }
});

test('perfil Equipe respeita setor canônico e não aceita setor falsificado ou ID inexistente', () => {
  const selected = context({}, { profile: 'Equipe', sector: 'Negociação' });
  for (const kind of entityKinds.filter(item => item !== 'person')) assert.ok(queryRows(kind, selected).every(row => row.sector === selected.session.sector));
  const hidden = queryRows('payment', context()).find(row => row.sector !== selected.session.sector);
  assert.ok(hidden);
  assert.equal(getRow(hidden.ref, selected), null);
  assert.deepEqual(filterRows([{ ...hidden, sector: selected.session.sector }], selected), []);
  assert.deepEqual(filterRows([{ ...hidden, ref: { ...hidden.ref, id: '__inexistente__' } }], context()), []);
  const administrative = context({}, { ...selected.session, admin: true });
  assert.deepEqual(ids(queryRows('payment', administrative)), ids(queryRows('payment', selected)), 'Prévia administrativa não amplia o escopo do perfil.');
});

test('Chefia e Gestão compartilham a base; getRow valida autorização independentemente dos filtros da lista', () => {
  for (const kind of entityKinds) assert.deepEqual(ids(queryRows(kind, context({}, { profile: 'Chefia' }))), ids(queryRows(kind, context({}, { profile: 'Gestão' }))));
  const row = queryRows('agreement', context())[0];
  const visual = context({ from: '2099-01-01', status: '__estado_inexistente__' });
  assert.equal(queryRows('agreement', visual).length, 0);
  const related = getRow(row.ref, visual);
  assert.equal(related.ref.id, row.ref.id);
  assert.equal(snapshot([related], { context: visual }).records.length, 0, 'O motor documental não limpa filtros automaticamente.');
  const individual = snapshot([related], { context: context({}, visual.session), scope: 'Ficha individual autorizada; vínculo fora do recorte original' });
  assert.equal(individual.records.length, 1);
  assert.equal(individual.context.session.profile, visual.session.profile);
  assert.ok(individual.scope.includes('fora do recorte original'));
});

test('metas, faixas e estoque histórico pendentes não viram números zero', async () => {
  for (const id of ['old-debts', 'goal']) {
    const item = metric('overview', id);
    assert.equal(item.pending, true);
    assert.notEqual(item.value, '0');
    assert.deepEqual(item.rows, []);
  }
  const catalogs = getCatalogs(context());
  assert.ok(catalogs.amountBand.every(option => option.value === 'all'));
  assert.ok(catalogs.ageBand.every(option => option.value === 'all'));
  const source = await dashboardRepository.getSnapshot(context());
  for (const key of ['officialApi', 'officialStatusMapping', 'historicalStock', 'institutionalGoals']) assert.equal(source.availability[key], 'pending');
});

test('snapshot documental reconcilia seleção completa, IDs e centavos em todos os domínios', () => {
  for (const kind of entityKinds) {
    const records = queryRows(kind, context());
    assert.ok(records.length, 'Fixture do domínio ausente: ' + kind);
    const doc = snapshot(records);
    assert.deepEqual(refs(doc.records), refs(records));
    assert.equal(doc.totals.count, records.length);
    assert.equal(doc.totals.amountCents, sum(records, 'amountCents'));
    assert.equal(doc.totals.receivedCents, sum(records, 'receivedCents'));
    assert.ok(doc.rows.every((cells, index) => cells.join(' ').includes(records[index].ref.id)));
    const html = buildPrintHtml(doc);
    assert.equal((html.match(/data-record-id=/g) || []).length, records.length);
    assert.ok(html.includes('table-header-group') && html.includes('counter(page)'));
  }
  const rows = queryRows('debt', context());
  assert.ok(rows.length > 10, 'O cenário deve ultrapassar uma página visual.');
  assert.ok(snapshot(rows).records.length > rows.slice(0, 10).length);
});

test('pesquisa por prioridade, setor, categoria e etapa mantém população UI/documento', () => {
  const rows = queryRows('demand', context());
  const stageRows = queryRows('agreement', context());
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cases = [
    [rows, rows.find(row => row.priority && row.priority.includes('Crítica')).priority],
    [rows, 'CRÍTICA'],
    [rows, rows.find(row => row.sector).sector],
    [rows, rows.find(row => row.category).category],
    [stageRows, stageRows.find(row => row.stage).stage],
  ];
  for (const [records, term] of cases) {
    const expected = records.filter(row => normalize([row.ref.id, row.title, row.subtitle, row.status, row.stage, row.owner, row.sector, row.category, row.priority, row.nextAction, ...Object.values(row.values)].join(' ')).includes(normalize(term)));
    assert.ok(expected.length, 'Busca de fronteira deve encontrar população: ' + term);
    const selected = context({}, {}, term);
    assert.deepEqual(refs(filterRows(records, selected)), refs(expected), term);
    assert.deepEqual(refs(snapshot(records, { context: context(), search: term }).records), refs(expected), term);
  }
});

test('documento reaplica perfil/filtros e conserva valores derivados do recorte', () => {
  const records = queryRows('debt', context());
  const selected = context({ exercise: String(records[0].exercise), personType: records[0].personType });
  const doc = snapshot(records, { context: selected });
  assert.deepEqual(refs(doc.records), refs(queryRows('debt', selected)));
  const team = context({}, { profile: 'Equipe', sector: 'Negociação' });
  const scoped = snapshot(queryRows('payment', context()), { context: team });
  assert.deepEqual(refs(scoped.records), refs(queryRows('payment', team)));
  const people = metric('overview', 'overdue-people', selected).rows;
  const population = snapshot(people, { context: selected });
  assert.equal(population.totals.amountCents, sum(people, 'amountCents'), 'Não substitui saldo derivado por saldo total da pessoa.');
  assert.deepEqual(population.context.filters, selected.filters);
  const campaignContext = context({ personType: 'PF' });
  const campaigns = queryRows('campaign', campaignContext);
  const campaignDocument = snapshot(campaigns, { context: campaignContext });
  assert.ok(campaigns.some(row => row.values.initialPeople !== getRow(row.ref, campaignContext).values.initialPeople), 'O cenário deve distinguir a projeção da campanha e seu total geral.');
  assert.deepEqual(campaignDocument.records.map(row => [row.ref.id, row.amountCents, row.receivedCents, row.values.initialPeople]), campaigns.map(row => [row.ref.id, row.amountCents, row.receivedCents, row.values.initialPeople]));
});

test('snapshot é imutável, deduplica IDs e omite vínculos fora do perfil', () => {
  const records = queryRows('agreement', context());
  const copied = structuredClone(records[0]);
  const doc = snapshot([copied, copied]);
  assert.equal(doc.records.length, 1);
  copied.title = 'Alteração posterior';
  copied.values.formalizedAt = null;
  assert.notEqual(doc.records[0].title, copied.title);
  assert.ok(Object.isFrozen(doc.records[0].values) && Object.isFrozen(doc.records[0].links) && Object.isFrozen(doc.context.filters));
  const team = context({}, { profile: 'Equipe', sector: 'Negociação' });
  const scoped = snapshot(queryRows('agreement', team), { context: team });
  assert.ok(scoped.records.every(row => row.links.every(ref => getRow(ref, team) !== null)));
});

test('domínios mistos permitem somente resumo e não somam processos diferentes', () => {
  const records = [queryRows('debt', context())[0], queryRows('payment', context())[0]];
  assert.throws(() => snapshot(records), /somente resumo/);
  const doc = snapshot(records, { mode: 'summary' });
  assert.equal(doc.kinds.length, 2);
  assert.equal(doc.totals.amountCents, 0);
  assert.equal(doc.totals.receivedCents, 0);
  assert.equal(doc.aggregates.byStatus.reduce((total, group) => total + group.count, 0), doc.totals.count);
  const html = buildPrintHtml(doc);
  assert.ok(html.includes('sem soma entre processos'));
  const demands = snapshot(queryRows('demand', context()), { mode: 'summary' });
  assert.ok(buildPrintHtml(demands).includes('Não se aplica'));
});

test('templates documentais preservam campos críticos e separam valores e datas', () => {
  const campaign = snapshot(queryRows('campaign', context()));
  const campaignLinks = campaign.selectedFields.findIndex(column => column.label.includes('Vínculos autorizados'));
  assert.ok(campaignLinks >= 0);
  campaign.rows.forEach((cells, index) => {
    const related = campaign.records[index].links;
    const groups = new Map();
    related.forEach(ref => {
      const group = groups.get(ref.kind) || new Set();
      group.add(ref.id);
      groups.set(ref.kind, group);
    });
    assert.equal(cells[campaignLinks].split('\n').length, Math.max(1, groups.size));
    assert.ok([...groups.values()].every(group => cells[campaignLinks].includes(': ' + group.size.toLocaleString('pt-BR'))));
    assert.ok(!related.some(ref => cells[campaignLinks].includes(ref.id)), 'Campanhas agregam vínculos; não despejam IDs dos participantes.');
    assert.ok(cells[0].includes(campaign.records[index].ref.id), 'O ID da campanha permanece rastreável.');
  });
  const agreement = snapshot(queryRows('agreement', context()));
  assert.ok(agreement.rows.some(row => row.join(' ').includes('Parcelas: vencimento, valor e pagamento')));
  assert.ok(agreement.rows.some(row => row.join(' ').includes('Saldo das parcelas')));
  const activeDebt = snapshot(queryRows('activeDebt', context()));
  assert.ok(activeDebt.rows.some(row => row.join(' ').includes('Termo gerado em') && row.join(' ').includes('Termo enviado em')));
  const protest = snapshot(queryRows('protest', context()));
  assert.ok(protest.rows.some(row => row.join(' ').includes('Cartório') && row.join(' ').includes('Protocolo') && row.join(' ').includes('Resultado do retorno')));
  const payment = snapshot(queryRows('payment', context()));
  assert.ok(payment.selectedFields.some(column => column.label.includes('Valor informado')));
  assert.ok(payment.selectedFields.some(column => column.label.includes('Valor confirmado')));
  const demand = snapshot(queryRows('demand', context()));
  assert.ok(demand.rows.some(row => row.join(' ').includes('Justificativa de espera') && row.join(' ').includes('Motivo do encerramento')));
});

test('documentos rejeitam centavos/data inválidos e escapam conteúdo e atributos HTML', () => {
  const row = queryRows('debt', context())[0];
  for (const amountCents of [NaN, Infinity, 0.1, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => snapshot([{ ...row, amountCents }]), /centavos/);
  assert.throws(() => snapshot([row], { dataBase: 'data inválida' }), /data-base/);
  const doc = snapshot([{ ...row, title: '<img src=x onerror="alert(1)">' }], { title: '<script>alert("x")</script>', scope: 'Recorte <b>inseguro</b>' });
  const html = buildPrintHtml(doc);
  assert.ok(!html.includes('<script>') && !html.includes('<img src='));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('&lt;img src='));
  assert.equal(escapeHtml('"\'&<>'), '&quot;&#39;&amp;&lt;&gt;');
  assert.deepEqual(snapshot([]).records, []);
});

test('navegação preserva links antigos e volta à Visão Geral para âncoras desconhecidas', () => {
  assert.equal(resolveView('service'), 'demands');
  assert.equal(resolveView('exports'), 'reports');
  assert.equal(resolveView('active-debt'), 'active-debt');
  assert.equal(resolveView(''), 'overview');
  assert.equal(resolveView('desconhecido'), 'overview');
});

test('troca de aba limpa os quatro filtros locais e preserva o recorte global', () => {
  const filters = {
    ...defaultContext.filters,
    from: '2025-01-01', exercise: '2025', owner: 'demo-denilson',
    status: 'Em análise', stage: 'Notificação', priority: 'Alta', category: 'Retorno',
  };
  assert.deepEqual(resetViewFilters(filters), {
    ...defaultContext.filters,
    from: '2025-01-01', exercise: '2025', owner: 'demo-denilson',
  });
  assert.equal(filters.status, 'Em análise');
});

test('comparação usa intervalo anterior contíguo e inclusivo, preservando o perfil e demais filtros', () => {
  const context = {
    ...defaultContext,
    search: 'acordo',
    filters: { ...defaultContext.filters, from: '2024-03-01', to: '2024-03-03', personType: 'PJ' },
  };
  const period = comparisonPeriod([], context);
  assert.equal(period.invalidComparison, false);
  assert.deepEqual(period.previousContext, {
    ...context, filters: { ...context.filters, from: '2024-02-27', to: '2024-02-29' },
  });
  assert.equal(context.filters.from, '2024-03-01');
});

test('relatório após a data-base indisponibiliza a comparação sem consultar o período anterior', () => {
  const context = { ...defaultContext, filters: { ...defaultContext.filters, from: '2099-01-01' } };
  const report = reportChoices.find(choice => choice.id === 'recovery');
  const result = getReportData(report, context);
  assert.equal(result.invalidComparison, true);
  assert.deepEqual(result.previousRows, []);
  assert.equal(result.delta, null);
  assert.equal(result.previousContext.filters.from, '');
  assert.equal(result.previousContext.filters.to, '');
});

test('PDF e impressão rejeitam um recorte vazio antes de acessar o navegador', async () => {
  const request = { title: 'Recorte vazio', records: [], context: defaultContext, dataBase: SOURCE_DATE, mode: 'detailed' };
  const empty = /Não há registros nesta seleção/;
  await assert.rejects(documents.downloadPdf(request), empty);
  await assert.rejects(documents.printDocument(request), empty);
});