/**
 * Formatea un número como moneda en Soles Peruanos (PEN)
 */
export const formatCurrency = (amount: number): string => {
  return `S/ ${amount.toFixed(2)}`;
};

/**
 * Formatea un número como moneda en Soles Peruanos sin decimales
 */
export const formatCurrencyInt = (amount: number): string => {
  return `S/ ${Math.round(amount)}`;
};
