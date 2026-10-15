export type SaleUnit = 'kg' | 'sack';
export type SaleLineInput = { unit: SaleUnit; quantity: number; sackWeightKg: number; pricePerKg: number; pricePerSack?: number | null };
export function calculateSaleLine(input: SaleLineInput) {
  const { unit, quantity, sackWeightKg, pricePerKg, pricePerSack } = input;
  if (![quantity, sackWeightKg, pricePerKg].every(Number.isFinite) || quantity <= 0 || sackWeightKg <= 0 || pricePerKg < 0) throw new Error('Enter a valid positive quantity, sack weight, and non-negative price.');
  const quantityKg = unit === 'sack' ? quantity * sackWeightKg : quantity;
  const effectiveUnitPrice = unit === 'sack' && pricePerSack != null ? pricePerSack : pricePerKg * (unit === 'sack' ? sackWeightKg : 1);
  const total = Math.round((quantity * effectiveUnitPrice + Number.EPSILON) * 100) / 100;
  return { quantityKg: Math.round(quantityKg * 1000) / 1000, effectiveUnitPrice, total };
}
export function formatPHP(amount: number) { return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(amount); }
export function sacksAndRemainder(stockKg: number, sackWeightKg: number) { const sacks = Math.floor(stockKg / sackWeightKg); const remainderKg = Math.round((stockKg - sacks * sackWeightKg) * 1000) / 1000; return { sacks, remainderKg }; }
