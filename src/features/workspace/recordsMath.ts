import type { EntityRow } from '../../domain';

export function total(rows: EntityRow[], key: 'amountCents' | 'receivedCents' = 'amountCents') {
  return rows.reduce((sum, row) => sum + row[key], 0);
}
export function closed(row: EntityRow) {
  return !!row.values.closedAt;
}
