export type EntityKind =
  | 'person'
  | 'debt'
  | 'collection'
  | 'campaign'
  | 'agreement'
  | 'activeDebt'
  | 'protest'
  | 'payment'
  | 'demand';

export type ViewId =
  | 'overview'
  | 'delinquency'
  | 'collection'
  | 'negotiation'
  | 'active-debt'
  | 'protest'
  | 'payments'
  | 'demands'
  | 'reports'
  | 'settings';

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

export interface DemoSession {
  profile: 'Equipe' | 'Chefia' | 'Gestão';
  admin: boolean;
  userId: string;
  sector: string;
}

export interface DashboardFilters {
  from: string;
  to: string;
  exercise: string;
  personType: string;
  debtType: string;
  status: string;
  stage: string;
  owner: string;
  sector: string;
  campaign: string;
  agreement: string;
  activeDebt: string;
  protest: string;
  amountBand: string;
  ageBand: string;
  priority: string;
  category: string;
  region: string;
}

export interface QueryContext {
  filters: DashboardFilters;
  session: DemoSession;
  search?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

export interface Provenance {
  system: 'Demonstração local';
  sourceId: string;
  entity: string;
  updatedAt: string;
  validation: 'demo' | 'pending';
  rule?: string;
}

export interface EntityRow {
  ref: EntityRef;
  title: string;
  subtitle: string;
  personId: string | null;
  personType: 'PF' | 'PJ' | null;
  exercise: number | null;
  status: string;
  stage: string | null;
  owner: string | null;
  sector: string | null;
  nextAction: string | null;
  deadline: string | null;
  lastMovement: string;
  eventDate: string;
  amountCents: number;
  receivedCents: number;
  priority: string | null;
  category: string | null;
  alerts: string[];
  values: Record<string, string | number | null>;
  links: EntityRef[];
  history: TimelineEvent[];
  statusRaw?: string;
  provenance?: Provenance;
}

export type DataAvailabilityState =
  | 'loading'
  | 'available'
  | 'empty'
  | 'partial'
  | 'error'
  | 'stale'
  | 'unhomologated';

export interface DataAvailabilityInfo {
  state: DataAvailabilityState;
  source: string;
  asOf: string;
  message: string;
  lastSuccess?: string;
}

export interface IndicatorDefinition {
  id: string;
  unit: string;
  calculation: string;
  population: EntityRef[];
  source: string;
  homologation: 'demo' | 'pending';
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  caption: string;
  tone: string;
  rows: EntityRow[];
  unit: string;
  pending?: boolean;
  definition: string;
  definitionInfo?: IndicatorDefinition;
}

export interface CatalogOption {
  value: string;
  label: string;
}

/** Chaves planas de filtros e status_<kind>; sem opções de faixa não homologadas. */
export type Catalogs = Record<string, CatalogOption[]>;

export interface SeriesPoint {
  label: string;
  first: number;
  second: number;
  rate: number;
}

export interface Snapshot {
  rows: Record<EntityKind, EntityRow[]>;
  dataBase: string;
  availability: Record<string, 'demo' | 'pending'>;
  dataAvailability: DataAvailabilityInfo;
}

export interface DashboardRepository {
  getSnapshot(context: QueryContext): Promise<Snapshot>;
  getDetails(ref: EntityRef, context: QueryContext): Promise<EntityRow | null>;
  getHistory(ref: EntityRef, context: QueryContext): Promise<TimelineEvent[]>;
  getCatalogs(context: QueryContext): Promise<Catalogs>;
  getIndicators(view: ViewId, context: QueryContext): Promise<Metric[]>;
}

export type Priority = 'Normal' | 'Alta' | 'Urgente-Crítica';

export interface SourceEntity {
  id: string;
  status: string;
  statusRaw: string;
  provenance: Provenance;
  history: TimelineEvent[];
}

export interface OperationalFields {
  ownerId: string | null;
  ownerName: string | null;
  sector: string;
  nextAction: string | null;
  deadline: string | null;
  deadlineSource: string | null;
  lastMovement: string;
  priority: Priority;
}

export interface Person extends SourceEntity {
  name: string;
  personType: 'PF' | 'PJ';
  category: string;
  region: string;
  registrations: {
    id: string;
    number: string;
    category: string;
  }[];
  createdAt: string;
}

export interface Debt extends SourceEntity, OperationalFields {
  personId: string;
  registrationId: string;
  exercise: number;
  debtType: string;
  originalAmountCents: number;
  openAmountCents: number;
  dueDate: string;
  stage: string;
  agreementIds: string[];
  activeDebtIds: string[];
  protestIds: string[];
}

export interface Collection extends SourceEntity, OperationalFields {
  personId: string;
  debtIds: string[];
  campaignId: string | null;
  stage: string;
  noticeSentAt: string | null;
  noticeDeadline: string | null;
  suspendedReason: string | null;
}

export interface Campaign extends SourceEntity, OperationalFields {
  name: string;
  startedAt: string;
  endedAt: string | null;
  description: string;
}

export interface Participation {
  id: string;
  campaignId: string;
  personId: string;
  collectionId: string;
  debtIds: string[];
  initialAmountCents: number;
  contacted: boolean;
  agreementIds: string[];
  paymentIds: string[];
}

export interface Agreement extends SourceEntity, OperationalFields {
  personId: string;
  debtIds: string[];
  formalizedAt: string | null;
  negotiatedAmountCents: number;
  previousAgreementId: string | null;
  renegotiationCount: number;
}

export interface Installment {
  id: string;
  agreementId: string;
  number: number;
  dueDate: string;
  amountCents: number;
  paidCents: number;
  paymentIds: string[];
}

export interface ActiveDebt extends SourceEntity, OperationalFields {
  personId: string;
  debtIds: string[];
  eligibleAmountCents: number;
  inscriptionBatchId: string | null;
  documentIds: string[];
  notifiedAt: string | null;
  subsequentMeasures: string[];
  impediment: string | null;
}

export interface TermCda extends SourceEntity {
  activeDebtId: string;
  type: 'Termo' | 'CDA';
  number: string;
  generatedAt: string;
  sentAt: string | null;
  updatedAt: string | null;
  cancelledAt: string | null;
  evidence: string;
}

export interface ProtestTitle extends SourceEntity, OperationalFields {
  personId: string;
  debtIds: string[];
  activeDebtId: string;
  titleNumber: string;
  amountCents: number;
  remittanceStatus: string;
  returnStatus: string | null;
  cartorio: string | null;
  protocol: string | null;
  remittanceDate: string | null;
  confirmationDate: string | null;
  movementCode: string | null;
  movementDescription: string | null;
  movementDate: string | null;
  returnDate: string | null;
  returnReason: string | null;
  cartorialDeadline: string | null;
  cartorialDeadlineSource: string | null;
  financialRegularized: boolean;
  cartorialRegularized: boolean;
  consentIssuedAt: string | null;
  consentSentAt: string | null;
}

export interface Payment extends SourceEntity, OperationalFields {
  personId: string;
  debtId: string | null;
  agreementId: string | null;
  installmentId: string | null;
  activeDebtId: string | null;
  protestId: string | null;
  amountCents: number;
  recognizedCents: number;
  occurredAt: string;
  recognizedAt: string | null;
  settlementAt: string | null;
  postingAt: string | null;
  method: string;
  financialStatus: string;
  postingStatus: string;
  exception: string | null;
  attributionReliable: boolean;
  strategy: string | null;
}

export interface Demand extends SourceEntity, OperationalFields {
  personId: string;
  subject: string;
  description: string;
  category: string;
  actionPerformed: string | null;
  result: string | null;
  links: EntityRef[];
  closedAt: string | null;
  closureReason: string | null;
  waitReason: string | null;
  evidence: string | null;
}

export interface DomainData {
  people: Person[];
  debts: Debt[];
  collections: Collection[];
  campaigns: Campaign[];
  participations: Participation[];
  agreements: Agreement[];
  installments: Installment[];
  activeDebts: ActiveDebt[];
  documents: TermCda[];
  protests: ProtestTitle[];
  payments: Payment[];
  demands: Demand[];
}
