
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  Download,
  LoaderCircle,
  Printer,
} from 'lucide-react';

import {
  defaultContext,
  filterRows,
  SOURCE_DATE,
} from '../domain';

import type {
  EntityRow,
  QueryContext,
} from '../domain';

import {
  downloadPdf,
  printDocument,
} from '../documents';

import type { DocumentMode } from '../documents';

import './document-actions.css';

// Contexto utilizado pelas ações de documentos
export const DocumentContext = createContext<{
  context: QueryContext;
  dataBase: string;
}>({
  context: defaultContext,
  dataBase: SOURCE_DATE,
});

// Propriedades do componente
export interface DocumentActionsProps {
  records: EntityRow[];
  title: string;
  scope?: string;
  search?: string;
  mode?: DocumentMode;
  context?: QueryContext;
  className?: string;
}

type DocumentAction = 'print' | 'pdf';

export function DocumentActions({
  records,
  title,
  scope,
  search,
  mode = 'detailed',
  context: contextOverride,
  className = '',
}: DocumentActionsProps) {
  // Contexto e filtros
  const inherited = useContext(DocumentContext);

  const context = contextOverride || inherited.context;

  const effectiveContext = useMemo<QueryContext>(
    () => ({
      ...context,
      search:
        search === undefined
          ? context.search
          : search.trim(),
    }),
    [context, search],
  );

  const selected = useMemo(
    () => filterRows(records, effectiveContext),
    [records, effectiveContext],
  );

  // Validação da seleção
  const mixedDetailed =
    mode === 'detailed' &&
    new Set(selected.map((row) => row.ref.kind)).size > 1;

  const disabledReason = mixedDetailed
    ? 'Escolha um relatório específico ou um resumo gerencial para seleções de domínios diferentes.'
    : !selected.length
      ? 'Não há registros autorizados neste recorte.'
      : '';

  // Estados e controle de execução
  const [busy, setBusy] = useState<DocumentAction | null>(null);
  const [error, setError] = useState('');

  const inProgress = useRef(false);

  // Execução das ações de impressão e PDF
  async function run(action: DocumentAction) {
    if (inProgress.current || disabledReason) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    inProgress.current = true;

    setBusy(action);
    setError('');

    try {
      const request = {
        records: selected,
        title,
        scope,
        search,
        mode,
        context: effectiveContext,
        dataBase: inherited.dataBase,
      };

      if (action === 'pdf') {
        await downloadPdf(request);
      } else {
        await printDocument(request);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível preparar o documento. Tente novamente.',
      );
    } finally {
      inProgress.current = false;
      setBusy(null);

      if (action === 'print') {
        window.requestAnimationFrame(() => {
          if (previouslyFocused?.isConnected) {
            previouslyFocused.focus({ preventScroll: true });
          }
        });
      }
    }
  }

  // Estados visuais dos botões
  const isBusy = busy !== null;
  const isDisabled = isBusy || !!disabledReason;

  const isPrinting = busy === 'print';
  const isGeneratingPdf = busy === 'pdf';

  const screenReaderMessage = isPrinting
    ? 'Preparando o documento para abrir a janela de impressão.'
    : isGeneratingPdf
      ? 'Gerando o arquivo PDF da seleção completa.'
      : disabledReason;

  return (
    <div
      className={`doc-actions ${className}`}
      aria-busy={isBusy}
    >
      <div className="doc-actions-buttons">
        {/* Botão de impressão */}
        <button
          type="button"
          className="doc-actions-button"
          onClick={() => void run('print')}
          disabled={isDisabled}
          title={
            disabledReason ||
            'Imprimir o documento da seleção autorizada completa'
          }
        >
          <span>
            {isPrinting ? (
              <LoaderCircle
                className="doc-actions-spinner"
                size={15}
              />
            ) : (
              <Printer size={15} />
            )}
          </span>

          {isPrinting ? 'Preparando...' : 'Imprimir'}
        </button>

        {/* Botão de download PDF */}
        <button
          type="button"
          className="doc-actions-button"
          onClick={() => void run('pdf')}
          disabled={isDisabled}
          title={
            disabledReason ||
            'Baixar PDF documental da seleção autorizada completa'
          }
        >
          <span>
            {isGeneratingPdf ? (
              <LoaderCircle
                className="doc-actions-spinner"
                size={15}
              />
            ) : (
              <Download size={15} />
            )}
          </span>

          {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
      </div>

      {/* Mensagem de acessibilidade */}
      <span
        className="doc-actions-screen-reader"
        aria-live="polite"
      >
        {screenReaderMessage}
      </span>

      {/* Exibição de erros */}
      {error && (
        <p className="doc-actions-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
