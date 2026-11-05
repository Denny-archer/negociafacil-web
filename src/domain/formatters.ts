const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFormatter = new Intl.NumberFormat('pt-BR');
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
export function money(cents: number): string { return moneyFormatter.format(cents / 100); }
export function number(value: number): string { return numberFormatter.format(value); }
export function formatDate(iso: string | null | undefined): string { if (!iso) return 'Não informado'; const date = new Date(iso.length === 10 ? `${iso}T12:00:00-03:00` : iso); return Number.isNaN(date.getTime()) ? 'Não informado' : dateFormatter.format(date); }
