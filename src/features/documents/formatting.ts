import { money, number } from '../../domain';

export const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});
const dateOnly = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
export function checkedCents(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new Error(
      'Há um valor inválido em centavos na seleção. Revise os dados antes de gerar o documento.'
    );
  return value;
}
export function sumCents(first: number, second: number): number {
  return checkedCents(first + checkedCents(second));
}
export function amount(value: number): string {
  return money(checkedCents(value)).replace(/\u00a0|\u202f/g, ' ');
}
export function text(value: string): string {
  return value.normalize('NFC');
}
export function displayDate(value: string | null): string {
  if (!value) return 'Não informado';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? text(value) : dateOnly.format(parsed);
}

export { number as integer };
