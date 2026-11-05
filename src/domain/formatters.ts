
// Formatador de valores monetários em reais (BRL)
const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// Formatador de números no padrão brasileiro
const numberFormatter = new Intl.NumberFormat('pt-BR');

// Formatador de datas no fuso horário de São Paulo
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
});

// Formata valores em centavos para reais
export function money(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

// Formata números no padrão brasileiro
export function number(value: number): string {
  return numberFormatter.format(value);
}

// Formata datas, retornando um texto padrão para valores inválidos
export function formatDate(
  iso: string | null | undefined,
): string {
  if (!iso) {
    return 'Não informado';
  }

  const date = new Date(
    iso.length === 10
      ? `${iso}T12:00:00-03:00`
      : iso,
  );

  return Number.isNaN(date.getTime())
    ? 'Não informado'
    : dateFormatter.format(date);
}
