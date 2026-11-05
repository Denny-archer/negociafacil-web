import { useCallback, useEffect, useState } from 'react';
import { getRow, queryRows } from '../../domain';
import type { EntityRef, EntityRow, QueryContext } from '../../domain';

export interface DrilldownList {
  title: string;
  rows: EntityRow[];
  definition?: string;
  context: QueryContext;
}

export function useRecordDialog(context: QueryContext, setNotice: (notice: string) => void) {
  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [list, setList] = useState<DrilldownList | null>(null);

  const close = useCallback(() => {
    setSelected(null);
    setList(null);
  }, []);

  useEffect(close, [context, close]);

  function open(ref: EntityRef) {
    const selectedContext = list?.context || context;
    const authorized = getRow(ref, selectedContext);
    if (!authorized) {
      setNotice('Registro não disponível para este perfil e recorte.');
      return;
    }
    const row =
      ref.kind === 'person'
        ? authorized
        : list?.rows.find((item) => item.ref.kind === ref.kind && item.ref.id === ref.id) ||
          queryRows(ref.kind, selectedContext).find((item) => item.ref.id === ref.id) ||
          authorized;
    setSelected(row);
  }
  function drill(title: string, rows: EntityRow[], definition?: string, queryContext?: QueryContext) {
    setSelected(null);
    setList({ title, rows, definition, context: queryContext || context });
  }

  return { selected, list, close, open, drill, back: () => setSelected(null) };
}
