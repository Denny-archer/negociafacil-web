import type { EntityRef, EntityRow, QueryContext, ViewId } from '../../domain';

export type OpenEntity = (ref: EntityRef) => void;
export type Drill = (
  title: string,
  rows: EntityRow[],
  definition?: string,
  queryContext?: QueryContext
) => void;
export type Navigate = (view: ViewId) => void;

export interface RecordsViewProps {
  rows: EntityRow[];
  context: QueryContext;
  onOpen: OpenEntity;
}
