import { buildPrintHtml } from './printHtml';
import type { DocumentSnapshot } from './types';

function awaitFrameLoad(frame: HTMLIFrameElement, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      frame.onload = null;
      frame.onerror = null;
      reject(new Error('A visualização de impressão demorou para abrir. Tente novamente.'));
    }, 15000);
    frame.onload = () => {
      window.clearTimeout(timeout);
      frame.onload = null;
      frame.onerror = null;
      resolve();
    };
    frame.onerror = () => {
      window.clearTimeout(timeout);
      frame.onload = null;
      frame.onerror = null;
      reject(new Error('Não foi possível abrir a visualização de impressão.'));
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

async function awaitPrintRender(frameDocument: Document): Promise<void> {
  if (frameDocument.fonts) await frameDocument.fonts.ready;
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 300);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        window.clearTimeout(timeout);
        resolve();
      })
    );
  });
}

/** Abre a impressão do documento completo; cancelar não é tratado como sucesso de impressão. */
export async function printSnapshot(snapshot: DocumentSnapshot): Promise<void> {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const frame = document.createElement('iframe');
  frame.title = `Documento de impressão: ${snapshot.title}`;
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed',
    width: '1123px',
    height: '794px',
    left: '-10000px',
    top: '0',
    border: '0',
    pointerEvents: 'none',
  });
  const restoreFocus = () => {
    if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
  };
  try {
    await awaitFrameLoad(frame, buildPrintHtml(snapshot));
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (!frameWindow || !frameDocument)
      throw new Error('Não foi possível acessar o documento de impressão.');
    await awaitPrintRender(frameDocument);
    await new Promise<void>((resolve, reject) => {
      let finished = false;
      let cleanupTimer: number | undefined;
      let lostFocus = false;
      const media = frameWindow.matchMedia('print');
      let enteredPrint = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
        window.removeEventListener('blur', blur);
        window.removeEventListener('focus', focus);
        frameWindow.removeEventListener('afterprint', cleanup);
        window.removeEventListener('afterprint', cleanup);
        media.removeEventListener('change', mediaChanged);
        frame.remove();
        restoreFocus();
        resolve();
      };
      const blur = () => {
        lostFocus = true;
      };
      const focus = () => {
        if (lostFocus) cleanup();
      };
      const mediaChanged = (event: MediaQueryListEvent) => {
        if (event.matches) enteredPrint = true;
        else if (enteredPrint) cleanup();
      };
      frameWindow.addEventListener('afterprint', cleanup);
      window.addEventListener('afterprint', cleanup);
      media.addEventListener('change', mediaChanged);
      window.addEventListener('blur', blur);
      window.addEventListener('focus', focus);
      try {
        frameWindow.focus();
        frameWindow.print();
        // Preserva o iframe enquanto o diálogo está aberto, inclusive nos
        // navegadores em que print() retorna antes de terminar. afterprint,
        // saída da mídia de impressão ou retorno de foco encerram a operação.
        // Expiração apenas evita manter recursos indefinidamente se o browser
        // não emitir nenhum desses eventos.
        if (!finished) cleanupTimer = window.setTimeout(cleanup, 300000);
      } catch (error) {
        frameWindow.removeEventListener('afterprint', cleanup);
        window.removeEventListener('afterprint', cleanup);
        media.removeEventListener('change', mediaChanged);
        window.removeEventListener('blur', blur);
        window.removeEventListener('focus', focus);
        reject(error);
      }
    });
  } finally {
    frame.remove();
    restoreFocus();
  }
}
