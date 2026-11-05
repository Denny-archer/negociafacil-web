import { useEffect, useRef } from 'react';
import { ArrowLeft, Database, X } from 'lucide-react';
import type { EntityRow, QueryContext } from '../../domain';
import type { OpenEntity } from '../workspace/contracts';
import { EntityDetail } from './EntityDetail';
import { EntityTable } from './EntityTable';
import type { DrilldownList } from './useRecordDialog';

interface Props {
  selected: EntityRow | null;
  list: DrilldownList | null;
  context: QueryContext;
  open: OpenEntity;
  close: () => void;
  back: () => void;
}

export default function RecordDialog({ selected, list, context, open, close, back }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalOpen = !!selected || !!list;
  useEffect(() => {
    if (!modalOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(
      () => dialogRef.current?.querySelector<HTMLElement>('button')?.focus(),
      0
    );
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input,select,a[href],[tabindex="0"]'
      );
      if (!focusables?.length) return;
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keys);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', keys);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [modalOpen, close]);
  useEffect(() => {
    if (modalOpen) dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [selected?.ref.id, modalOpen]);

  if (!modalOpen) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
    >
      <div
        className={`detail-modal ${selected ? 'entity-modal' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={dialogRef}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CONSULTA DEMONSTRATIVA</span>
            <h2 id="dialog-title">{selected ? selected.title : list?.title}</h2>
          </div>
          <button className="icon-button" aria-label="Fechar detalhes" onClick={close}>
            <X size={21} />
          </button>
        </div>
        <div className="modal-body">
          {selected ? (
            <>
              {list && (
                <button className="text-link detail-back" onClick={back}>
                  <ArrowLeft size={13} />
                  Voltar à lista
                </button>
              )}
              <EntityDetail
                key={`${selected.ref.kind}-${selected.ref.id}`}
                row={selected}
                context={list?.context || context}
                onOpen={open}
              />
            </>
          ) : (
            <>
              {list?.definition && (
                <p className="drilldown-note">
                  <Database size={15} />
                  {list.definition}
                </p>
              )}
              <EntityTable
                rows={list?.rows || []}
                title={list?.title || 'Detalhamento'}
                context={list?.context || context}
                onOpen={open}
                scope={list?.definition}
              />
            </>
          )}
        </div>
        <div className="modal-footer">
          <span>
            <Database size={13} />
            Fonte: demonstração local
          </span>
          <button className="button button-secondary" onClick={close}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
