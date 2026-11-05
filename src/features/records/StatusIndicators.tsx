import { normalize } from './formatting';

export function tone(status: string) {
  const label = normalize(status);
  if (
    /quitado|regularizado|encerrado|concluido|resolvido|pago|confirmado/.test(label) &&
    !/nao|aguardando/.test(label)
  )
    return 'green';
  if (/vencid|atraso|divergencia|critica|nao localizada|nao paga|inadimplente/.test(label))
    return 'pink';
  if (/suspens|cancelad|devolvid/.test(label)) return 'orange';
  if (/aguardando|prazo|preparacao|analise/.test(label)) return 'purple';
  return 'blue';
}
export function Chip({ label }: { label: string }) {
  return (
    <span className={`ws-chip ws-chip-${tone(label)}`}>
      <i />
      {label}
    </span>
  );
}
export function Alerts({ alerts }: { alerts: string[] }) {
  return (
    <span className="ws-alerts">
      {alerts.map((alert) => (
        <span key={alert} className={`ws-alert ws-alert-${tone(alert)}`}>
          {alert}
        </span>
      ))}
    </span>
  );
}
