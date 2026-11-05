import type { EntityKind, EntityRow, QueryContext } from '../../domain';

export type DocumentMode = 'summary' | 'detailed';
export interface DocumentRequest {
  title: string;
  records: EntityRow[];
  context: QueryContext;
  dataBase: string;
  scope?: string;
  search?: string;
  mode: DocumentMode;
}
export interface DocumentColumn {
  readonly label: string;
  readonly width: number;
  readonly numeric?: boolean;
}
export interface RowColumn extends DocumentColumn {
  value: (row: EntityRow) => string;
}
export interface DocumentAggregate {
  readonly kind: EntityKind;
  readonly label: string;
  readonly unit: string;
  readonly count: number;
  readonly amountCents: number;
  readonly receivedCents: number;
}
export interface DocumentSnapshot {
  readonly title: string;
  readonly mode: DocumentMode;
  readonly scope: string;
  readonly search: string;
  readonly generatedAt: string;
  readonly dataBase: string;
  readonly context: Readonly<QueryContext>;
  readonly filterLabels: readonly string[];
  readonly records: readonly Readonly<EntityRow>[];
  readonly selectedFields: readonly DocumentColumn[];
  readonly rows: readonly (readonly string[])[];
  readonly unit: string;
  readonly kinds: readonly EntityKind[];
  readonly totals: Readonly<{ count: number; amountCents: number; receivedCents: number }>;
  readonly aggregates: Readonly<{ byStatus: readonly DocumentAggregate[] }>;
  readonly sourceNotice: string;
  readonly authorizationNotice: string;
}
